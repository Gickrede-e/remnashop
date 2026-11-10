import { beforeEach, describe, expect, it, vi } from "vitest";

const { createTransportMock, loggerErrorMock, sendMailMock } = vi.hoisted(() => ({
  createTransportMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  sendMailMock: vi.fn()
}));

vi.mock("nodemailer", () => ({
  createTransport: createTransportMock
}));

vi.mock("@/lib/server/logger", () => ({
  logger: {
    error: loggerErrorMock
  },
  serializeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : String(error)
  })
}));

function mockEnv(overrides: Partial<Record<string, unknown>> = {}) {
  vi.doMock("@/lib/env", () => ({
    env: {
      NEXT_PUBLIC_SITE_NAME: "GickShop",
      SMTP_HOST: "smtp",
      SMTP_PORT: 2525,
      SMTP_SECURE: false,
      SMTP_USER: "",
      SMTP_PASS: "",
      EMAIL_FROM: "GickShop <notifications@example.com>",
      TELEGRAM_BOT_TOKEN: "",
      ADMIN_EMAILS: "",
      ...overrides
    }
  }));
}

describe("lib/services/notifications", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createTransportMock.mockReturnValue({
      sendMail: sendMailMock
    });
    sendMailMock.mockResolvedValue(undefined);
  });

  it("creates an SMTP transport without auth when credentials are empty", async () => {
    mockEnv();

    const { sendVerificationCode } = await import("@/lib/services/notifications");

    await sendVerificationCode("user@example.com", "123456");

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp",
        port: 2525,
        secure: false
      })
    );
    expect(createTransportMock.mock.calls[0]?.[0]).not.toHaveProperty("auth");
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "GickShop <notifications@example.com>",
        to: "user@example.com"
      })
    );
  });

  it("adds SMTP auth when credentials are provided", async () => {
    mockEnv({
      SMTP_USER: "notifications@example.com",
      SMTP_PASS: "mail-secret"
    });

    const { sendPasswordResetCode } = await import("@/lib/services/notifications");

    await sendPasswordResetCode("user@example.com", "123456");

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: {
          user: "notifications@example.com",
          pass: "mail-secret"
        }
      })
    );
  });

  it("sends a broadcast as escaped paragraphs with the broadcast footer", async () => {
    mockEnv();

    const { sendBroadcastEmail } = await import("@/lib/services/notifications");

    await sendBroadcastEmail({ to: "user@example.com", subject: "Работы", text: "Привет <b>\nвсем\n\nВторой" });

    const mail = sendMailMock.mock.calls[0]?.[0];
    expect(mail.subject).toBe("Работы");
    expect(mail.text).toBe("Привет <b>\nвсем\n\nВторой\n\n— GickShop");
    expect(mail.html).toContain('<p style="margin:0 0 12px;">Привет &lt;b&gt;<br>всем</p><p style="margin:0 0 12px;">Второй</p>');
    expect(mail.html).toContain("Вы получили это письмо, потому что зарегистрированы на GickShop.");
    expect(mail.html).not.toContain("Если вы его не запрашивали");
  });

  it("logs and rethrows SMTP send failures", async () => {
    mockEnv();
    sendMailMock.mockRejectedValue(new Error("smtp failed"));

    const { sendVerificationCode } = await import("@/lib/services/notifications");

    await expect(sendVerificationCode("user@example.com", "123456")).rejects.toThrow("smtp failed");
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "notification.email_send_failed",
      expect.objectContaining({
        smtpHost: "smtp",
        smtpPort: 2525,
        subject: "GickShop: код подтверждения",
        to: "user@example.com"
      })
    );
  });
});
