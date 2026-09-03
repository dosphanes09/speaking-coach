import { ChatMessage, TopicLevel } from "@/types/models";
import { validateBackendBaseUrl } from "@/config/backendConfig";
import { apiFetch } from "@/services/platform/apiClient";
import { getDeviceAccessToken } from "@/services/auth/deviceAuthService";

interface ChatWithCoachParams {
  backendBaseUrl: string;
  clientId: string;
  targetLevel: TopicLevel;
  history: ChatMessage[];
}

interface ChatResponse {
  reply: string;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

// Only text and level matter to the coach model; audio URIs and local ids
// stay on the device.
function toBackendMessages(history: ChatMessage[]): Array<{ role: "user" | "assistant"; text: string }> {
  return history
    .filter((message) => message.text.trim().length > 0)
    .map((message) => ({ role: message.role, text: message.text.trim() }));
}

export async function chatWithBackendCoach({
  backendBaseUrl,
  clientId,
  targetLevel,
  history
}: ChatWithCoachParams): Promise<string> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  const accessToken = await getDeviceAccessToken();

  let response: Response;
  try {
    response = await apiFetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": clientId,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({
        level: targetLevel,
        messages: toBackendMessages(history)
      })
    });
  } catch {
    throw new Error("Could not reach the backend. Run Test Connection in Settings and confirm the /health URL works.");
  }

  const text = await response.text();
  let json: ErrorResponse | ChatResponse = {};
  try {
    json = text ? (JSON.parse(text) as ErrorResponse | ChatResponse) : {};
  } catch {
    throw new Error("Backend returned a non-JSON response. Check that the URL points to the speech backend.");
  }

  if (!response.ok) {
    const error = (json as ErrorResponse).error;
    if (response.status === 401) {
      throw new Error(
        error?.message || "This backend requires device activation. Activate it with an invite code in Settings."
      );
    }
    if (response.status === 429) {
      throw new Error(error?.message || "Daily chat limit reached. Please try again tomorrow.");
    }
    if (error?.code === "openai_not_configured") {
      throw new Error(
        error.message ||
          "Backend reached, but chat is not configured. Add the backend API key to backend/.env and restart the backend."
      );
    }
    throw new Error(error?.message || "Chat reply failed.");
  }

  const reply = (json as ChatResponse).reply?.trim();
  if (!reply) {
    throw new Error("Backend returned an empty reply.");
  }

  return reply;
}
