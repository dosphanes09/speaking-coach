import { AnalysisResult, RecordedMedia, Topic } from "@/types/models";
import { validateBackendBaseUrl } from "@/config/backendConfig";

interface AnalyzeSpeechParams {
  backendBaseUrl: string;
  clientId: string;
  media: RecordedMedia;
  topic: Topic;
}

interface AnalyzeSpeechResponse {
  transcript: string;
  analysis: AnalysisResult;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

function getUploadName(media: RecordedMedia): string {
  return media.type === "video" ? "speaking-practice.mp4" : "speaking-practice.m4a";
}

export async function analyzeSpeechWithBackend({
  backendBaseUrl,
  clientId,
  media,
  topic
}: AnalyzeSpeechParams): Promise<AnalyzeSpeechResponse> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);

  const formData = new FormData();
  formData.append("topic", topic.title);
  formData.append("level", topic.level);
  formData.append("durationSeconds", String(media.durationSeconds));
  formData.append("file", {
    uri: media.uri,
    name: getUploadName(media),
    type: media.mimeType
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/analyze-speech`, {
      method: "POST",
      headers: {
        "X-Client-Id": clientId
      },
      body: formData
    });
  } catch {
    throw new Error("Could not reach the backend. Run Test Connection in Settings and confirm the /health URL works.");
  }

  const text = await response.text();
  let json: ErrorResponse | AnalyzeSpeechResponse = {};
  try {
    json = text ? (JSON.parse(text) as ErrorResponse | AnalyzeSpeechResponse) : {};
  } catch {
    throw new Error("Backend returned a non-JSON response. Check that the URL points to the speech backend.");
  }

  if (!response.ok) {
    const error = (json as ErrorResponse).error;
    if (error?.code === "openai_not_configured") {
      throw new Error(
        error.message ||
          "Backend reached, but speech analysis is not configured. Add OPENAI_API_KEY to backend/.env and restart the backend."
      );
    }
    throw new Error(error?.message || "Speech analysis failed.");
  }

  return json as AnalyzeSpeechResponse;
}
