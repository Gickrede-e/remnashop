import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";

import { resolveRoleForEmail } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function registerUser(input: {
  email: string;
  password: string;
  referralCode?: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    throw new Error("Пользователь с таким email уже существует");
  }

  const referredBy = input.referralCode
    ? await prisma.user.findUnique({
        where: { referralCode: input.referralCode }
      })
    : null;

  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: resolveRoleForEmail(email),
      referredById: referredBy?.id ?? null
    }
  });
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
  });

  if (!user) {
    throw new Error("Неверный email или пароль");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new Error("Неверный email или пароль");
  }

  const role = resolveRoleForEmail(user.email);
  if (role !== user.role) {
    return prisma.user.update({
      where: { id: user.id },
      data: { role }
    });
  }

  return user;
}

export function verifyTelegramAuth(payload: Record<string, string>) {
  const hash = payload.hash;
  if (!hash) {
    return false;
  }

  const secretKey = createHash("sha256")
    .update(process.env.TELEGRAM_BOT_TOKEN ?? "")
    .digest();

  const checkString = Object.entries(payload)
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const digest = createHmac("sha256", secretKey).update(checkString).digest("hex");
  if (digest.length !== hash.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(digest), Buffer.from(hash));
}

export async function loginWithTelegram(input: {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  auth_date: string;
  hash: string;
}) {
  const authTimestamp = Number(input.auth_date);
  if (Number.isNaN(authTimestamp) || Date.now() / 1000 - authTimestamp > 60 * 60 * 24) {
    throw new Error("Данные Telegram устарели");
  }

  const asStrings = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value ? String(value) : ""])
  );

  if (!verifyTelegramAuth(asStrings)) {
    throw new Error("Проверка Telegram не пройдена");
  }

  const placeholderEmail = `${input.id}@telegram.gickvpn.local`;
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ telegramId: input.id }, { email: placeholderEmail }]
    }
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        telegramId: input.id,
        email: existing.email,
        role: resolveRoleForEmail(existing.email)
      }
    });
  }

  return prisma.user.create({
    data: {
      email: placeholderEmail,
      passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
      telegramId: input.id,
      role: resolveRoleForEmail(placeholderEmail)
    }
  });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: {
          plan: true
        }
      }
    }
  });
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  return getUserById(session.userId);
}
