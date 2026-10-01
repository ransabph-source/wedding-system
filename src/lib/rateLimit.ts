import "server-only";

// A fixed-window counter kept in this server process's memory. It resets on
// restart and isn't shared between instances, so on a multi-instance host it
// limits per instance; move it to a shared store (e.g. Redis) if that matters.
export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  function current(key: string, now: number) {
    const window = windows.get(key);
    if (window && window.resetAt > now) return window;
    // Drop expired windows now and then so the map can't grow without bound.
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }
    const fresh = { count: 0, resetAt: now + windowMs };
    windows.set(key, fresh);
    return fresh;
  }

  return {
    isLimited(key: string) {
      return current(key, Date.now()).count >= limit;
    },
    record(key: string) {
      current(key, Date.now()).count += 1;
    },
  };
}
