import { Role } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetAdminEmails, mockPrisma } = vi.hoisted(() => ({
  mockGetAdminEmails: vi.fn(),
  mockPrisma: {
    user: {
      updateMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/env", () => ({
  getAdminEmails: mockGetAdminEmails
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import { resolveRoleForEmail, syncAdminRolesFromEnv } from "@/lib/auth/roles";

describe("lib/auth/roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves admin emails case-insensitively", () => {
    mockGetAdminEmails.mockReturnValue(["admin@example.com"]);

    expect(resolveRoleForEmail("Admin@Example.com")).toBe(Role.ADMIN);
    expect(resolveRoleForEmail("user@example.com")).toBe(Role.USER);
  });

  it("promotes configured admins and demotes outdated roles", async () => {
    mockGetAdminEmails.mockReturnValue(["admin@example.com"]);
    mockPrisma.user.updateMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(syncAdminRolesFromEnv()).resolves.toEqual({
      adminEmails: ["admin@example.com"],
      promotedCount: 2,
      demotedCount: 1
    });

    expect(mockPrisma.user.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        email: { in: ["admin@example.com"] },
        role: { not: Role.ADMIN }
      },
      data: { role: Role.ADMIN }
    });
    expect(mockPrisma.user.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        email: { notIn: ["admin@example.com"] },
        role: { not: Role.USER }
      },
      data: { role: Role.USER }
    });
  });

  it("skips promotion when admin env is empty and demotes all non-users", async () => {
    mockGetAdminEmails.mockReturnValue([]);
    mockPrisma.user.updateMany.mockResolvedValueOnce({ count: 4 });

    await expect(syncAdminRolesFromEnv()).resolves.toEqual({
      adminEmails: [],
      promotedCount: 0,
      demotedCount: 4
    });

    expect(mockPrisma.user.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        role: { not: Role.USER }
      },
      data: { role: Role.USER }
    });
  });
});
