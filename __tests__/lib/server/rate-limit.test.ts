import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadRateLimitModule() {
  vi.resetModules();
  return import("@/lib/server/rate-limit");
}

describe("lib/server/rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the configured limit", async () => {
    const { enforceRateLimit } = await loadRateLimitModule();

    expect(() => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        enforceRateLimit({
          key: "auth:under-limit",
          max: 10,
          windowMs: 60_000
        });
      }
    }).not.toThrow();
  });

  it("throws after the limit is exceeded", async () => {
    const { RateLimitExceededError, enforceRateLimit } = await loadRateLimitModule();

    enforceRateLimit({
      key: "auth:over-limit",
      max: 2,
      windowMs: 60_000
    });
    enforceRateLimit({
      key: "auth:over-limit",
      max: 2,
      windowMs: 60_000
    });

    expect(() =>
      enforceRateLimit({
        key: "auth:over-limit",
        max: 2,
        windowMs: 60_000
      })
    ).toThrowError(RateLimitExceededError);
  });

  it("resets the window after it expires", async () => {
    const { RateLimitExceededError, enforceRateLimit } = await loadRateLimitModule();

    enforceRateLimit({
      key: "auth:window-reset",
      max: 1,
      windowMs: 60_000
    });

    expect(() =>
      enforceRateLimit({
        key: "auth:window-reset",
        max: 1,
        windowMs: 60_000
      })
    ).toThrowError(RateLimitExceededError);

    vi.advanceTimersByTime(60_001);

    expect(() =>
      enforceRateLimit({
        key: "auth:window-reset",
        max: 1,
        windowMs: 60_000
      })
    ).not.toThrow();
  });
});
