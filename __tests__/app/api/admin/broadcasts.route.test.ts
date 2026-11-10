import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiAdminSession, mockLogAdminAction, mockSendEmailBroadcast } = vi.hoisted(() => ({
  mockRequireApiAdminSession: vi.fn(),
  mockLogAdminAction: vi.fn(),
  mockSendEmailBroadcast: vi.fn()
}));

vi.mock("@/lib/api-session", () => ({
  requireApiAdminSession: mockRequireApiAdminSession
}));

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: mockLogAdminAction
}));

vi.mock("@/lib/services/email-broadcasts", () => ({
  sendEmailBroadcast: mockSendEmailBroadcast
}));

import { POST } from "@/app/api/admin/broadcasts/route";

function broadcastRequest(body: unknown) {
  return new Request("http://localhost/api/admin/broadcasts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

const summary = { total: 2, sent: 1, failed: 1, failedEmails: ["b@example.com"] };

describe("POST /api/admin/broadcasts", () => {
  beforeEach(() => {
    mockRequireApiAdminSession.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    mockSendEmailBroadcast.mockResolvedValue(summary);
    mockLogAdminAction.mockResolvedValue(undefined);
  });

  it("requires an admin session", async () => {
    mockRequireApiAdminSession.mockRejectedValue(Object.assign(new Error("Требуется авторизация"), { status: 401 }));

    const response = await POST(broadcastRequest({ audience: "ALL", subject: "Тема", text: "Текст" }));

    expect(response.status).toBe(401);
    expect(mockSendEmailBroadcast).not.toHaveBeenCalled();
  });

  it("sends the broadcast, logs it and returns the counts", async () => {
    const response = await POST(broadcastRequest({ audience: "ALL", subject: " Тема ", text: "Текст" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, data: summary });
    expect(mockSendEmailBroadcast).toHaveBeenCalledWith({ audience: "ALL", subject: "Тема", text: "Текст" });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      adminId: "admin-1",
      action: "SEND_EMAIL_BROADCAST",
      targetType: "EMAIL_BROADCAST",
      targetId: "ALL",
      details: {
        audience: "ALL",
        subject: "Тема",
        text: "Текст",
        total: 2,
        sent: 1,
        failed: 1,
        failedEmails: ["b@example.com"]
      }
    });
  });

  it("rejects a single-address send without a valid email", async () => {
    const response = await POST(broadcastRequest({ audience: "ONE", email: "nope", subject: "Тема", text: "Текст" }));

    expect(response.status).toBe(400);
    expect(mockSendEmailBroadcast).not.toHaveBeenCalled();
  });

  it("rejects an empty subject", async () => {
    const response = await POST(broadcastRequest({ audience: "ALL", subject: "  ", text: "Текст" }));

    expect(response.status).toBe(400);
    expect(mockSendEmailBroadcast).not.toHaveBeenCalled();
  });

  it("returns the service error when a broadcast is already running", async () => {
    mockSendEmailBroadcast.mockRejectedValue(new Error("Рассылка уже идёт, дождитесь её окончания"));

    const response = await POST(broadcastRequest({ audience: "ALL", subject: "Тема", text: "Текст" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Рассылка уже идёт, дождитесь её окончания");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("still returns the counts when the audit log write fails", async () => {
    mockLogAdminAction.mockRejectedValue(new Error("log exploded"));

    const response = await POST(broadcastRequest({ audience: "ALL", subject: "Тема", text: "Текст" }));

    expect(response.status).toBe(200);
  });
});
