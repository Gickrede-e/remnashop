import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk, getClientIp, parseRequestBody } from "@/lib/http";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { createVerificationToken } from "@/lib/services/verification-tokens";
import { sendPasswordResetCode } from "@/lib/services/notifications";

const schema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    if (!env.EMAIL_ENABLED) {
      return apiError("Функция восстановления пароля недоступна", 503);
    }

    const body = await parseRequestBody(request, schema);

    enforceRateLimit({
      key: `forgot-password:${getClientIp(request) || "unknown"}`,
      max: 3,
      windowMs: 10 * 60_000
    });

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
    return apiError(error instanceof Error ? error.message : "Ошибка отправки кода");
  }
}
