import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { MockWebhookDropSilentlyError, MockWebhookIntegrityError, mockHandlePlategaWebhook } = vi.hoisted(() => ({
  MockWebhookDropSilentlyError: class extends Error {},
  MockWebhookIntegrityError: class extends Error {},
  mockHandlePlategaWebhook: vi.fn()
}));

vi.mock("@/lib/env", () => ({
  env: { PLATEGA_MERCHANT_ID: "merchant-1", PLATEGA_API_KEY: "secret-1" }
}));

vi.mock("@/lib/services/payments", () => ({
  WebhookDropSilentlyError: MockWebhookDropSilentlyError,
  WebhookIntegrityError: MockWebhookIntegrityError,
  handlePlategaWebhook: mockHandlePlategaWebhook
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
  RateLimitExceededError: class extends Error {}
}));

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: vi.fn().mockResolvedValue(null)
}));

vi.mock("@/lib/server/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  serializeError: vi.fn(() => ({}))
}));

vi.mock("@/lib/payments/provider-config", () => ({
  isPaymentProviderEnabledFromEnv: () => true
}));

import { POST } from "@/app/api/webhook/platega/route";

function buildRequest(headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/webhook/platega", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ id: "tx-1", status: "CONFIRMED", payload: "payment-1" })
  });
}

describe("POST /api/webhook/platega", () => {
  beforeEach(() => {
    mockHandlePlategaWebhook.mockResolvedValue({ id: "payment-1" });
  });

  it("rejects callbacks whose X-Secret does not match the merchant key", async () => {
    const response = await POST(buildRequest({ "x-merchantid": "merchant-1", "x-secret": "wrong" }));

    expect(response.status).toBe(401);
    expect(mockHandlePlategaWebhook).not.toHaveBeenCalled();
  });

  it("passes authenticated callbacks to the payment service", async () => {
    const response = await POST(buildRequest({ "x-merchantid": "merchant-1", "x-secret": "secret-1" }));

    expect(response.status).toBe(200);
    expect(mockHandlePlategaWebhook).toHaveBeenCalledWith({ callback: { id: "tx-1", payload: "payment-1" } });
  });
});
