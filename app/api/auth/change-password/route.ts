import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

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
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });

    return apiOk({ message: "Пароль изменён" });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось изменить пароль");
  }
}
