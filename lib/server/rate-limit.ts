// Process-local limiter: acceptable for a single app container, but not shared across instances.
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type EnforceRateLimitInput = {
  key: string;
  max: number;
  windowMs: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const GC_INTERVAL_MS = 60_000;
let nextGcAt = 0;

export class RateLimitExceededError extends Error {
  constructor() {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}

function pruneExpiredEntries(now: number) {
  if (now < nextGcAt) {
    return;
  }

  nextGcAt = now + GC_INTERVAL_MS;

  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function enforceRateLimit({ key, max, windowMs }: EnforceRateLimitInput) {
  const now = Date.now();
  const existingEntry = rateLimitStore.get(key);

  pruneExpiredEntries(now);

  if (!existingEntry || existingEntry.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return;
  }

  if (existingEntry.count >= max) {
    throw new RateLimitExceededError();
  }

  existingEntry.count += 1;
}
