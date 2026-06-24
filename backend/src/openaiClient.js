const fs = require("node:fs/promises");
const { config } = require("./config");
const { HttpError } = require("./errors");
const { analysisJsonSchema } = require("./analysisSchema");
const { buildSpeakingAnalysisPrompt } = require("./prompt");
const { calibrateAnalysisScores } = require("./scoringCalibrator");

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

async function analyzeTranscript(topic, transcript, level, durationSeconds, analysisContext = null, options = {}) {
  const expectedDurationSeconds = options.expectedDurationSeconds || durationSeconds;
  const response = await fetchWithTimeoutAndRetry("https://api.openai.com/v1/responses", () => ({
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model: config.openAiAnalysisModel,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a supportive but honest English speaking teacher. Return only valid JSON that matches the schema."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildSpeakingAnalysisPrompt(topic, transcript, level, durationSeconds, analysisContext, {
                expectedDurationSeconds
              })
            }
          ]
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
  const parsed = JSON.parse(extractOutputText(json));
  const calibrated = calibrateAnalysisScores(parsed, {
    transcript,
    durationSeconds,
    expectedDurationSeconds
  });

  return {
    ...calibrated,
    generatedBy: "backend",
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  transcribeFile,
  analyzeTranscript
};
