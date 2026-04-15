import { describe, expect, it, vi } from "vitest";

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

describe("verifyPlategaSignature edge cases", () => {
  it("returns false for explicit null signatures without throwing", () => {
    expect(
      verifyPlategaSignature({
        rawBody: JSON.stringify({ event: "payment" }),
        signature: null
      })
    ).toBe(false);
  });
});
