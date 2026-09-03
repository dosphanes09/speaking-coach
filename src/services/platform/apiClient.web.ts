/**
 * Desktop / web implementation of the backend HTTP call.
 *
 * Why this file exists: a page always sends an `Origin` header, and the backend
 * only answers origins listed in its `FRONTEND_ORIGINS` environment variable.
 * The phone app is never affected because native requests send no `Origin` at
 * all. Rather than making the Render deployment learn about the desktop build,
 * the Electron shell performs the request from its main process, which is not a
 * browsing context and therefore also sends no `Origin`. The desktop app then
 * looks exactly like the phone app to the server, and no backend change or
 * redeploy is needed.
 *
 * In a plain browser (no Electron shell) we fall back to a normal `fetch`, which
 * works as long as the dev origin is in `FRONTEND_ORIGINS`.
 */
import { getDesktopBridge } from "@/services/platform/desktopBridge";

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    return fetch(input, init);
  }

  // Building a Request does the tedious part for us: it encodes a FormData body
  // into the multipart bytes and produces the matching `content-type` header
  // (including the randomly generated boundary), so the main process only has
  // to forward opaque bytes.
  const request = new Request(input, init);
  const bodyBuffer = request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer();

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const response = await bridge.apiRequest({
    url: request.url,
    method: request.method,
    headers,
    body: bodyBuffer && bodyBuffer.byteLength > 0 ? new Uint8Array(bodyBuffer) : null
  });

  // Rebuilt as a normal Response so every caller keeps using `.ok`, `.status`,
  // `.json()` and `.text()` without knowing a bridge was involved.
  const responseBody = response.body instanceof Uint8Array ? response.body : new Uint8Array(response.body ?? []);
  return new Response(responseBody.byteLength > 0 ? (responseBody.slice().buffer as ArrayBuffer) : null, {
    status: response.status,
    statusText: response.statusText,
    headers: stripForbiddenHeaders(response.headers)
  });
}

/**
 * `content-encoding` / `content-length` describe how the main process received
 * the payload. The bytes handed back here are already decoded, so replaying
 * those headers would make the page misread the body length.
 */
function stripForbiddenHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "content-encoding" || normalizedKey === "content-length") {
      continue;
    }
    result[key] = value;
  }
  return result;
}
