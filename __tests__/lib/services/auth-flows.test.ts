import { createHash, createHmac } from "node:crypto";

import { Role } from "@prisma/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockBcrypt,
  mockGetSession,
  mockPrisma,
  mockResolveRoleForEmail
} = vi.hoisted(() => ({
  mockBcrypt: {
    compare: vi.fn(),
    hash: vi.fn()
  },
  mockGetSession: vi.fn(),
  mockPrisma: {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  },
  mockResolveRoleForEmail: vi.fn()
}));

vi.mock("bcryptjs", () => ({
  default: mockBcrypt
}));

vi.mock("@/lib/auth/roles", () => ({
  resolveRoleForEmail: mockResolveRoleForEmail
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mockGetSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import {
  getCurrentUser,
  loginUser,
  loginWithTelegram,
  registerUser,
  verifyTelegramAuth
} from "@/lib/services/auth";

function buildTelegramHash(payload: Record<string, string>) {
  const secretKey = createHash("sha256")
    .update(process.env.TELEGRAM_BOT_TOKEN ?? "")
    .digest();

  const checkString = Object.entries(payload)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  return createHmac("sha256", secretKey).update(checkString).digest("hex");
}

describe("lib/services/auth flows", () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-02T00:00:00.000Z"));
    process.env.TELEGRAM_BOT_TOKEN = "telegram-bot-token";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
  });

  it("registers a user with normalized email and referral linkage", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "referrer-1" });
    mockBcrypt.hash.mockResolvedValue("hashed-password");
    mockResolveRoleForEmail.mockReturnValue(Role.ADMIN);
    mockPrisma.user.create.mockResolvedValue({ id: "user-1" });

    await expect(
      registerUser({
        email: "Admin@Example.com",
        password: "password123",
        referralCode: "REF123"
      })
    ).resolves.toEqual({ id: "user-1" });

    expect(mockPrisma.user.findUnique).toHaveBeenNthCalledWith(1, {
      where: { email: "admin@example.com" }
    });
    expect(mockPrisma.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { referralCode: "REF123" }
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "admin@example.com",
        passwordHash: "hashed-password",
        role: Role.ADMIN,
        referredById: "referrer-1"
      }
    });
  });

  it("rejects registration when the email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

    await expect(
      registerUser({
        email: "user@example.com",
        password: "password123"
      })
    ).rejects.toThrow("Пользователь с таким email уже существует");

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("registers without a referral link when no referral code is provided", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockBcrypt.hash.mockResolvedValue("hashed-password");
    mockResolveRoleForEmail.mockReturnValue(Role.USER);
    mockPrisma.user.create.mockResolvedValue({ id: "user-2" });

    await expect(
      registerUser({
        email: "user@example.com",
        password: "password123"
      })
    ).resolves.toEqual({ id: "user-2" });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "user@example.com",
        passwordHash: "hashed-password",
        role: Role.USER,
        referredById: null
      }
    });
  });

  it("updates the persisted role during login when env role has changed", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "stored-hash",
      role: Role.USER
    });
    mockBcrypt.compare.mockResolvedValue(true);
    mockResolveRoleForEmail.mockReturnValue(Role.ADMIN);
    mockPrisma.user.update.mockResolvedValue({ id: "user-1", role: Role.ADMIN });

    await expect(
      loginUser({
        email: "User@Example.com",
        password: "password123"
      })
    ).resolves.toEqual({
      id: "user-1",
      role: Role.ADMIN
    });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" }
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: Role.ADMIN }
    });
  });

  it("returns the existing user when the role is already up to date", async () => {
    const existingUser = {
      id: "user-1",
      email: "user@example.com",
      passwordHash: "stored-hash",
      role: Role.USER
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockResolveRoleForEmail.mockReturnValue(Role.USER);

    await expect(
      loginUser({
        email: "user@example.com",
        password: "password123"
      })
    ).resolves.toBe(existingUser);

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects login when the credentials are invalid", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "stored-hash",
      role: Role.USER
    });
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(
      loginUser({
        email: "user@example.com",
        password: "wrong-password"
      })
    ).rejects.toThrow("Неверный email или пароль");
  });

  it("rejects login when the user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      loginUser({
        email: "missing@example.com",
        password: "password123"
      })
    ).rejects.toThrow("Неверный email или пароль");

    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });

  it("returns false when Telegram auth payload has no hash", () => {
    expect(
      verifyTelegramAuth({
        auth_date: "1710000000",
        id: "123456"
      })
    ).toBe(false);
  });

  it("rejects stale Telegram logins before touching the database", async () => {
    await expect(
      loginWithTelegram({
        id: "123456",
        auth_date: `${Math.floor(Date.now() / 1000) - 60 * 60 * 25}`,
        hash: "invalid"
      })
    ).rejects.toThrow("Данные Telegram устарели");

    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("updates an existing Telegram-linked user after successful verification", async () => {
    const payload = {
      id: "123456",
      auth_date: `${Math.floor(Date.now() / 1000)}`,
      first_name: "Test",
      username: "tester"
    };

    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-telegram-1",
      email: "admin@example.com"
    });
    mockResolveRoleForEmail.mockReturnValue(Role.ADMIN);
    mockPrisma.user.update.mockResolvedValue({
      id: "user-telegram-1",
      email: "admin@example.com",
      telegramId: "123456",
      role: Role.ADMIN
    });

    await expect(
      loginWithTelegram({
        ...payload,
        hash: buildTelegramHash(payload)
      })
    ).resolves.toEqual({
      id: "user-telegram-1",
      email: "admin@example.com",
      telegramId: "123456",
      role: Role.ADMIN
    });

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ telegramId: "123456" }, { email: "123456@telegram.gickvpn.local" }]
      }
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-telegram-1" },
      data: {
        telegramId: "123456",
        email: "admin@example.com",
        role: Role.ADMIN
      }
    });
  });

  it("rejects Telegram login when signature verification fails", async () => {
    await expect(
      loginWithTelegram({
        id: "123456",
        auth_date: `${Math.floor(Date.now() / 1000)}`,
        first_name: "Test",
        username: "tester",
        hash: "bad-signature"
      })
    ).rejects.toThrow("Проверка Telegram не пройдена");

    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("creates a placeholder account for a new Telegram user", async () => {
    const payload = {
      id: "7890",
      auth_date: `${Math.floor(Date.now() / 1000)}`,
      first_name: "New",
      username: "new-user"
    };

    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockResolveRoleForEmail.mockReturnValue(Role.USER);
    mockBcrypt.hash.mockResolvedValue("hashed-random-password");
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("generated-uuid");
    mockPrisma.user.create.mockResolvedValue({
      id: "user-telegram-2",
      email: "7890@telegram.gickvpn.local",
      telegramId: "7890",
      role: Role.USER
    });

    await expect(
      loginWithTelegram({
        ...payload,
        hash: buildTelegramHash(payload)
      })
    ).resolves.toEqual({
      id: "user-telegram-2",
      email: "7890@telegram.gickvpn.local",
      telegramId: "7890",
      role: Role.USER
    });

    expect(mockBcrypt.hash).toHaveBeenCalledWith("generated-uuid", 12);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "7890@telegram.gickvpn.local",
        passwordHash: "hashed-random-password",
        telegramId: "7890",
        role: Role.USER
      }
    });
  });

  it("accepts Telegram auth timestamps that are exactly 24 hours old", async () => {
    const payload = {
      id: "9000",
      auth_date: `${Math.floor(Date.now() / 1000) - 60 * 60 * 24}`,
      first_name: "Exact",
      username: "exact-user"
    };

    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-telegram-3",
      email: "exact@example.com"
    });
    mockResolveRoleForEmail.mockReturnValue(Role.USER);
    mockPrisma.user.update.mockResolvedValue({
      id: "user-telegram-3",
      email: "exact@example.com",
      telegramId: "9000",
      role: Role.USER
    });

    await expect(
      loginWithTelegram({
        ...payload,
        hash: buildTelegramHash(payload)
      })
    ).resolves.toEqual({
      id: "user-telegram-3",
      email: "exact@example.com",
      telegramId: "9000",
      role: Role.USER
    });
  });

  it("accepts Telegram auth timestamps older than 24 seconds but newer than 24 hours", async () => {
    const payload = {
      id: "9001",
      auth_date: `${Math.floor(Date.now() / 1000) - 60 * 60}`,
      first_name: "HourOld",
      username: "hour-old"
    };

    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-telegram-4",
      email: "hourold@example.com"
    });
    mockResolveRoleForEmail.mockReturnValue(Role.USER);
    mockPrisma.user.update.mockResolvedValue({
      id: "user-telegram-4",
      email: "hourold@example.com",
      telegramId: "9001",
      role: Role.USER
    });

    await expect(
      loginWithTelegram({
        ...payload,
        hash: buildTelegramHash(payload)
      })
    ).resolves.toEqual({
      id: "user-telegram-4",
      email: "hourold@example.com",
      telegramId: "9001",
      role: Role.USER
    });
  });

  it("returns null for getCurrentUser without a session", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("loads the current user with the subscription relation when a session exists", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-42" });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-42" });

    await expect(getCurrentUser()).resolves.toEqual({ id: "user-42" });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-42" },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });
  });
});
