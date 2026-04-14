import { env } from "@/lib/env";

const SITE_NAME = env.NEXT_PUBLIC_SITE_NAME;

let transporterPromise: Promise<Awaited<ReturnType<typeof createEmailTransporter>>> | null = null;

async function createEmailTransporter() {
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
}

async function getEmailTransporter() {
  if (!transporterPromise) {
    transporterPromise = createEmailTransporter();
  }

  return transporterPromise;
}

async function sendEmailNotification(input: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.EMAIL_FROM) {
    return;
  }

  const transporter = await getEmailTransporter();

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html
  });
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
