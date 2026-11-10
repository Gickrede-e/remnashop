import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, mockUserFindMany, mockSendBroadcastEmail } = vi.hoisted(() => ({
  mockEnv: { EMAIL_ENABLED: true },
  mockUserFindMany: vi.fn(),
  mockSendBroadcastEmail: vi.fn()
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: mockUserFindMany,
      count: vi.fn()
    }
  }
}));

vi.mock("@/lib/services/notifications", () => ({
  sendBroadcastEmail: mockSendBroadcastEmail
}));

import { sendEmailBroadcast } from "@/lib/services/email-broadcasts";

const content = { subject: "Работы", text: "Сервер будет недоступен." };

describe("lib/services/email-broadcasts", () => {
  beforeEach(() => {
    mockEnv.EMAIL_ENABLED = true;
    mockSendBroadcastEmail.mockResolvedValue(undefined);
  });

  it("sends to every user and counts failed addresses without stopping", async () => {
    mockUserFindMany.mockResolvedValue([{ email: "a@example.com" }, { email: "b@example.com" }]);
    mockSendBroadcastEmail.mockRejectedValueOnce(new Error("smtp failed"));

    const summary = await sendEmailBroadcast({ audience: "ALL", ...content });

    expect(mockUserFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    expect(mockSendBroadcastEmail).toHaveBeenCalledTimes(2);
    expect(mockSendBroadcastEmail).toHaveBeenLastCalledWith({ to: "b@example.com", ...content });
    expect(summary).toEqual({ total: 2, sent: 1, failed: 1, failedEmails: ["a@example.com"] });
  });

  it("limits the active audience to users with a live ACTIVE subscription", async () => {
    mockUserFindMany.mockResolvedValue([]);

    await sendEmailBroadcast({ audience: "ACTIVE", ...content });

    expect(mockUserFindMany.mock.calls[0]?.[0].where).toEqual({
      subscription: { is: { status: "ACTIVE", expiresAt: { gt: expect.any(Date) } } }
    });
  });

  it("sends a single address without querying users", async () => {
    const summary = await sendEmailBroadcast({ audience: "ONE", email: "me@example.com", ...content });

    expect(mockUserFindMany).not.toHaveBeenCalled();
    expect(mockSendBroadcastEmail).toHaveBeenCalledWith({ to: "me@example.com", ...content });
    expect(summary.sent).toBe(1);
  });

  it("rejects a second broadcast while one is still sending", async () => {
    let finishFirst = () => {};
    mockSendBroadcastEmail.mockReturnValueOnce(new Promise<void>((resolve) => (finishFirst = resolve)));
    const first = sendEmailBroadcast({ audience: "ONE", email: "me@example.com", ...content });

    await expect(sendEmailBroadcast({ audience: "ONE", email: "me@example.com", ...content })).rejects.toThrow(
      "Рассылка уже идёт"
    );

    finishFirst();
    await first;
    await expect(sendEmailBroadcast({ audience: "ONE", email: "me@example.com", ...content })).resolves.toBeTruthy();
  });

  it("refuses to run when email is disabled on the server", async () => {
    mockEnv.EMAIL_ENABLED = false;

    await expect(sendEmailBroadcast({ audience: "ALL", ...content })).rejects.toThrow("Отправка почты отключена");
    expect(mockSendBroadcastEmail).not.toHaveBeenCalled();
  });
});
