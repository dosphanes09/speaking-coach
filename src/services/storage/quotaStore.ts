/**
 * How many analyses are left today.
 *
 * The backend has always sent this. Every analysis endpoint sets an
 * `X-Daily-Remaining` response header, the Electron main process forwards it
 * intact, and until now nothing in the app read it — so the first a speaker
 * heard about their quota was a 429 rejection, after recording five minutes.
 * The information existed; it just never reached the screen.
 *
 * Kept in memory with a date stamp rather than persisted as a bare number,
 * because a count is only true for the day it was issued. Showing yesterday's
 * "2 left" at breakfast would be worse than showing nothing: it is a confident
 * statement that happens to be wrong.
 */

export type QuotaFeature = "rhetoric" | "drill" | "speech" | "lesson";

interface QuotaEntry {
  remaining: number;
  /** Local calendar day the count was issued on. */
  day: string;
}

const entries = new Map<QuotaFeature, QuotaEntry>();
const listeners = new Set<() => void>();

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * Records the count from a response.
 *
 * Takes the whole `Response` rather than a number so call sites cannot forget
 * the header name, and silently does nothing when the header is absent — an
 * endpoint that does not meter itself should not clear a count set by one
 * that does.
 */
export function recordQuotaFromResponse(feature: QuotaFeature, response: Response): void {
  const raw = response.headers.get("X-Daily-Remaining");
  if (raw === null) {
    return;
  }

  const remaining = Number(raw);
  if (!Number.isFinite(remaining) || remaining < 0) {
    return;
  }

  entries.set(feature, { remaining: Math.floor(remaining), day: today() });
  listeners.forEach((listener) => listener());
}

/** The count, or null when nothing was issued today. */
export function getRemaining(feature: QuotaFeature): number | null {
  const entry = entries.get(feature);
  if (!entry || entry.day !== today()) {
    return null;
  }
  return entry.remaining;
}

/**
 * A rejected request means the quota is spent, whatever the last count said.
 * Called on a 429 so the screen stops advertising a credit that no longer
 * exists.
 */
export function markQuotaExhausted(feature: QuotaFeature): void {
  entries.set(feature, { remaining: 0, day: today() });
  listeners.forEach((listener) => listener());
}

export function subscribeToQuota(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test seam. */
export function resetQuotaStore(): void {
  entries.clear();
}
