const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60_000
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

// Periodic cleanup of expired entries (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60_000);
}
