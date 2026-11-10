import { SubscriptionStatus } from "@prisma/client";
import type { z } from "zod";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { emailBroadcastSchema } from "@/lib/schemas/admin";
import { sendBroadcastEmail } from "@/lib/services/notifications";

// Spaces out a mass send a little so receiving providers don't see one burst from our IP.
const SEND_PAUSE_MS = 100;

type EmailBroadcastInput = z.infer<typeof emailBroadcastSchema>;

// shortcut: a per-process flag, so it only blocks a parallel broadcast within one app container;
// move it to a database lock if the app ever runs more than one instance.
let isBroadcastRunning = false;

function activeSubscriptionFilter() {
  return {
    subscription: {
      is: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { gt: new Date() }
      }
    }
  };
}

export async function getEmailBroadcastAudienceCounts() {
  const [all, active] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: activeSubscriptionFilter() })
  ]);
  return { all, active };
}

export async function sendEmailBroadcast(input: EmailBroadcastInput) {
  if (!env.EMAIL_ENABLED) {
    throw new Error("Отправка почты отключена на сервере (EMAIL_ENABLED)");
  }
  if (isBroadcastRunning) {
    throw new Error("Рассылка уже идёт, дождитесь её окончания");
  }

  isBroadcastRunning = true;
  try {
    const recipients = await listRecipientEmails(input);
    const failedEmails: string[] = [];

    for (const [index, email] of recipients.entries()) {
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, SEND_PAUSE_MS));
      }
      try {
        await sendBroadcastEmail({ to: email, subject: input.subject, text: input.text });
      } catch {
        // sendBroadcastEmail already logged the SMTP error; one bad address must not stop the rest.
        failedEmails.push(email);
      }
    }

    return {
      total: recipients.length,
      sent: recipients.length - failedEmails.length,
      failed: failedEmails.length,
      failedEmails
    };
  } finally {
    isBroadcastRunning = false;
  }
}

async function listRecipientEmails(input: EmailBroadcastInput) {
  if (input.audience === "ONE") {
    return [input.email];
  }

  const users = await prisma.user.findMany({
    where: input.audience === "ACTIVE" ? activeSubscriptionFilter() : {},
    select: { email: true },
    orderBy: { createdAt: "asc" }
  });
  return users.map((user) => user.email);
}
