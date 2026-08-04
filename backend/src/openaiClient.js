const fs = require("node:fs/promises");
const { config } = require("./config");
const { HttpError } = require("./errors");
const { logWarn } = require("./logger");
const { analysisJsonSchema } = require("./analysisSchema");
const { buildSpeakingAnalysisPrompt, buildChatSystemPrompt } = require("./prompt");
const { calibrateAnalysisScores } = require("./scoringCalibrator");
const { convertToWav, readAsBase64, deleteQuietly } = require("./audioConversion");

function retryableStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function fetchWithTimeoutAndRetry(url, optionsFactory) {
  const maxAttempts = config.openAiMaxRetries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.openAiTimeoutMs);

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

      throw new HttpError(502, "openai_request_failed", "Speech analysis service is unavailable.");
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof HttpError) {
        throw error;
      }

      if (attempt < maxAttempts) {
        continue;
      }

      throw new HttpError(504, "openai_timeout", "Speech analysis service timed out.");
    }
  }

  throw new HttpError(502, "openai_request_failed", "Speech analysis service is unavailable.");
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

async function transcribeFile(filePath, mimeType, originalName) {
  const buffer = await fs.readFile(filePath);

  const response = await fetchWithTimeoutAndRetry("https://api.openai.com/v1/audio/transcriptions", () => {
    const formData = new FormData();
    formData.append("model", config.openAiTranscriptionModel);
    formData.append("language", "en");
    formData.append("file", new Blob([buffer], { type: mimeType }), originalName);

    return {
      method: "POST",
      headers: authHeaders(),
      body: formData
    };
  });

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

async function requestAnalysisFromModel(model, userContent) {
  const response = await fetchWithTimeoutAndRetry("https://api.openai.com/v1/responses", () => ({
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM_INSTRUCTION }]
        },
        {
          role: "user",
          content: userContent
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "speaking_analysis",
          strict: true,
          schema: analysisJsonSchema
        }
      },
      max_output_tokens: config.openAiMaxOutputTokens
    })
  }));

  const json = await response.json();
  return JSON.parse(extractOutputText(json));
}

async function analyzeTranscriptFromText(topic, transcript, level, durationSeconds, analysisContext, expectedDurationSeconds) {
  const prompt = buildSpeakingAnalysisPrompt(topic, transcript, level, durationSeconds, analysisContext, {
    expectedDurationSeconds
  });

  return requestAnalysisFromModel(config.openAiAnalysisModel, [{ type: "input_text", text: prompt }]);
}

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
  const prompt = buildSpeakingAnalysisPrompt(topic, transcript, level, durationSeconds, analysisContext, {
    expectedDurationSeconds,
    audioAttached: true
  });

  // Most audio-input models document reliable support for wav; the app can record
  // m4a/webm/mp4 depending on device, so we normalize everything to a mono 16kHz WAV
  // before sending it, rather than trusting every recorded container to be accepted as-is.
  // If the file is already wav, skip the conversion step entirely.
  const alreadyWav = audioMimeType === "audio/wav" || audioMimeType === "audio/x-wav";
  let convertedPath;

  try {
    const wavPath = alreadyWav ? audioFilePath : await convertToWav(audioFilePath);
    convertedPath = alreadyWav ? undefined : wavPath;
    const base64Audio = await readAsBase64(wavPath);

    return await requestAnalysisFromModel(config.openAiAudioAnalysisModel, [
      { type: "input_text", text: prompt },
      { type: "input_audio", input_audio: { data: base64Audio, format: "wav" } }
    ]);
  } finally {
    await deleteQuietly(convertedPath);
  }
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
        code: error?.code || "audio_analysis_error"
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

module.exports = {
  transcribeFile,
  analyzeTranscript,
  chatWithCoach
};
