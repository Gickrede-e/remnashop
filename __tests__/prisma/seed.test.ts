import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { disconnectMock, planUpsertMock, promoCodeUpsertMock, userUpsertMock } = vi.hoisted(() => ({
  planUpsertMock: vi.fn().mockResolvedValue(undefined),
  promoCodeUpsertMock: vi.fn().mockResolvedValue(undefined),
  userUpsertMock: vi.fn().mockResolvedValue(undefined),
  disconnectMock: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class PrismaPg {
    constructor() {}
  }
}));

vi.mock("@prisma/client", () => ({
  PromoCodeType: {
    DISCOUNT_PERCENT: "DISCOUNT_PERCENT"
  },
  Role: {
    USER: "USER",
    ADMIN: "ADMIN"
  },
  PrismaClient: class PrismaClient {
    plan = { upsert: planUpsertMock };
    promoCode = { upsert: promoCodeUpsertMock };
    user = { upsert: userUpsertMock };
    $disconnect = disconnectMock;
  }
}));

const originalEnv = { ...process.env };

function setProcessEnv(overrides: Record<string, string | undefined>) {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }

  const nextEnv: Record<string, string> = {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/gickvpn?schema=public",
    ADMIN_EMAILS: "admin@example.com"
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete nextEnv[key];
      continue;
    }

    nextEnv[key] = value;
  }

  Object.assign(process.env, nextEnv);
}

describe("prisma/seed", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }

    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("requires ADMIN_INITIAL_PASSWORD when admin seeding is enabled", async () => {
    setProcessEnv({
      ADMIN_INITIAL_PASSWORD: undefined
    });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit");
    }) as never);

    await expect(import("@/prisma/seed")).rejects.toThrow(/ADMIN_INITIAL_PASSWORD/);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(userUpsertMock).not.toHaveBeenCalled();
  });
});
