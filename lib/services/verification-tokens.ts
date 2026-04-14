import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { VerificationTokenType } from "@prisma/client";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Creates a 6-digit OTP for the given email and type.
 * Deletes any previous unused tokens for the same email+type first.
 * Returns the plain-text code to be sent in the email.
 */
export async function createVerificationToken(
  email: string,
  type: VerificationTokenType,
  data?: Record<string, unknown>
): Promise<string> {
  const normalised = email.toLowerCase();

  // Remove previous tokens for this email/type (cleanup)
  await prisma.verificationToken.deleteMany({
    where: { email: normalised, type, usedAt: null }
  });

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 8);

  await prisma.verificationToken.create({
    data: {
      email: normalised,
      codeHash,
      type,
      data: data ? (data as Prisma.InputJsonValue) : Prisma.JsonNull,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
    }
  });

  return code;
}

/**
 * Verifies the OTP code for the given email and type.
 * Marks the token as used on success.
 * Returns the stored `data` payload (or null if none), or throws on failure.
 */
export async function verifyVerificationToken(
  email: string,
  code: string,
  type: VerificationTokenType
): Promise<Record<string, unknown> | null> {
  const normalised = email.toLowerCase();

  const token = await prisma.verificationToken.findFirst({
    where: {
      email: normalised,
      type,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!token) {
    throw new Error("Код недействителен или истёк срок его действия");
  }

  const valid = await bcrypt.compare(code, token.codeHash);
  if (!valid) {
    throw new Error("Неверный код");
  }

  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() }
  });

  return (token.data as Record<string, unknown>) ?? null;
}
