import { validateBackendBaseUrl } from "@/config/backendConfig";

interface HealthResponse {
  ok?: boolean;
  service?: string;
  openaiConfigured?: boolean;
}

export interface BackendConnectionTestResult {
  baseUrl: string;
  service: string | null;
  openaiConfigured: boolean | null;
}

export async function testBackendConnection(backendBaseUrl: string): Promise<BackendConnectionTestResult> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  const controller = new AbortController();
  // Free cloud services can need extra time for their first request after sleeping.
  const timeoutId = setTimeout(() => controller.abort(), 45000);

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
      service: typeof json.service === "string" ? json.service : null,
      openaiConfigured: typeof json.openaiConfigured === "boolean" ? json.openaiConfigured : null
    };
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.name === "AbortError") {
      throw new Error("Backend connection timed out. Confirm the online service is running and retry.");
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
