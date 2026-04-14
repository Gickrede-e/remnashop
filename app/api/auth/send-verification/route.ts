import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { apiError, apiOk, getClientIp, parseRequestBody } from "@/lib/http";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { createVerificationToken } from "@/lib/services/verification-tokens";
import { sendVerificationCode } from "@/lib/services/notifications";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  referralCode: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    if (!env.EMAIL_ENABLED) {
      return apiError("Подтверждение email недоступно", 503);
    }

    const body = await parseRequestBody(request, schema);

    enforceRateLimit({
      key: `send-verification:${getClientIp(request) || "unknown"}`,
      max: 5,
      windowMs: 10 * 60_000
    });

    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("Пользователь с таким email уже существует");
    }

    // Hash the password now; store it in the token until verification completes
    const passwordHash = await bcrypt.hash(body.password, 12);

    const code = await createVerificationToken(email, "REGISTRATION", {
      passwordHash,
      referralCode: body.referralCode ?? null
    });

    await sendVerificationCode(email, code);

    return apiOk({ message: "Код отправлен на почту" });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return apiError("Слишком много попыток, попробуйте позже", 429);
    }
    return apiError(error instanceof Error ? error.message : "Ошибка отправки кода");
  }
}
