import { AnalysisResult, RecordedMedia, Topic } from "@/types/models";
import { validateBackendBaseUrl } from "@/config/backendConfig";
import { getDeviceAccessToken } from "@/services/auth/deviceAuthService";

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
  const accessToken = await getDeviceAccessToken();
  // Do not block locally when there is no activation token. The backend is the
  // source of truth: REQUIRE_APP_AUTH=false accepts this request, while future
  // invite-code deployments can still reject it with 401.

  const formData = new FormData();
  formData.append("topic", topic.title);
  formData.append("level", topic.level);
  formData.append("durationSeconds", String(media.durationSeconds));
  if (topic.grammarFocus) {
    formData.append("grammarCefrLevel", topic.grammarFocus.cefrLevel);
    formData.append("grammarTopic", topic.grammarFocus.grammarTopic);
    formData.append("expectedGrammarStructures", topic.grammarFocus.expectedStructures.join("; "));
    formData.append("speakingPrompt", topic.grammarFocus.speakingPrompt);
  }
  if (topic.picturePromptContext) {
    formData.append("mode", topic.picturePromptContext.mode);
    formData.append("picturePromptId", topic.picturePromptContext.promptId);
    formData.append("pictureDescriptionTarget", topic.picturePromptContext.sceneDescriptionForAI);
    formData.append("pictureLearnerInstructions", topic.picturePromptContext.learnerInstructions.join("; "));
    formData.append("pictureDetailChecklist", topic.picturePromptContext.detailChecklist.join("; "));
    formData.append("picturePossibleInferences", topic.picturePromptContext.possibleInferences.join("; "));
    formData.append("pictureCommonMistakes", topic.picturePromptContext.commonMistakes.join("; "));
    formData.append("expectedVocabularyCategories", topic.picturePromptContext.suggestedVocabulary.join("; "));
    formData.append("expectedGrammarStructures", topic.picturePromptContext.targetGrammar.join("; "));
    formData.append("speakingPrompt", topic.picturePromptContext.speakingQuestions.join(" "));
  }
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
        "X-Client-Id": clientId,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
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
    if (response.status === 401) {
      throw new Error(
        error?.message ||
          "Backend bu analiz için cihaz aktivasyonu istiyor. Ayarlar bölümünden davet koduyla etkinleştir."
      );
    }
    if (error?.code === "openai_not_configured") {
      throw new Error(
        error.message ||
          "Backend reached, but speech analysis is not configured. Add the backend API key to backend/.env and restart the backend."
      );
    }
    throw new Error(error?.message || "Speech analysis failed.");
  }

  return json as AnalyzeSpeechResponse;
}
