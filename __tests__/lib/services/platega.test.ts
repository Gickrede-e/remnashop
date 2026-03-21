import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    PLATEGA_WEBHOOK_SECRET: "platega-webhook-secret",
    PLATEGA_API_KEY: "platega-api-key",
    PLATEGA_MERCHANT_ID: "merchant-1"
  }
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

import { verifyPlategaSignature } from "@/lib/services/platega";

describe("verifyPlategaSignature", () => {
  const rawBody = JSON.stringify({ event: "payment" });

  beforeEach(() => {
    mockEnv.PLATEGA_WEBHOOK_SECRET = "platega-webhook-secret";
    mockEnv.PLATEGA_API_KEY = "platega-api-key";
    mockEnv.PLATEGA_MERCHANT_ID = "merchant-1";
  });

  it("validates HMAC signatures", () => {
    const signature = createHmac("sha256", mockEnv.PLATEGA_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    expect(verifyPlategaSignature({ rawBody, signature })).toBe(true);
  });

  it("rejects invalid HMAC signatures", () => {
    expect(verifyPlategaSignature({ rawBody, signature: "deadbeef" })).toBe(false);
  });

  it("falls back to secret plus merchant id checks", () => {
    expect(verifyPlategaSignature({
      rawBody,
      secret: mockEnv.PLATEGA_WEBHOOK_SECRET,
      merchantId: mockEnv.PLATEGA_MERCHANT_ID
    })).toBe(true);
    expect(verifyPlategaSignature({
      rawBody,
      secret: mockEnv.PLATEGA_API_KEY,
      merchantId: mockEnv.PLATEGA_MERCHANT_ID
    })).toBe(true);
    expect(verifyPlategaSignature({
      rawBody,
      secret: mockEnv.PLATEGA_WEBHOOK_SECRET,
      merchantId: "wrong-merchant"
    })).toBe(false);
  });

  it("rejects requests without a signature or secret", () => {
    expect(verifyPlategaSignature({ rawBody })).toBe(false);
  });
});
