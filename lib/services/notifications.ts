import { env } from "@/lib/env";
import { logger, serializeError } from "@/lib/server/logger";

const SITE_NAME = env.NEXT_PUBLIC_SITE_NAME;

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
}) {
  if (!env.SMTP_HOST || !env.EMAIL_FROM) {
    return;
  }

  try {
    const transporter = await getEmailTransporter();

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html
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
      <p>Ваш код подтверждения для регистрации:</p>
      <h2 style="letter-spacing:0.3em;font-size:2rem;">${code}</h2>
      <p>Код действителен <strong>15 минут</strong>. Не сообщайте его никому.</p>
    `
  });
}

export async function sendPasswordResetCode(email: string, code: string) {
  await sendEmailNotification({
    to: email,
    subject: `${SITE_NAME}: сброс пароля`,
    html: `
      <p>Ваш код для сброса пароля:</p>
      <h2 style="letter-spacing:0.3em;font-size:2rem;">${code}</h2>
      <p>Код действителен <strong>15 минут</strong>. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
    `
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
      html: `<p>Подписка <strong>${input.planName}</strong> активирована.</p><p>Действует до: ${expiryText}</p>`
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
        <p>Срок действия вашей подписки${planText} истёк.</p>
        <p>Чтобы продолжить пользоваться сервисом, продлите её в личном кабинете:
          <a href="${env.NEXT_PUBLIC_SITE_URL}/dashboard/buy">${env.NEXT_PUBLIC_SITE_URL}/dashboard/buy</a>.
        </p>
      `
    }),
    sendTelegramNotification(`GickShop: подписка${planText} истекла для ${input.email}`)
  ]);
}
