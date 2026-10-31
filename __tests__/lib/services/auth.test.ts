import { afterEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn()
}));

async function loadRegisterUser(adminEmails: string) {
  vi.resetModules();
  vi.stubEnv("ADMIN_EMAILS", adminEmails);
  return (await import("@/lib/services/auth")).registerUser;
}

describe("registerUser", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses an ADMIN_EMAILS address because nothing proves the caller owns it", async () => {
    const registerUser = await loadRegisterUser("owner@shop.test,support@shop.test");

    const attempt = registerUser({ email: "Support@Shop.test", password: "attacker-password" });

    await expect(attempt).rejects.toThrow();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("registers an address that is not on the admin list as a regular user", async () => {
    const registerUser = await loadRegisterUser("owner@shop.test");

    await registerUser({ email: "customer@shop.test", password: "customer-password" });

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "customer@shop.test", role: "USER" })
    });
  });
});
