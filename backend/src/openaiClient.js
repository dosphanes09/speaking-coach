const fs = require("node:fs/promises");
const { config } = require("./config");
const { HttpError } = require("./errors");
const { logInfo, logWarn } = require("./logger");
const { analysisJsonSchema } = require("./analysisSchema");
const {
  ENGLISH_AUDIO_OBSERVATION_SYSTEM_INSTRUCTION,
  buildEnglishAudioObservationPrompt,
  buildSpeakingAnalysisPrompt,
  buildChatSystemPrompt
} = require("./prompt");
const {
  lessonCoreJsonSchema,
  lessonPracticeJsonSchema,
  lessonAnglesJsonSchema,
  learnerProfileJsonSchema
} = require("./lessonSchema");
const {
  LESSON_SYSTEM_INSTRUCTION,
  PROFILE_SYSTEM_INSTRUCTION,
  buildLessonAnglesPrompt,
  buildLessonCorePrompt,
  buildLessonPracticePrompt,
  buildProfileUpdatePrompt
} = require("./lessonPrompt");
const {
  validateLessonCore,
  validateLessonPractice,
  normalizeLessonCore,
  normalizeLessonPractice,
  normalizeLearnerProfileFromModel
} = require("./lessonValidation");
const { toLessonLevel } = require("./validation");
const { calibrateAnalysisScores } = require("./scoringCalibrator");
const { convertToWav, readAsBase64, deleteQuietly } = require("./audioConversion");
const { rhetoricJsonSchema } = require("./rhetoricSchema");
const {
  RHETORIC_SYSTEM_INSTRUCTION,
  AUDIO_OBSERVATION_SYSTEM_INSTRUCTION,
  buildAudioObservationPrompt,
  buildRhetoricAnalysisPrompt
} = require("./rhetoricPrompt");

function retryableStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function fetchWithTimeoutAndRetry(url, optionsFactory, overrides = {}) {
  // Retrying a request that already ran for two and a half minutes usually just
  // burns the caller's remaining patience (and, behind a proxy, exceeds its
  // limit), so slow callers can ask for a single attempt.
  const maxAttempts = overrides.maxAttempts || config.openAiMaxRetries + 1;
  // Lesson generation legitimately takes minutes, so the caller can widen the per-attempt
  // timeout instead of every feature sharing the analysis timeout.
  const timeoutMs = overrides.timeoutMs || config.openAiTimeoutMs;
  // Names the feature in user-facing errors, so a lesson failure does not tell the learner
  // that "speech analysis" is unavailable.
  const serviceLabel = overrides.serviceLabel || "Speech analysis service";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...optionsFactory(),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        return response;
      }

      if (attempt < maxAttempts && retryableStatus(response.status)) {
        continue;
      }

      // The body is where the real reason lives ("model not found", "unsupported
      // parameter", quota problems). Throwing it away turned every upstream
      // failure into an unexplainable one, which is exactly what happened when
      // audio analysis silently started falling back to transcript-only.
      const upstream = await readUpstreamError(response);
      logWarn("openai_request_rejected", {
        status: response.status,
        code: upstream.code || "openai_request_failed",
        path: url,
        detail: upstream.message
      });

      const failure = new HttpError(502, "openai_request_failed", `${serviceLabel} is unavailable.`);
      failure.upstreamStatus = response.status;
      failure.upstreamCode = upstream.code;
      failure.upstreamMessage = upstream.message;
      throw failure;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof HttpError) {
        throw error;
      }

      if (attempt < maxAttempts) {
        continue;
      }

      throw new HttpError(504, "openai_timeout", `${serviceLabel} timed out.`);
    }
  }

  throw new HttpError(502, "openai_request_failed", `${serviceLabel} is unavailable.`);
}

/**
 * Pulls a short, log-safe reason out of an OpenAI error response. Only the
 * error object is read — never anything that could echo the user's recording.
 */
async function readUpstreamError(response) {
  try {
    const text = await response.text();
    if (!text) {
      return { code: "", message: "" };
    }

    try {
      const json = JSON.parse(text);
      const error = json?.error || {};
      return {
        code: String(error.code || error.type || ""),
        message: String(error.message || "").slice(0, 400)
      };
    } catch {
      return { code: "", message: text.slice(0, 400) };
    }
  } catch {
    return { code: "", message: "" };
  }
}

function authHeaders(extra = {}) {
  if (!config.openAiApiKey) {
    throw new HttpError(
      503,
      "openai_not_configured",
      "Backend reached, but speech analysis is not configured on the backend. Add OPENAI_API_KEY to backend/.env and restart the backend."
    );
  }

  return {
    ...extra,
    Authorization: `Bearer ${config.openAiApiKey}`
  };
}

/**
 * `language` is an ISO-639-1 code and it matters more than it looks: telling the
 * transcriber the wrong language does not produce a slightly worse result, it
 * produces confident nonsense (Turkish audio read as if it were English). It
 * used to be hard-coded to "en", which was fine while the app only taught
 * English; the Turkish rhetoric module passes "tr".
 */
async function transcribeFile(filePath, mimeType, originalName, language = "en", overrides = {}) {
  const buffer = await fs.readFile(filePath);

  const response = await fetchWithTimeoutAndRetry("https://api.openai.com/v1/audio/transcriptions", () => {
    const formData = new FormData();
    formData.append("model", config.openAiTranscriptionModel);
    formData.append("language", language);
    formData.append("file", new Blob([buffer], { type: mimeType }), originalName);

    return {
      method: "POST",
      headers: authHeaders(),
      body: formData
    };
  }, overrides);

  const json = await response.json();
  return String(json.text || "").trim();
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  const output = Array.isArray(responseJson.output) ? responseJson.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string") {
        return part.text;
      }
    }
  }

  throw new HttpError(502, "invalid_openai_response", "Speech analysis service returned an invalid response.");
}

const SYSTEM_INSTRUCTION =
  "You are a supportive but honest English speaking teacher. Return only valid JSON that matches the schema.";

/**
 * One structured-output call. Everything that differs between the English
 * analysis and the Turkish rhetoric analysis — system prompt, schema, token
 * budget — is passed in, so both share the same retry, timeout and parsing.
 */
async function requestStructuredOutput({
  model,
  systemInstruction,
  schemaName,
  schema,
  userContent,
  maxOutputTokens,
  overrides = {}
}) {
  const response = await fetchWithTimeoutAndRetry("https://api.openai.com/v1/responses", () => ({
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemInstruction }]
        },
        {
          role: "user",
          content: userContent
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema
        }
      },
      max_output_tokens: maxOutputTokens
    })
  }), overrides);

  const json = await response.json();

  // Logged because this is the only place the real cost of a request is
  // visible. Audio input is billed differently from text and a five minute
  // recording is not cheap, so having the counts in the logs is what makes it
  // possible to answer "what does one session cost" without guessing.
  logInfo("openai_usage", {
    status: 200,
    code: schemaName,
    path: model,
    tokens: {
      input: json?.usage?.input_tokens ?? 0,
      output: json?.usage?.output_tokens ?? 0,
      audioInput: json?.usage?.input_tokens_details?.audio_tokens ?? 0
    }
  });

  return JSON.parse(extractOutputText(json));
}

async function requestAnalysisFromModel(model, userContent) {
  return requestStructuredOutput({
    model,
    systemInstruction: SYSTEM_INSTRUCTION,
    schemaName: "speaking_analysis",
    schema: analysisJsonSchema,
    userContent,
    maxOutputTokens: config.openAiMaxOutputTokens
  });
}

async function requestRhetoricFromModel(model, userContent) {
  return requestStructuredOutput({
    model,
    systemInstruction: RHETORIC_SYSTEM_INSTRUCTION,
    schemaName: "rhetoric_analysis",
    schema: rhetoricJsonSchema,
    userContent,
    maxOutputTokens: config.openAiRhetoricMaxOutputTokens,
    overrides: {
      timeoutMs: config.openAiRhetoricTimeoutMs,
      maxAttempts: 1,
      serviceLabel: "Hitabet analizi"
    }
  });
}

async function analyzeTranscriptFromText(topic, transcript, level, durationSeconds, analysisContext, expectedDurationSeconds) {
  const prompt = buildSpeakingAnalysisPrompt(topic, transcript, level, durationSeconds, analysisContext, {
    expectedDurationSeconds
  });

  return requestAnalysisFromModel(config.openAiAnalysisModel, [{ type: "input_text", text: prompt }]);
}

/**
 * English analysis, grounded in the recording.
 *
 * This used to send the audio straight to the analysis model and ask for JSON
 * back. That combination is impossible with the audio model — it refuses audio
 * on the Responses API and refuses `response_format` on Chat Completions — so
 * the call failed on every single analysis and silently fell back to
 * transcript-only. The pronunciation scoring in `scoringCalibrator.js` was
 * written for audio-grounded input and had therefore never once been used.
 *
 * Now the recording is listened to first, and the report from that listening is
 * what the analysis model reasons over.
 */
async function analyzeTranscriptFromAudio(
  topic,
  transcript,
  level,
  durationSeconds,
  analysisContext,
  expectedDurationSeconds,
  audioFilePath,
  audioMimeType
) {
  const audioObservation = await describeRecordingFromAudio({
    audioFilePath,
    audioMimeType,
    durationSeconds,
    systemInstruction: ENGLISH_AUDIO_OBSERVATION_SYSTEM_INSTRUCTION,
    prompt: buildEnglishAudioObservationPrompt({ durationSeconds }),
    label: "english_audio_observation"
  });

  if (!audioObservation) {
    throw new HttpError(502, "empty_audio_observation", "Listening step returned nothing.");
  }

  const prompt = buildSpeakingAnalysisPrompt(topic, transcript, level, durationSeconds, analysisContext, {
    expectedDurationSeconds,
    audioObservation
  });

  return requestAnalysisFromModel(config.openAiAnalysisModel, [{ type: "input_text", text: prompt }]);
}

/**
 * Turkish rhetoric analysis.
 *
 * Mirrors the English path's shape — try the audio-capable model first, fall
 * back to transcript-only if anything about the audio attempt fails — but the
 * stakes of that fallback are higher here. Half of what this feature measures
 * (hesitation sounds, pause length, monotony) is inaudible in a transcript, so
 * the result records which source it came from and the app tells the user.
 */
/**
 * Step 1 of audio analysis: the model listens and writes down what it heard.
 *
 * Two constraints forced this shape, both confirmed against the live API by
 * `scripts/audioAnalysisDiagnostic.js`:
 *
 *   - the audio model rejects audio input on /v1/responses
 *     ("Audio input is not available"), so the call goes to Chat Completions;
 *   - the audio model rejects `response_format` entirely, in both strict and
 *     loose form, so it cannot produce JSON at all.
 *
 * Hence a plain-text report here, and a separate text model turning it into
 * the schema afterwards. That split is not a compromise: perception and
 * judgement are different jobs, and only the first one needs ears.
 *
 * Returns the report, or "" when the audio could not be used at all.
 */
async function describeRecordingFromAudio({
  audioFilePath,
  audioMimeType,
  durationSeconds,
  systemInstruction,
  prompt,
  label = "audio_observation"
}) {
  // The app already uploads mono 16kHz WAV, so this conversion is normally a
  // no-op; it stays for recordings that arrive in another container.
  const alreadyWav = audioMimeType === "audio/wav" || audioMimeType === "audio/x-wav";
  let convertedPath;

  try {
    const wavPath = alreadyWav ? audioFilePath : await convertToWav(audioFilePath);
    convertedPath = alreadyWav ? undefined : wavPath;
    const base64Audio = await readAsBase64(wavPath);

    const response = await fetchWithTimeoutAndRetry(
      "https://api.openai.com/v1/chat/completions",
      () => ({
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          model: config.openAiAudioAnalysisModel,
          modalities: ["text"],
          messages: [
            { role: "system", content: systemInstruction },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "input_audio", input_audio: { data: base64Audio, format: "wav" } }
              ]
            }
          ],
          max_completion_tokens: config.openAiAudioObservationMaxTokens
        })
      }),
      {
        timeoutMs: config.openAiRhetoricTimeoutMs,
        maxAttempts: 1,
        serviceLabel: "Ses dinleme"
      }
    );

    const json = await response.json();
    logInfo("openai_usage", {
      status: 200,
      code: label,
      path: config.openAiAudioAnalysisModel,
      tokens: {
        input: json?.usage?.prompt_tokens ?? 0,
        output: json?.usage?.completion_tokens ?? 0,
        audioInput: json?.usage?.prompt_tokens_details?.audio_tokens ?? 0
      }
    });

    return String(json?.choices?.[0]?.message?.content || "").trim();
  } finally {
    await deleteQuietly(convertedPath);
  }
}

async function analyzeRhetoric({
  topic,
  transcript,
  durationSeconds,
  targetDurationSeconds,
  preparationNotes = "",
  mode = "prepared",
  topicDefinition = "",
  topicKeyPoints = [],
  audioFilePath,
  audioMimeType
}) {
  const canUseAudio = config.enableAudioAnalysis && Boolean(audioFilePath);
  let parsed;
  let generatedFromAudio = false;
  let audioAttemptFailed = false;

  if (canUseAudio) {
    try {
      const audioObservation = await describeRecordingFromAudio({
        audioFilePath,
        audioMimeType,
        durationSeconds,
        systemInstruction: AUDIO_OBSERVATION_SYSTEM_INSTRUCTION,
        prompt: buildAudioObservationPrompt({ durationSeconds }),
        label: "rhetoric_audio_observation"
      });

      if (!audioObservation) {
        throw new HttpError(502, "empty_audio_observation", "Ses dinleme boş sonuç döndürdü.");
      }

      parsed = await requestRhetoricFromModel(
        config.openAiAnalysisModel,
        buildRhetoricAnalysisPrompt({
          topic,
          transcript,
          durationSeconds,
          targetDurationSeconds,
          preparationNotes,
          mode,
          topicDefinition,
          topicKeyPoints,
          audioObservation
        })
      );
      generatedFromAudio = true;
    } catch (error) {
      audioAttemptFailed = true;
      logWarn("rhetoric_audio_analysis_failed_falling_back_to_text", {
        status: error?.upstreamStatus,
        code: error?.upstreamCode || error?.code || "audio_analysis_error",
        path: config.openAiAudioAnalysisModel,
        detail: error?.upstreamMessage || String(error?.message || "")
      });
    }
  }

  if (!parsed) {
    parsed = await requestRhetoricFromModel(
      config.openAiAnalysisModel,
      buildRhetoricAnalysisPrompt({
        topic,
        transcript,
        durationSeconds,
        targetDurationSeconds,
        preparationNotes,
        mode,
        topicDefinition,
        topicKeyPoints,
        audioObservation: ""
      })
    );
  }

  return {
    ...parsed,
    // Recomputed here rather than trusted from the model: these two are simple
    // arithmetic the app already knows, and a model that guesses them wrong
    // makes the whole metrics block look unreliable.
    timeManagement: {
      ...parsed.timeManagement,
      targetSeconds: targetDurationSeconds,
      actualSeconds: durationSeconds
    },
    analysisSource: generatedFromAudio ? "audio" : "transcript",
    audioAnalysisFallback: audioAttemptFailed
  };
}

async function analyzeTranscript(topic, transcript, level, durationSeconds, analysisContext = null, options = {}) {
  const expectedDurationSeconds = options.expectedDurationSeconds || durationSeconds;
  const canUseAudio = config.enableAudioAnalysis && Boolean(options.audioFilePath);

  let parsed;
  let generatedFromAudio = false;
  let audioAttemptFailed = false;

  if (canUseAudio) {
    try {
      parsed = await analyzeTranscriptFromAudio(
        topic,
        transcript,
        level,
        durationSeconds,
        analysisContext,
        expectedDurationSeconds,
        options.audioFilePath,
        options.audioMimeType
      );
      generatedFromAudio = true;
    } catch (error) {
      // Audio-based analysis is a newer path with real external dependencies (ffmpeg,
      // an audio-capable model). If anything about it fails, fall back to the
      // proven transcript-only path instead of failing the whole request.
      audioAttemptFailed = true;
      logWarn("audio_analysis_failed_falling_back_to_text", {
        status: error?.upstreamStatus,
        code: error?.upstreamCode || error?.code || "audio_analysis_error",
        path: config.openAiAudioAnalysisModel,
        detail: error?.upstreamMessage || String(error?.message || "")
      });
    }
  }

  if (!parsed) {
    parsed = await analyzeTranscriptFromText(topic, transcript, level, durationSeconds, analysisContext, expectedDurationSeconds);
  }

  // Prefer the model's own audio-grounded transcript (when available) as the basis for the
  // deterministic, length-based scoring guardrails, since audio is now the source of truth.
  const transcriptForCalibration =
    generatedFromAudio && parsed.originalTranscript ? parsed.originalTranscript : transcript;

  const calibrated = calibrateAnalysisScores(parsed, {
    transcript: transcriptForCalibration,
    durationSeconds,
    expectedDurationSeconds,
    pronunciationIsAudioGrounded: generatedFromAudio
  });

  return {
    ...calibrated,
    generatedBy: "backend",
    createdAt: new Date().toISOString(),
    // Explicit, always-present signal of which analysis path actually produced this result,
    // so the app can show it unconditionally (not only on failure, which audioAnalysisFallback
    // already covers) instead of the user having to infer it from a sentence buried in the
    // pronunciation notes text.
    analysisSource: generatedFromAudio ? "audio" : "transcript",
    audioAnalysisFallback: audioAttemptFailed
  };
}

async function chatWithCoach(messages, level) {
  const response = await fetchWithTimeoutAndRetry("https://api.openai.com/v1/responses", () => ({
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model: config.openAiChatModel,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: buildChatSystemPrompt(level) }]
        },
        ...messages.map((message) => ({
          role: message.role,
          content: [{ type: "input_text", text: message.text }]
        }))
      ],
      max_output_tokens: config.openAiChatMaxOutputTokens
    })
  }));

  const json = await response.json();
  return extractOutputText(json).trim();
}

async function requestStructuredJson({
  model,
  systemText,
  userText,
  schemaName,
  schema,
  maxOutputTokens,
  timeoutMs,
  temperature,
  serviceLabel
}) {
  const response = await fetchWithTimeoutAndRetry(
    "https://api.openai.com/v1/responses",
    () => ({
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemText }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userText }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema
          }
        },
        max_output_tokens: maxOutputTokens,
        ...(Number.isFinite(temperature) ? { temperature } : {})
      })
    }),
    { timeoutMs, serviceLabel }
  );

  const json = await response.json();
  const outputText = extractOutputText(json);

  try {
    return JSON.parse(outputText);
  } catch {
    // Nearly always a response that hit max_output_tokens mid-JSON.
    throw new HttpError(502, "invalid_lesson_json", "The lesson service returned an unreadable response.");
  }
}

/**
 * Generates one part of a lesson, verifies it, and — if the verification found blocking
 * problems — regenerates ONCE with those problems fed back into the prompt. If the second
 * attempt still has issues, the better of the two is returned with the remaining problems
 * surfaced as warnings: a lesson with a flaw the app can mention beats no lesson at all.
 */
async function generateVerifiedLessonPart({ buildPrompt, schemaName, schema, verify, logLabel }) {
  let issues = [];
  let best = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const raw = await requestStructuredJson({
      model: config.openAiLessonModel,
      systemText: LESSON_SYSTEM_INSTRUCTION,
      userText: buildPrompt(issues),
      schemaName,
      schema,
      maxOutputTokens: config.openAiLessonMaxOutputTokens,
      timeoutMs: config.openAiLessonTimeoutMs,
      temperature: config.openAiLessonTemperature,
      serviceLabel: "Lesson service"
    });

    const result = verify(raw);
    if (!best || result.issues.length < best.result.issues.length) {
      best = { raw, result };
    }

    if (result.issues.length === 0) {
      break;
    }

    issues = result.issues;
    logWarn("lesson_part_rejected", {
      status: 422,
      code: "lesson_verification_failed",
      path: `${logLabel}:attempt-${attempt}`
    });
  }

  return best;
}

/**
 * Offers the learner four narrow angles inside whatever they mentioned, before any lesson is
 * written. This is a small, fast call on purpose: it exists so the expensive call that follows
 * is aimed at what the learner actually wanted to read about.
 */
async function generateLessonAngles({ profile, todayContext, recentTopics }) {
  const lessonProfile = { ...profile, lessonLevel: toLessonLevel(profile.level) };

  const raw = await requestStructuredJson({
    model: config.openAiLessonModel,
    systemText: LESSON_SYSTEM_INSTRUCTION,
    userText: buildLessonAnglesPrompt({ profile: lessonProfile, todayContext, recentTopics }),
    schemaName: "daily_lesson_angles",
    schema: lessonAnglesJsonSchema,
    maxOutputTokens: 1200,
    timeoutMs: config.openAiTimeoutMs,
    temperature: config.openAiLessonTemperature,
    serviceLabel: "Lesson service"
  });

  const angles = (Array.isArray(raw?.angles) ? raw.angles : [])
    .map((angle) => ({
      title: String(angle?.title || "").trim(),
      description: String(angle?.description || "").trim()
    }))
    .filter((angle) => angle.title)
    .slice(0, 6);

  if (angles.length === 0) {
    throw new HttpError(502, "empty_lesson_angles", "No lesson directions could be suggested.");
  }

  return { angles };
}

async function generateLessonCore({ profile, recentTopics, todayContext, chosenAngle }) {
  const lessonProfile = { ...profile, lessonLevel: toLessonLevel(profile.level) };

  const best = await generateVerifiedLessonPart({
    logLabel: "core",
    schemaName: "daily_lesson_core",
    schema: lessonCoreJsonSchema,
    buildPrompt: (issues) =>
      buildLessonCorePrompt({ profile: lessonProfile, recentTopics, todayContext, chosenAngle, issues }),
    verify: (raw) => validateLessonCore(raw, { lessonLevel: lessonProfile.lessonLevel, recentTopics })
  });

  return {
    lesson: normalizeLessonCore(best.raw),
    warnings: [...best.result.issues, ...best.result.warnings]
  };
}

async function generateLessonPractice({ profile, core }) {
  const lessonProfile = { ...profile, lessonLevel: toLessonLevel(profile.level) };

  const best = await generateVerifiedLessonPart({
    logLabel: "practice",
    schemaName: "daily_lesson_practice",
    schema: lessonPracticeJsonSchema,
    buildPrompt: (issues) => buildLessonPracticePrompt({ profile: lessonProfile, core, issues }),
    verify: (raw) => validateLessonPractice(raw, core)
  });

  return {
    practice: normalizeLessonPractice(best.raw),
    warnings: [...best.result.issues, ...best.result.warnings]
  };
}

async function updateLearnerProfile({ profile, sessionSummary, topicSlug }) {
  const raw = await requestStructuredJson({
    model: config.openAiLessonModel,
    systemText: PROFILE_SYSTEM_INSTRUCTION,
    userText: buildProfileUpdatePrompt({ profile, sessionSummary, topicSlug }),
    schemaName: "learner_profile",
    schema: learnerProfileJsonSchema,
    maxOutputTokens: 1200,
    timeoutMs: config.openAiTimeoutMs,
    temperature: config.openAiLessonTemperature,
    serviceLabel: "Learner profile service"
  });

  return normalizeLearnerProfileFromModel(raw, profile);
}

module.exports = {
  transcribeFile,
  analyzeTranscript,
  analyzeRhetoric,
  chatWithCoach,
  generateLessonAngles,
  generateLessonCore,
  generateLessonPractice,
  updateLearnerProfile
};
