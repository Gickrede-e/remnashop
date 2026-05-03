import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, mockFetch, mockLogger } = vi.hoisted(() => ({
  mockEnv: {
    TURNSTILE_SECRET_KEY: "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: ""
  },
  mockFetch: vi.fn(),
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("@/lib/server/logger", () => ({ logger: mockLogger }));

import { TurnstileError, isTurnstileConfigured, verifyTurnstileToken } from "@/lib/services/turnstile";

describe("turnstile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockEnv.TURNSTILE_SECRET_KEY = "";
    mockEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isTurnstileConfigured: false when either key is missing", () => {
    expect(isTurnstileConfigured()).toBe(false);
    mockEnv.TURNSTILE_SECRET_KEY = "secret";
    expect(isTurnstileConfigured()).toBe(false);
    mockEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site";
    expect(isTurnstileConfigured()).toBe(true);
  });

  it("verifyTurnstileToken: skips silently when not configured", async () => {
    await expect(verifyTurnstileToken(undefined, "1.2.3.4")).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("verifyTurnstileToken: throws TurnstileError when token missing and configured", async () => {
    mockEnv.TURNSTILE_SECRET_KEY = "s";
    mockEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "p";
    await expect(verifyTurnstileToken(undefined, "1.2.3.4")).rejects.toBeInstanceOf(TurnstileError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("verifyTurnstileToken: posts to siteverify with secret + remoteip when configured", async () => {
    mockEnv.TURNSTILE_SECRET_KEY = "s";
    mockEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "p";
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    await verifyTurnstileToken("token-abc", "203.0.113.10");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init?.method).toBe("POST");
    const body = (init?.body as URLSearchParams).toString();
    expect(body).toContain("secret=s");
    expect(body).toContain("response=token-abc");
    expect(body).toContain("remoteip=203.0.113.10");
  });

  it("verifyTurnstileToken: throws when Cloudflare reports failure", async () => {
    mockEnv.TURNSTILE_SECRET_KEY = "s";
    mockEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "p";
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), {
        status: 200
      })
    );

    await expect(verifyTurnstileToken("bad", "1.2.3.4")).rejects.toBeInstanceOf(TurnstileError);
    expect(mockLogger.info).toHaveBeenCalledWith(
      "turnstile.verify_rejected",
      expect.objectContaining({ errorCodes: ["invalid-input-response"] })
    );
  });

  it("verifyTurnstileToken: fails closed on network error", async () => {
    mockEnv.TURNSTILE_SECRET_KEY = "s";
    mockEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "p";
    mockFetch.mockRejectedValue(new Error("ECONNRESET"));

    await expect(verifyTurnstileToken("token", "1.2.3.4")).rejects.toBeInstanceOf(TurnstileError);
  });

  it("verifyTurnstileToken: fails closed on non-2xx response", async () => {
    mockEnv.TURNSTILE_SECRET_KEY = "s";
    mockEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "p";
    mockFetch.mockResolvedValue(new Response("server error", { status: 500 }));

    await expect(verifyTurnstileToken("token", "1.2.3.4")).rejects.toBeInstanceOf(TurnstileError);
  });
});
