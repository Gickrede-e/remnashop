import { type NextRequest } from "next/server";

import { apiError, apiOk, getClientIp, parseRequestBody } from "@/lib/http";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { createVerificationToken } from "@/lib/services/verification-tokens";
import { sendPasswordResetCode } from "@/lib/services/notifications";
import { TurnstileError, verifyTurnstileToken } from "@/lib/services/turnstile";

export async function POST(request: NextRequest) {
  try {
    if (!env.EMAIL_ENABLED) {
      return apiError("Функция восстановления пароля недоступна", 503);
    }

    const body = await parseRequestBody(request, forgotPasswordSchema);

    enforceRateLimit({
      key: `forgot-password:${getClientIp(request) || "unknown"}`,
      max: 3,
      windowMs: 10 * 60_000
    });

    // Bots otherwise burn SMTP quota by spamming password-reset codes for harvested emails.
    await verifyTurnstileToken(body.cfTurnstileToken, getClientIp(request));

    const email = body.email.toLowerCase();

    // Always return success to avoid user enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const code = await createVerificationToken(email, "PASSWORD_RESET");
      await sendPasswordResetCode(email, code);
    }

    return apiOk({ message: "Если аккаунт существует, код отправлен на почту" });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return apiError("Слишком много попыток, попробуйте позже", 429);
    }
    if (error instanceof TurnstileError) {
      return apiError(error.message, 400);
    }
    return apiError(error instanceof Error ? error.message : "Ошибка отправки кода");
  }
}
