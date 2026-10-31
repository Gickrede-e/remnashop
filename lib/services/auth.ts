import bcrypt from "bcryptjs";

import { resolveRoleForEmail } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

async function resolveReferrer(input: { email: string; referralCode?: string }) {
  if (!input.referralCode) {
    return null;
  }
  const referredBy = await prisma.user.findUnique({
    where: { referralCode: input.referralCode }
  });
  // Self-referral guard: the referrer's email cannot match the registering user's email.
  if (!referredBy || referredBy.email.toLowerCase() === input.email.toLowerCase()) {
    return null;
  }
  return referredBy;
}

export async function registerUser(input: {
  email: string;
  password: string;
  referralCode?: string;
}) {
  const email = input.email.toLowerCase();
  // No email code proves ownership on this path, so ADMIN_EMAILS addresses can't be claimed here.
  if (resolveRoleForEmail(email) === "ADMIN") {
    throw new Error("Регистрация с этим email недоступна");
  }

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    throw new Error("Пользователь с таким email уже существует");
  }

  const referredBy = await resolveReferrer({ email, referralCode: input.referralCode });

  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: resolveRoleForEmail(email),
      referredById: referredBy?.id ?? null
    }
  });
}

/**
 * Creates a user using a pre-computed bcrypt password hash.
 * Used in the OTP registration flow where the hash was stored in the verification token.
 */
export async function registerUserWithHash(input: {
  email: string;
  passwordHash: string;
  referralCode?: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new Error("Пользователь с таким email уже существует");
  }

  const referredBy = await resolveReferrer({ email, referralCode: input.referralCode });

  return prisma.user.create({
    data: {
      email,
      passwordHash: input.passwordHash,
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
