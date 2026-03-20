import { createHash, createHmac } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {}
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import { verifyTelegramAuth } from "@/lib/services/auth";

function buildTelegramHash(payload: Record<string, string>) {
  const secretKey = createHash("sha256")
    .update(process.env.TELEGRAM_BOT_TOKEN ?? "")
    .digest();
  const checkString = Object.entries(payload)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  return createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");
}

describe("verifyTelegramAuth", () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "telegram-bot-token";
  });

  afterAll(() => {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
  });

  it("accepts a valid Telegram payload", () => {
    const payload = {
      auth_date: "1710000000",
      first_name: "Test",
      id: "123456",
      username: "tester"
    };

    expect(verifyTelegramAuth({
      ...payload,
      hash: buildTelegramHash(payload)
    })).toBe(true);
  });

  it("rejects invalid hashes without throwing on mismatched length", () => {
    const payload = {
      auth_date: "1710000000",
      id: "123456"
    };

    expect(verifyTelegramAuth({
      ...payload,
      hash: "short"
    })).toBe(false);
  });
});
