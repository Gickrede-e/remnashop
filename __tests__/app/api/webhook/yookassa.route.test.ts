import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  MockRateLimitExceededError,
  MockWebhookDropSilentlyError,
  MockWebhookIntegrityError,
  MockWebhookIpForbiddenError,
  mockIsPaymentProviderEnabledFromEnv,
  mockEnforceRateLimit,
  mockHandleYookassaWebhook,
  mockLogAdminAction,
  mockLogger
} = vi.hoisted(() => {
  class MockWebhookIpForbiddenError extends Error {}
  class MockWebhookDropSilentlyError extends Error {}
  class MockWebhookIntegrityError extends Error {}
  class MockRateLimitExceededError extends Error {}

  return {
    MockRateLimitExceededError,
    MockWebhookDropSilentlyError,
    MockWebhookIntegrityError,
    MockWebhookIpForbiddenError,
    mockIsPaymentProviderEnabledFromEnv: vi.fn(),
    mockEnforceRateLimit: vi.fn(),
    mockHandleYookassaWebhook: vi.fn(),
    mockLogAdminAction: vi.fn(),
    mockLogger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  };
});

vi.mock("@/lib/services/payments", () => ({
  WebhookDropSilentlyError: MockWebhookDropSilentlyError,
  WebhookIntegrityError: MockWebhookIntegrityError,
  WebhookIpForbiddenError: MockWebhookIpForbiddenError,
  handleYookassaWebhook: mockHandleYookassaWebhook
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
  RateLimitExceededError: MockRateLimitExceededError
}));

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: mockLogAdminAction
}));

vi.mock("@/lib/server/logger", () => ({
  logger: mockLogger,
  serializeError: vi.fn((error: unknown) =>
    error instanceof Error ? { message: error.message } : { message: "Unknown error" }
  )
}));

vi.mock("@/lib/payments/provider-config", () => ({
  isPaymentProviderEnabledFromEnv: mockIsPaymentProviderEnabledFromEnv
}));

function buildRequest(
  body: Record<string, unknown> = {
    object: {
      id: "remote-payment-1",
      status: "succeeded",
      metadata: {
        paymentId: "payment-1"
      }
    }
  },
  headers: HeadersInit = {}
) {
  return new NextRequest("http://localhost/api/webhook/yookassa", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

describe("POST /api/webhook/yookassa", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockIsPaymentProviderEnabledFromEnv.mockReturnValue(true);
    mockLogAdminAction.mockResolvedValue(undefined);
    mockEnforceRateLimit.mockImplementation(() => undefined);
    mockHandleYookassaWebhook.mockResolvedValue({
      id: "payment-1",
      status: "SUCCEEDED"
    });
  });

  it.each([
    { body: {}, label: "empty body" },
    { body: { object: {} }, label: "missing object.id" },
    {
      body: { object: { id: "remote-payment-1", metadata: {} } },
      label: "missing metadata.paymentId"
    }
  ])("returns 200 and drops silently when body is structurally invalid: $label", async ({ body }) => {
    const { POST } = await import("@/app/api/webhook/yookassa/route");
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();

    const response = await POST(buildRequest(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        accepted: true
      }
    });

    expect(mockHandleYookassaWebhook).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "webhook.dropped",
      expect.objectContaining({
        provider: "YOOKASSA",
        paymentId: "UNKNOWN",
        reason: "invalid body"
      })
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("returns 404 when YooKassa is disabled", async () => {
    mockIsPaymentProviderEnabledFromEnv.mockReturnValue(false);

    const { POST } = await import("@/app/api/webhook/yookassa/route");
    const response = await POST(buildRequest());

    expect(response.status).toBe(404);
    expect(mockHandleYookassaWebhook).not.toHaveBeenCalled();
    expect(mockEnforceRateLimit).not.toHaveBeenCalled();
  });

  it("returns 413 before parsing when the payload exceeds the webhook size limit", async () => {
    const { POST } = await import("@/app/api/webhook/yookassa/route");
    const response = await POST(
      buildRequest(undefined, {
        "content-length": "70000"
      })
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Payload too large"
    });
    expect(mockHandleYookassaWebhook).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("returns 200 silently when handleYookassaWebhook throws WebhookDropSilentlyError", async () => {
    mockHandleYookassaWebhook.mockRejectedValue(
      new MockWebhookDropSilentlyError("local payment not found")
    );

    const { POST } = await import("@/app/api/webhook/yookassa/route");
    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        accepted: true
      }
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "webhook.dropped",
      expect.objectContaining({
        provider: "YOOKASSA",
        paymentId: "remote-payment-1",
        reason: "local payment not found"
      })
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("returns 200 and logs error when handleYookassaWebhook throws WebhookIntegrityError", async () => {
    mockHandleYookassaWebhook.mockRejectedValue(
      new MockWebhookIntegrityError("metadata paymentId mismatch")
    );

    const { POST } = await import("@/app/api/webhook/yookassa/route");
    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        accepted: true
      }
    });
    expect(mockLogger.error).toHaveBeenCalledWith(
      "webhook.integrity",
      expect.objectContaining({
        provider: "YOOKASSA",
        paymentId: "remote-payment-1",
        reason: "metadata paymentId mismatch"
      })
    );
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "PAYMENT_WEBHOOK_INTEGRITY",
      targetType: "PAYMENT",
      targetId: "remote-payment-1",
      details: {
        provider: "YOOKASSA",
        ip: "203.0.113.10",
        reason: "metadata paymentId mismatch"
      }
    });
  });

  it("returns 200 and logs warning when handleYookassaWebhook throws WebhookIpForbiddenError", async () => {
    mockHandleYookassaWebhook.mockRejectedValue(
      new MockWebhookIpForbiddenError("Webhook source IP is not allowlisted")
    );

    const { POST } = await import("@/app/api/webhook/yookassa/route");
    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        accepted: true
      }
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "webhook.ip_forbidden",
      expect.objectContaining({
        provider: "YOOKASSA",
        paymentId: "remote-payment-1"
      })
    );
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("returns 200 successfully when valid webhook is processed", async () => {
    const { POST } = await import("@/app/api/webhook/yookassa/route");
    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        id: "payment-1",
        status: "SUCCEEDED"
      }
    });
    expect(mockEnforceRateLimit).toHaveBeenCalledTimes(1);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "webhook:yookassa:203.0.113.10",
      max: 30,
      windowMs: 60_000
    });
    expect(mockHandleYookassaWebhook).toHaveBeenCalledWith({
      ip: "203.0.113.10",
      event: {
        object: {
          id: "remote-payment-1",
          status: "succeeded",
          metadata: {
            paymentId: "payment-1"
          }
        }
      }
    });
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it("returns 200 and drops when rate limit exceeded", async () => {
    mockEnforceRateLimit.mockImplementation(() => {
      throw new MockRateLimitExceededError("Rate limit exceeded");
    });

    const { POST } = await import("@/app/api/webhook/yookassa/route");
    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        accepted: true
      }
    });
    expect(mockLogger.warn).toHaveBeenCalledWith("webhook.rate_limited", {
      provider: "YOOKASSA"
    });
    expect(mockHandleYookassaWebhook).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});
