export interface BackoffPolicy {
  baseMs: number;
  maxMs: number;
  maxAttempts: number;
}

export const DEFAULT_BACKOFF: BackoffPolicy = { baseMs: 1_000, maxMs: 5 * 60_000, maxAttempts: 8 };

/** Backoff exponencial com "full jitter": delay = random(0, min(max, base * 2^(attempt-1))). */
export function computeBackoffMs(
  attempt: number,
  policy: BackoffPolicy = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number {
  const n = Math.max(1, Math.floor(attempt));
  const cap = Math.min(policy.maxMs, policy.baseMs * 2 ** (n - 1));
  return Math.floor(random() * cap);
}
