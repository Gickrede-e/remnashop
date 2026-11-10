import { env } from "@/lib/env";
import { logger, serializeError } from "@/lib/server/logger";
import { splitParagraphs } from "@/lib/utils";

const SITE_NAME = env.NEXT_PUBLIC_SITE_NAME;
const MONO_FONT = "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace";
const CODE_STYLE = `display:inline-block;margin:0 0 16px;padding:8px 14px;border-radius:10px;background:#e7f9ee;color:#0a0a0a;font-family:${MONO_FONT};font-size:2rem;letter-spacing:0.3em;`;
const BUTTON_STYLE = `display:inline-block;padding:12px 24px;border-radius:999px;background:#66e08a;color:#0a0a0a;font-family:${MONO_FONT};font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;`;

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
function renderEmailDocument(
  bodyHtml: string,
  footerHtml = `Это автоматическое письмо от ${SITE_NAME}. Если вы его не запрашивали — просто проигнорируйте.`
): string {
  const year = new Date().getFullYear();
  // Site palette and logo (app/globals.css, components/shared/logo.tsx) in the header, on a light card, which
  // renders the same in every client, unlike a fully dark email that some clients recolor.
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${SITE_NAME}</title>
</head>
<body style="margin:0;padding:24px 0;background:#f3efe7;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3efe7" style="border-collapse:collapse;background:#f3efe7;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;border-collapse:separate;background:#ffffff;border:1px solid #e4ddd0;border-radius:16px;overflow:hidden;">
<tr><td bgcolor="#0a0a0a" style="padding:18px 32px;background:#0a0a0a;color:#f3efe6;font-size:21px;font-weight:700;letter-spacing:-0.02em;">${SITE_NAME.toLowerCase()}<span style="color:#66e08a;font-size:17px;">&#9608;</span></td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6;color:#1a1a1a;">${bodyHtml}</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #eee7da;font-size:12px;line-height:1.5;color:#8c8578;">${footerHtml}<br>© ${year} ${SITE_NAME}</td></tr>
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
  footerHtml?: string;
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
      html: renderEmailDocument(input.html, input.footerHtml),
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
      <p style="${CODE_STYLE}">${code}</p>
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
      <p style="${CODE_STYLE}">${code}</p>
      <p style="margin:0;">Код действителен <strong>15 минут</strong>. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
    `,
    text: `Ваш код для сброса пароля: ${code}\n\nКод действителен 15 минут. Если вы не запрашивали сброс, проигнорируйте это письмо.\n\n— ${SITE_NAME}`
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Admin broadcasts are plain text written in the admin panel, so escape it before it goes into HTML.
export async function sendBroadcastEmail(input: { to: string; subject: string; text: string }) {
  const html = splitParagraphs(input.text)
    .map((paragraph) => `<p style="margin:0 0 12px;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

  await sendEmailNotification({
    to: input.to,
    subject: input.subject,
    html,
    text: `${input.text}\n\n— ${SITE_NAME}`,
    footerHtml: `Вы получили это письмо, потому что зарегистрированы на ${SITE_NAME}.`
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
        <p style="margin:0 0 20px;">Чтобы продолжить пользоваться сервисом, продлите её в личном кабинете.</p>
        <a href="${env.NEXT_PUBLIC_SITE_URL}/dashboard/buy" style="${BUTTON_STYLE}">Продлить подписку</a>
      `,
      text: `Срок действия вашей подписки${planText} истёк.\n\nЧтобы продолжить пользоваться сервисом, продлите её в личном кабинете:\n${env.NEXT_PUBLIC_SITE_URL}/dashboard/buy\n\n— ${SITE_NAME}`
    }),
    sendTelegramNotification(`GickShop: подписка${planText} истекла для ${input.email}`)
  ]);
}
