import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiAdminSession, mockLogAdminAction, mockRefreshPaymentStatus } = vi.hoisted(() => ({
  mockRequireApiAdminSession: vi.fn(),
  mockLogAdminAction: vi.fn(),
  mockRefreshPaymentStatus: vi.fn()
}));

vi.mock("@/lib/api-session", () => ({
  requireApiAdminSession: mockRequireApiAdminSession
}));

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: mockLogAdminAction
}));

vi.mock("@/lib/services/payments", () => ({
  refreshPaymentStatus: mockRefreshPaymentStatus
}));

import { POST } from "@/app/api/admin/payments/[id]/refresh/route";

function refresh() {
  return POST(new Request("http://localhost/api/admin/payments/payment-1/refresh", { method: "POST" }), {
    params: Promise.resolve({ id: "payment-1" })
  });
}

describe("POST /api/admin/payments/[id]/refresh", () => {
  beforeEach(() => {
    mockRequireApiAdminSession.mockReset();
    mockLogAdminAction.mockReset();
    mockRefreshPaymentStatus.mockReset();
  });

  it("answers a non-admin with 403 without writing an admin log", async () => {
    mockRequireApiAdminSession.mockRejectedValue(Object.assign(new Error("Недостаточно прав"), { status: 403 }));

    const response = await refresh();

    expect(response.status).toBe(403);
    expect(mockRefreshPaymentStatus).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("logs a refresh that fails for an admin", async () => {
    mockRequireApiAdminSession.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    mockRefreshPaymentStatus.mockRejectedValue(new Error("Provider unavailable"));
    mockLogAdminAction.mockResolvedValue(undefined);

    const response = await refresh();

    expect(response.status).toBe(400);
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      adminId: "admin-1",
      action: "REFRESH_PAYMENT_STATUS_FAILED",
      targetType: "PAYMENT",
      targetId: "payment-1",
      details: { error: "Provider unavailable" }
    });
  });
});
