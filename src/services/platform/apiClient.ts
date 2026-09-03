/**
 * The single place every backend call goes through.
 *
 * Native path: plain `fetch`. React Native requests carry no `Origin` header,
 * so the backend's CORS allowlist never rejects them and there is nothing to
 * work around here.
 */

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}
