import { validateBackendBaseUrl } from "@/config/backendConfig";

interface HealthResponse {
  ok?: boolean;
  speechAnalysisConfigured?: boolean;
}

export interface BackendConnectionTestResult {
  baseUrl: string;
  speechAnalysisConfigured: boolean | null;
}

export async function testBackendConnection(backendBaseUrl: string): Promise<BackendConnectionTestResult> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal
    });
    const text = await response.text();
    const json = text ? (JSON.parse(text) as HealthResponse) : {};

    if (!response.ok || json.ok !== true) {
      throw new Error("Backend health check failed. Make sure GET /health returns { ok: true }.");
    }

    return {
      baseUrl,
      speechAnalysisConfigured:
        typeof json.speechAnalysisConfigured === "boolean" ? json.speechAnalysisConfigured : null
    };
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.name === "AbortError") {
      throw new Error("Backend connection timed out. Check that your phone and computer are on the same network.");
    }

    if (
      caughtError instanceof Error &&
      caughtError.message.startsWith("Backend API URL")
    ) {
      throw caughtError;
    }

    throw new Error("Backend connection failed. Open the same /health URL in your phone browser and retry.");
  } finally {
    clearTimeout(timeoutId);
  }
}
