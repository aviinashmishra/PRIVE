// In-memory sliding-window rate limiter for the auth endpoints (docs/05 §2:
// token-bucket per IP + per account). Single-process scope — swap for Redis when
// the app runs multi-instance.
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterS: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const arr = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return { ok: false, retryAfterS: Math.ceil((arr[0] + windowMs - now) / 1000) };
  }
  arr.push(now);
  hits.set(key, arr);
  // opportunistic cleanup so the map cannot grow unbounded
  if (hits.size > 10_000) {
    Array.from(hits.entries()).forEach(([k, v]) => {
      if (v.every((t) => t <= windowStart)) hits.delete(k);
    });
  }
  return { ok: true, retryAfterS: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}
