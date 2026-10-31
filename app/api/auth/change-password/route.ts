import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getSession, issueSessionCookie } from "@/lib/auth/session";
import { apiError, apiErrorFrom, apiOk, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Необходима авторизация", 401);
    }

    try {
      enforceRateLimit({
        key: `change-password:${session.userId}`,
        max: 5,
        windowMs: 60 * 60 * 1000
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return apiError("Слишком много попыток смены пароля. Попробуйте через час.", 429);
      }
      throw error;
    }

    const body = await parseRequestBody(request, changePasswordSchema);

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return apiError("Пользователь не найден", 404);
    }

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      return apiError("Неверный текущий пароль");
    }

    const newHash = await bcrypt.hash(body.newPassword, 12);
    // Bump sessionVersion so every previously-issued session token is revoked
    // (a stolen cookie stops working the moment the password changes), then
    // re-issue THIS caller's cookie at the new version so they stay logged in.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, sessionVersion: { increment: 1 } },
      select: { id: true, email: true, role: true, sessionVersion: true }
    });

    await issueSessionCookie(updated);

    return apiOk({ message: "Пароль изменён" });
  } catch (error) {
    return apiErrorFrom(error, "Не удалось изменить пароль");
  }
}
