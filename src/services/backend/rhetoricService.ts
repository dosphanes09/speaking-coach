/**
 * Sends a rhetoric practice recording to the backend for analysis.
 *
 * Mirrors `analyzeSpeechService` but talks to /api/analyze-rhetoric, which
 * transcribes in Turkish, allows a five minute recording and answers with the
 * rhetoric rubric rather than the English one.
 */
import { validateBackendBaseUrl } from "@/config/backendConfig";
import { getDeviceAccessToken } from "@/services/auth/deviceAuthService";
import { apiFetch } from "@/services/platform/apiClient";
import { createUploadFile } from "@/services/platform/uploadFile";
import { markQuotaExhausted, recordQuotaFromResponse } from "@/services/storage/quotaStore";
import { RhetoricAnalysis, RhetoricMode, RhetoricRecording, RhetoricTopic } from "@/types/rhetoric";

interface AnalyzeRhetoricParams {
  backendBaseUrl: string;
  clientId: string;
  topic: RhetoricTopic;
  mode: RhetoricMode;
  recording: RhetoricRecording;
  targetDurationSeconds: number;
  preparationNotes: string;
}

interface AnalyzeRhetoricResponse {
  transcript: string;
  analysis: RhetoricAnalysis;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export async function analyzeRhetoricWithBackend({
  backendBaseUrl,
  clientId,
  topic,
  mode,
  recording,
  targetDurationSeconds,
  preparationNotes
}: AnalyzeRhetoricParams): Promise<AnalyzeRhetoricResponse> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  const accessToken = await getDeviceAccessToken();

  const formData = new FormData();
  formData.append("topic", topic.title);
  formData.append("mode", mode);
  formData.append("durationSeconds", String(recording.durationSeconds));
  formData.append("targetDurationSeconds", String(targetDurationSeconds));
  if (preparationNotes.trim()) {
    formData.append("preparationNotes", preparationNotes.trim());
  }

  // The reference the content check is graded against. Sent from here rather
  // than held on the server because the topic bank lives in the app: the
  // backend has no idea what "Cantillon etkisi" is supposed to contain, and
  // asking the model to remember would let it invent a reference and then mark
  // the speaker wrong against it. Omitting these simply turns the check off,
  // which is the right behaviour for a topic that has no vetted definition.
  if (topic.definition?.trim()) {
    formData.append("topicDefinition", topic.definition.trim());
  }
  if (topic.angles.length > 0) {
    // Newline-separated, not JSON: this is a multipart request, where a
    // repeated field arrives as an array only sometimes.
    formData.append("topicKeyPoints", topic.angles.join("\n"));
  }

  // Only the audio is uploaded. On desktop the recording may be a video the
  // user watches locally; sending it would multiply the upload size and cost
  // for measurements that all come from the sound anyway.
  const upload = await createUploadFile(
    {
      // audioUri, never uri: on desktop `uri` is the video the speaker watches
      // locally, and uploading that would send hundreds of megabytes for
      // measurements that all come from the sound.
      uri: recording.audioUri,
      type: "audio",
      durationSeconds: recording.durationSeconds,
      expectedDurationSeconds: targetDurationSeconds,
      mimeType: recording.mimeType
    },
    "hitabet-pratigi.m4a"
  );
  formData.append("file", upload.value, upload.fileName);

  let response: Response;
  try {
    response = await apiFetch(`${baseUrl}/api/analyze-rhetoric`, {
      method: "POST",
      headers: {
        "X-Client-Id": clientId,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: formData
    });
  } catch {
    throw new Error(
      "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et ve tekrar dene. Kaydın cihazında duruyor."
    );
  }

  // The backend meters every analysis endpoint and says how many are left; the
  // app used to throw that header away and let the speaker find out by being
  // rejected after a full recording.
  recordQuotaFromResponse("rhetoric", response);
  if (response.status === 429) {
    markQuotaExhausted("rhetoric");
  }

  const text = await response.text();
  let json: ErrorResponse | AnalyzeRhetoricResponse = {};
  try {
    json = text ? (JSON.parse(text) as ErrorResponse | AnalyzeRhetoricResponse) : {};
  } catch {
    throw new Error("Sunucu beklenmeyen bir cevap döndürdü. Ayarlardaki bağlantı testini çalıştır.");
  }

  if (!response.ok) {
    throw new Error(translateError(response.status, (json as ErrorResponse).error));
  }

  const payload = json as AnalyzeRhetoricResponse;
  if (!payload.analysis?.scores) {
    throw new Error("Analiz sonucu eksik geldi. Lütfen tekrar dene.");
  }

  return payload;
}

/**
 * The backend answers in English because the English module shares it. This
 * module's interface is Turkish, so the few errors a speaker can actually act
 * on are translated here rather than leaking a mixed-language message.
 */
function translateError(status: number, error: ErrorResponse["error"]): string {
  if (status === 401) {
    return "Bu sunucu cihaz aktivasyonu istiyor. Ayarlardan davet kodunu gir.";
  }
  if (status === 429) {
    return "Günlük hitabet analizi hakkın doldu. Yarın tekrar dene.";
  }
  if (error?.code === "invalid_duration") {
    return "Kayıt süresi kabul edilen aralığın dışında. En fazla 5 dakika konuşabilirsin.";
  }
  if (error?.code === "invalid_file_size") {
    return "Kayıt dosyası çok büyük. Daha kısa bir konuşma dene.";
  }
  if (error?.code === "invalid_file_type") {
    return "Kayıt biçimi sunucu tarafından kabul edilmedi.";
  }
  if (error?.code === "openai_not_configured") {
    return "Sunucuya ulaşıldı ama analiz servisi yapılandırılmamış (API anahtarı eksik).";
  }
  if (error?.code === "empty_transcript") {
    return "Kayıttan konuşma çıkarılamadı. Mikrofonun çalıştığından emin ol.";
  }
  return error?.message || "Analiz tamamlanamadı. Lütfen tekrar dene.";
}
