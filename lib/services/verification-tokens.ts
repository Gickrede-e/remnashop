import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma, toJsonValue } from "@/lib/prisma";
import { getMetrics } from "@/lib/server/metrics";
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
      data: data ? toJsonValue(data) : Prisma.JsonNull,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
    }
  });

  return code;
}

export class VerificationTokenExhaustedError extends Error {
  constructor(message = "Слишком много неверных попыток. Запросите новый код.") {
    super(message);
    this.name = "VerificationTokenExhaustedError";
  }
}

/**
 * Verifies the OTP code for the given email and type.
 * Atomically increments the per-token attempt counter; once attempts >= maxAttempts the
 * token is burned (usedAt set) so subsequent guesses are rejected immediately. Marks
 * the token as used on success and returns the stored payload.
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
    getMetrics().otpAttempts.inc({ type, outcome: "expired" });
    throw new Error("Код недействителен или истёк срок его действия");
  }

  // Atomically reserve an attempt — only succeeds when attempts < maxAttempts.
  const reserved = await prisma.verificationToken.updateMany({
    where: {
      id: token.id,
      usedAt: null,
      attempts: { lt: token.maxAttempts }
    },
    data: {
      attempts: { increment: 1 }
    }
  });

  if (reserved.count === 0) {
    // Already burned by a concurrent attempt; ensure it stays unusable.
    await prisma.verificationToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() }
    });
    getMetrics().otpAttempts.inc({ type, outcome: "exhausted" });
    getMetrics().otpExhausted.inc({ type });
    throw new VerificationTokenExhaustedError();
  }

  const valid = await bcrypt.compare(code, token.codeHash);
  if (!valid) {
    if (token.attempts + 1 >= token.maxAttempts) {
      // We just consumed the last allowed attempt — burn the token so further guesses
      // get the exhausted error instead of a generic "wrong code".
      await prisma.verificationToken.updateMany({
        where: { id: token.id, usedAt: null },
        data: { usedAt: new Date() }
      });
      getMetrics().otpAttempts.inc({ type, outcome: "exhausted" });
      getMetrics().otpExhausted.inc({ type });
      throw new VerificationTokenExhaustedError();
    }
    getMetrics().otpAttempts.inc({ type, outcome: "wrong_code" });
    throw new Error("Неверный код");
  }

  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() }
  });

  getMetrics().otpAttempts.inc({ type, outcome: "success" });
  return (token.data as Record<string, unknown>) ?? null;
}
