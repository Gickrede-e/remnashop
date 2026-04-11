import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  MockWebhookAuthorizationError,
  mockHandleYookassaWebhook,
  mockLogAdminAction,
  mockLogger
} = vi.hoisted(() => {
  class MockWebhookAuthorizationError extends Error {}

  return {
    MockWebhookAuthorizationError,
    mockHandleYookassaWebhook: vi.fn(),
    mockLogAdminAction: vi.fn(),
    mockLogger: {
      warn: vi.fn(),
      error: vi.fn()
    }
  };
});

vi.mock("@/lib/services/payments", () => ({
  WebhookAuthorizationError: MockWebhookAuthorizationError,
  handleYookassaWebhook: mockHandleYookassaWebhook
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

function buildRequest(headers: HeadersInit = {}) {
  return new NextRequest("http://localhost/api/webhook/yookassa", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      ...headers
    },
    body: JSON.stringify({
      object: {
        id: "remote-payment-1",
        status: "succeeded",
        metadata: {
          paymentId: "payment-1"
        }
      }
    })
  });
}

describe("POST /api/webhook/yookassa", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockLogAdminAction.mockResolvedValue(undefined);
    mockHandleYookassaWebhook.mockResolvedValue({
      id: "payment-1",
      status: "SUCCEEDED"
    });
  });

  it("returns 401 and logs a warning when the webhook secret header is missing", async () => {
    mockHandleYookassaWebhook.mockRejectedValue(
      new MockWebhookAuthorizationError("Webhook secret is required")
    );

    const { POST } = await import("@/app/api/webhook/yookassa/route");
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();

    const response = await POST(buildRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Webhook secret is required"
    });
    expect(mockHandleYookassaWebhook).toHaveBeenCalledWith({
      ip: "203.0.113.10",
      providedSecret: null,
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
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "webhook.unauthorized",
      expect.objectContaining({
        provider: "YOOKASSA",
        paymentId: "remote-payment-1",
        error: "Webhook secret is required"
      })
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer secret mismatches", async () => {
    mockHandleYookassaWebhook.mockRejectedValue(
      new MockWebhookAuthorizationError("Webhook secret mismatch")
    );

    const { POST } = await import("@/app/api/webhook/yookassa/route");
    mockLogger.warn.mockClear();

    const response = await POST(
      buildRequest({
        authorization: "Bearer wrong-secret"
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Webhook secret mismatch"
    });
    expect(mockHandleYookassaWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        providedSecret: "wrong-secret"
      })
    );
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it("returns 200 when the X-Webhook-Secret header is valid", async () => {
    const { POST } = await import("@/app/api/webhook/yookassa/route");
    mockLogger.warn.mockClear();

    const response = await POST(
      buildRequest({
        "x-webhook-secret": "valid-secret"
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        id: "payment-1",
        status: "SUCCEEDED"
      }
    });
    expect(mockHandleYookassaWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        providedSecret: "valid-secret"
      })
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
