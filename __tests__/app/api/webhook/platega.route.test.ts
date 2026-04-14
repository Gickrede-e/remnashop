import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockHandlePlategaWebhook,
  mockIsPaymentProviderEnabledFromEnv,
  mockLogAdminAction
} = vi.hoisted(() => ({
  mockHandlePlategaWebhook: vi.fn(),
  mockIsPaymentProviderEnabledFromEnv: vi.fn(),
  mockLogAdminAction: vi.fn()
}));

vi.mock("@/lib/services/payments", () => ({
  handlePlategaWebhook: mockHandlePlategaWebhook
}));

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: mockLogAdminAction
}));

vi.mock("@/lib/payments/provider-config", () => ({
  isPaymentProviderEnabledFromEnv: mockIsPaymentProviderEnabledFromEnv
}));

describe("POST /api/webhook/platega", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockIsPaymentProviderEnabledFromEnv.mockReturnValue(true);
    mockHandlePlategaWebhook.mockRejectedValue(new Error("signature mismatch"));
    mockLogAdminAction.mockResolvedValue(undefined);
  });

  it("returns 404 when Platega is disabled", async () => {
    mockIsPaymentProviderEnabledFromEnv.mockReturnValue(false);

    const { POST } = await import("@/app/api/webhook/platega/route");
    const response = await POST(
      new Request("http://localhost/api/webhook/platega", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          order_id: "payment-123"
        })
      })
    );

    expect(response.status).toBe(404);
    expect(mockHandlePlategaWebhook).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("writes structured webhook failures to stdout", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const { POST } = await import("@/app/api/webhook/platega/route");

    const response = await POST(
      new Request("http://localhost/api/webhook/platega", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          order_id: "payment-123"
        })
      })
    );

    const webhookWrites = stdoutSpy.mock.calls
      .map(([chunk]) => String(chunk))
      .filter((chunk) => chunk.includes("webhook.failed"));

    expect(response.status).toBe(400);
    expect(webhookWrites).toHaveLength(1);
    expect(JSON.parse(webhookWrites[0] ?? "{}")).toMatchObject({
      level: "error",
      msg: "webhook.failed",
      provider: "PLATEGA",
      paymentId: "payment-123",
      error: {
        message: "signature mismatch"
      }
    });
  });

  it("returns 413 before reading the body when content-length exceeds the webhook limit", async () => {
    const { POST } = await import("@/app/api/webhook/platega/route");

    const response = await POST(
      new Request("http://localhost/api/webhook/platega", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "70000"
        },
        body: JSON.stringify({
          order_id: "payment-oversized"
        })
      })
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Payload too large"
    });
    expect(mockHandlePlategaWebhook).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});
