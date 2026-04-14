import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { apiError, apiOk, getClientIp, parseRequestBody } from "@/lib/http";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { verifyVerificationToken } from "@/lib/services/verification-tokens";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8).max(128)
});

export async function POST(request: NextRequest) {
  try {
    if (!env.EMAIL_ENABLED) {
      return apiError("Функция восстановления пароля недоступна", 503);
    }

    const body = await parseRequestBody(request, schema);

    enforceRateLimit({
      key: `reset-password:${getClientIp(request) || "unknown"}`,
      max: 10,
      windowMs: 15 * 60_000
    });

    const email = body.email.toLowerCase();

    await verifyVerificationToken(email, body.code, "PASSWORD_RESET");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return apiError("Пользователь не найден");
    }

    const newHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });

    return apiOk({ message: "Пароль успешно изменён" });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return apiError("Слишком много попыток, попробуйте позже", 429);
    }
    return apiError(error instanceof Error ? error.message : "Не удалось сбросить пароль");
  }
}
