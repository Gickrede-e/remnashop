import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

type FakeToken = {
  id: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  usedAt: Date | null;
  expiresAt: Date;
  data: Record<string, unknown> | null;
};

type TokenWhere = { usedAt?: null; attempts?: { lt: number } };
type TokenData = { attempts?: { increment: number }; usedAt?: Date };

// Plain functions, not vi.fn: the config resets mocks before each test, and this fake must keep its logic.
const { store, mockPrisma } = vi.hoisted(() => {
  const store: { token: FakeToken | null } = { token: null };
  const mockPrisma = {
    verificationToken: {
      async findFirst() {
        const token = store.token;
        return token && token.usedAt === null && token.expiresAt > new Date() ? { ...token } : null;
      },
      async updateMany({ where, data }: { where: TokenWhere; data: TokenData }) {
        const token = store.token;
        const isBlocked =
          !token ||
          (where.usedAt === null && token.usedAt !== null) ||
          (where.attempts !== undefined && token.attempts >= where.attempts.lt);
        if (isBlocked) {
          return { count: 0 };
        }
        token.attempts += data.attempts?.increment ?? 0;
        token.usedAt = data.usedAt ?? token.usedAt;
        return { count: 1 };
      },
      async update({ data }: { data: TokenData }) {
        store.token!.usedAt = data.usedAt ?? null;
        return store.token;
      }
    }
  };
  return { store, mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
  toJsonValue: (value: unknown) => value
}));

vi.mock("@/lib/server/metrics", () => ({
  getMetrics: () => ({
    otpAttempts: { inc: () => undefined },
    otpExhausted: { inc: () => undefined }
  })
}));

import { verifyVerificationToken } from "@/lib/services/verification-tokens";

const RIGHT_CODE = "123456";
const WRONG_CODE = "000000";
const EMAIL = "user@shop.test";

async function seedToken(maxAttempts: number) {
  store.token = {
    id: "token-1",
    codeHash: await bcrypt.hash(RIGHT_CODE, 4),
    attempts: 0,
    maxAttempts,
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    data: { passwordHash: "stored-hash" }
  };
}

async function guessWrong(times: number) {
  for (let guess = 0; guess < times; guess += 1) {
    await expect(verifyVerificationToken(EMAIL, WRONG_CODE, "PASSWORD_RESET")).rejects.toThrow();
  }
}

describe("verifyVerificationToken", () => {
  it("accepts the right code after fewer wrong guesses than the limit", async () => {
    await seedToken(3);
    await guessWrong(2);

    const data = await verifyVerificationToken(EMAIL, RIGHT_CODE, "PASSWORD_RESET");

    expect(data).toEqual({ passwordHash: "stored-hash" });
  });

  it("refuses even the right code once the wrong guesses reach the limit", async () => {
    await seedToken(3);
    await guessWrong(3);

    const attempt = verifyVerificationToken(EMAIL, RIGHT_CODE, "PASSWORD_RESET");

    await expect(attempt).rejects.toThrow();
    expect(store.token?.usedAt).not.toBeNull();
  });
});
