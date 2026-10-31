import { env } from "@/lib/env";
import { logger, serializeError } from "@/lib/server/logger";

const SITE_NAME = env.NEXT_PUBLIC_SITE_NAME;

// Pull the bare address out of EMAIL_FROM ("GickShop <support@x>" -> "support@x")
// for the Reply-To / List-Unsubscribe headers.
function senderAddress(): string | null {
  const from = env.EMAIL_FROM ?? "";
  const match = from.match(/<([^>]+)>/);
  const address = match ? match[1] : from;
  return address.includes("@") ? address.trim() : null;
}

// Wrap a small HTML body fragment in a complete, well-formed, table-based email
// document. HTML-only bare fragments (no <html>/<body>, and no text/plain part)
// are a well-known spam signal; a valid document plus a plaintext alternative
// removes it. Inline styles only — email clients strip <style>/external CSS.
function renderEmailDocument(bodyHtml: string): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${SITE_NAME}</title>
</head>
<body style="margin:0;padding:24px 0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
<tr><td style="padding:20px 32px;background:#0f172a;color:#ffffff;font-size:18px;font-weight:700;">${SITE_NAME}</td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6;color:#111827;">${bodyHtml}</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #eef0f3;font-size:12px;line-height:1.5;color:#9ca3af;">Это автоматическое письмо от ${SITE_NAME}. Если вы его не запрашивали — просто проигнорируйте.<br>© ${year} ${SITE_NAME}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

let transporterPromise: Promise<Awaited<ReturnType<typeof createEmailTransporter>>> | null = null;

async function createEmailTransporter() {
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? {
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
          }
        }
      : {})
  });
}

async function getEmailTransporter() {
  if (!transporterPromise) {
    transporterPromise = createEmailTransporter();
  }

  return transporterPromise;
}

// Lightweight SMTP reachability probe for /api/health. Returns true only when the
// transport opens cleanly. EMAIL_DISABLED short-circuits with `true` so the health
// endpoint doesn't go red on test/staging where mail is intentionally off.
export async function pingSmtp(timeoutMs = 2_000): Promise<boolean> {
  if (!env.EMAIL_ENABLED) {
    return true;
  }
  try {
    const transporter = await getEmailTransporter();
    return await Promise.race([
      transporter.verify().then(() => true).catch(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs))
    ]);
  } catch {
    return false;
  }
}

async function sendEmailNotification(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!env.SMTP_HOST || !env.EMAIL_FROM) {
    return;
  }

  const replyTo = senderAddress();

  try {
    const transporter = await getEmailTransporter();

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      // Send BOTH a plaintext and an HTML part (multipart/alternative). The
      // plaintext alternative is what removes the biggest content spam signal.
      text: input.text,
      html: renderEmailDocument(input.html),
      ...(replyTo
        ? {
            replyTo,
            headers: {
              "List-Unsubscribe": `<mailto:${replyTo}?subject=unsubscribe>`
            }
          }
        : {})
    });
  } catch (error) {
    logger.error("notification.email_send_failed", {
      error: serializeError(error),
      smtpHost: env.SMTP_HOST,
      smtpPort: env.SMTP_PORT,
      subject: input.subject,
      to: input.to
    });
    throw error;
  }
}

async function sendTelegramNotification(message: string) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  const adminChats = env.ADMIN_EMAILS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await Promise.allSettled(
    adminChats.map((chatId) =>
      fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      })
    )
  );
}

export async function sendVerificationCode(email: string, code: string) {
  await sendEmailNotification({
    to: email,
    subject: `${SITE_NAME}: код подтверждения`,
    html: `
      <p style="margin:0 0 16px;">Ваш код подтверждения для регистрации:</p>
      <p style="margin:0 0 16px;letter-spacing:0.3em;font-size:2rem;font-weight:700;">${code}</p>
      <p style="margin:0;">Код действителен <strong>15 минут</strong>. Не сообщайте его никому.</p>
    `,
    text: `Ваш код подтверждения для регистрации: ${code}\n\nКод действителен 15 минут. Не сообщайте его никому.\n\n— ${SITE_NAME}`
  });
}

export async function sendPasswordResetCode(email: string, code: string) {
  await sendEmailNotification({
    to: email,
    subject: `${SITE_NAME}: сброс пароля`,
    html: `
      <p style="margin:0 0 16px;">Ваш код для сброса пароля:</p>
      <p style="margin:0 0 16px;letter-spacing:0.3em;font-size:2rem;font-weight:700;">${code}</p>
      <p style="margin:0;">Код действителен <strong>15 минут</strong>. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
    `,
    text: `Ваш код для сброса пароля: ${code}\n\nКод действителен 15 минут. Если вы не запрашивали сброс, проигнорируйте это письмо.\n\n— ${SITE_NAME}`
  });
}

export async function notifyPaymentSucceeded(input: {
  email: string;
  planName: string;
  expiresAt?: Date | null;
}) {
  const expiryText = input.expiresAt
    ? input.expiresAt.toLocaleString("ru-RU")
    : "будет доступна после синхронизации";

  await Promise.allSettled([
    sendEmailNotification({
      to: input.email,
      subject: "GickShop: подписка активирована",
      html: `<p style="margin:0 0 12px;">Подписка <strong>${input.planName}</strong> активирована.</p><p style="margin:0;">Действует до: ${expiryText}</p>`,
      text: `Подписка «${input.planName}» активирована.\nДействует до: ${expiryText}\n\n— ${SITE_NAME}`
    }),
    sendTelegramNotification(`GickShop: подписка ${input.planName} активирована для ${input.email}`)
  ]);
}

export async function notifySubscriptionExpired(input: {
  email: string;
  planName?: string | null;
}) {
  const planText = input.planName ? ` "${input.planName}"` : "";
  await Promise.allSettled([
    sendEmailNotification({
      to: input.email,
      subject: "GickShop: подписка истекла",
      html: `
        <p style="margin:0 0 12px;">Срок действия вашей подписки${planText} истёк.</p>
        <p style="margin:0;">Чтобы продолжить пользоваться сервисом, продлите её в личном кабинете:
          <a href="${env.NEXT_PUBLIC_SITE_URL}/dashboard/buy" style="color:#2563eb;">${env.NEXT_PUBLIC_SITE_URL}/dashboard/buy</a>.
        </p>
      `,
      text: `Срок действия вашей подписки${planText} истёк.\n\nЧтобы продолжить пользоваться сервисом, продлите её в личном кабинете:\n${env.NEXT_PUBLIC_SITE_URL}/dashboard/buy\n\n— ${SITE_NAME}`
    }),
    sendTelegramNotification(`GickShop: подписка${planText} истекла для ${input.email}`)
  ]);
}
