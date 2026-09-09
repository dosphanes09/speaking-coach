/**
 * Sends a micro-drill recording to /api/drill.
 *
 * Deliberately thinner than `rhetoricService`: a drill uploads audio only —
 * there is no video to keep, no preparation notes to compare against, and no
 * topic reference to grade content by. The response is a verdict and two
 * sentences.
 */
import { validateBackendBaseUrl } from "@/config/backendConfig";
import { getDeviceAccessToken } from "@/services/auth/deviceAuthService";
import { apiFetch } from "@/services/platform/apiClient";
import { createUploadFile } from "@/services/platform/uploadFile";
import { markQuotaExhausted, recordQuotaFromResponse } from "@/services/storage/quotaStore";
import { DrillPrompt, DrillResult } from "@/types/drill";

interface RunDrillParams {
  backendBaseUrl: string;
  clientId: string;
  prompt: DrillPrompt;
  audioUri: string;
  mimeType: string;
  durationSeconds: number;
}

interface DrillResponse {
  result: DrillResult;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export async function runDrillWithBackend({
  backendBaseUrl,
  clientId,
  prompt,
  audioUri,
  mimeType,
  durationSeconds
}: RunDrillParams): Promise<DrillResult> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  const accessToken = await getDeviceAccessToken();

  const formData = new FormData();
  formData.append("kind", prompt.kind);
  formData.append("durationSeconds", String(durationSeconds));

  // The text the speaker was asked to read. The backend scores by comparing the
  // transcript against it, so without this a reading drill has nothing to be
  // right or wrong about.
  if (prompt.text) {
    formData.append("targetText", prompt.text);
  }
  if (prompt.targetWordsPerMinute) {
    formData.append("targetWordsPerMinute", String(prompt.targetWordsPerMinute));
  }

  const upload = await createUploadFile(
    {
      uri: audioUri,
      type: "audio",
      durationSeconds,
      expectedDurationSeconds: prompt.durationSeconds,
      mimeType
    },
    "egzersiz.m4a"
  );
  formData.append("file", upload.value, upload.fileName);

  let response: Response;
  try {
    response = await apiFetch(`${baseUrl}/api/drill`, {
      method: "POST",
      headers: {
        "X-Client-Id": clientId,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: formData
    });
  } catch {
    throw new Error("Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.");
  }

  // The backend meters every analysis endpoint and says how many are left; the
  // app used to throw that header away and let the speaker find out by being
  // rejected after a full recording.
  recordQuotaFromResponse("drill", response);
  if (response.status === 429) {
    markQuotaExhausted("drill");
  }

  const text = await response.text();
  let json: ErrorResponse | DrillResponse = {};
  try {
    json = text ? (JSON.parse(text) as ErrorResponse | DrillResponse) : {};
  } catch {
    throw new Error("Sunucu beklenmeyen bir cevap döndürdü.");
  }

  if (!response.ok) {
    throw new Error(translateError(response.status, (json as ErrorResponse).error));
  }

  const payload = json as DrillResponse;
  if (!payload.result?.outcome) {
    throw new Error("Egzersiz sonucu eksik geldi. Tekrar dene.");
  }

  return payload.result;
}

function translateError(status: number, error: ErrorResponse["error"]): string {
  if (status === 401) {
    return "Bu sunucu cihaz aktivasyonu istiyor. Ayarlardan davet kodunu gir.";
  }
  if (status === 429) {
    return "Bugünlük egzersiz hakkın doldu. Yarın devam.";
  }
  if (error?.code === "drill_listening_failed") {
    // Reporting zero hesitations because nothing listened would hand out a pass
    // for silence, so the backend refuses instead of guessing.
    return "Kaydın dinlenemedi, bu yüzden dolgu sesi sayılamadı. Tekrar dene.";
  }
  if (error?.code === "invalid_duration") {
    return "Kayıt süresi kabul edilen aralığın dışında.";
  }
  if (error?.code === "empty_transcript") {
    return "Kayıttan konuşma çıkarılamadı. Mikrofonunu kontrol et.";
  }
  if (error?.code === "openai_not_configured") {
    return "Sunucuya ulaşıldı ama analiz servisi yapılandırılmamış.";
  }
  return error?.message || "Egzersiz değerlendirilemedi. Tekrar dene.";
}
