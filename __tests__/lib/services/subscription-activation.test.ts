import { SubscriptionStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gbToBytes } from "@/lib/utils";

const { mockPrisma, mockRemnawave, mockLogAdminAction } = vi.hoisted(() => {
  const prisma = {
    payment: { findFirst: vi.fn() },
    subscription: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    plan: { findUnique: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma))
  };
  return {
    mockPrisma: prisma,
    mockRemnawave: {
      createRemnawaveUser: vi.fn(),
      getRemnawaveUser: vi.fn(),
      getRemnawaveUserByUsername: vi.fn(),
      isRemnawaveNotFoundError: vi.fn(),
      resetRemnawaveUserTraffic: vi.fn(),
      listRemnawaveUsersByEmail: vi.fn(),
      updateRemnawaveUser: vi.fn(),
      isRemnawaveRecoverableIdentityError: vi.fn()
    },
    mockLogAdminAction: vi.fn()
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/services/remnawave", () => mockRemnawave);
vi.mock("@/lib/services/admin-logs", () => ({ logAdminAction: mockLogAdminAction }));

import { grantSubscriptionByAdmin } from "@/lib/services/subscriptions";

describe("admin subscription grants", () => {
  const now = new Date("2026-04-12T12:00:00.000Z");
  const linkedUuid = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.$executeRaw.mockResolvedValue(1);
    mockPrisma.subscription.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "sub-1", ...data
    }));
    mockPrisma.subscription.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "sub-1", ...data
    }));
    mockPrisma.user.update.mockResolvedValue(undefined);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockRemnawave.getRemnawaveUser.mockResolvedValue({
      uuid: linkedUuid, username: "gs_user", shortUuid: "short-1", status: "ACTIVE"
    });
    mockRemnawave.resetRemnawaveUserTraffic.mockResolvedValue(undefined);
    mockRemnawave.getRemnawaveUserByUsername.mockRejectedValue(new Error("not-found"));
    mockRemnawave.isRemnawaveNotFoundError.mockImplementation(
      (error: unknown) => error instanceof Error && error.message === "not-found"
    );
    mockRemnawave.listRemnawaveUsersByEmail.mockResolvedValue([]);
    mockRemnawave.updateRemnawaveUser.mockImplementation(async (_uuid: string, input: Record<string, unknown>) => ({
      uuid: linkedUuid, username: "gs_user", shortUuid: "short-1", ...input
    }));
  });

  afterEach(() => vi.useRealTimers());

  it("extends an active admin-granted subscription but resets traffic instead of accumulating it", async () => {
    const currentExpiresAt = new Date("2026-05-05T12:00:00.000Z");
    const expectedExpiresAt = new Date(currentExpiresAt.getTime() + 14 * 86400000);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      remnawaveUuid: linkedUuid,
      remnawaveUsername: "gs_user",
      remnawaveShortUuid: "short-1"
    });
    mockPrisma.plan.findUnique.mockResolvedValue({
      id: "plan-1",
      name: "Business",
      slug: "business",
      durationDays: 14,
      trafficGB: 80,
      remnawaveInternalSquadUuids: [],
      remnawaveExternalSquadUuid: null,
      remnawaveHwidDeviceLimit: null
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      status: SubscriptionStatus.ACTIVE,
      startsAt: new Date("2026-04-20T12:00:00.000Z"),
      expiresAt: currentExpiresAt,
      trafficLimitBytes: gbToBytes(200),
      trafficUsedBytes: gbToBytes(35)
    });

    mockPrisma.$executeRaw.mockImplementationOnce(async () => {
      expect(mockPrisma.subscription.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      return 1;
    });

    await grantSubscriptionByAdmin({
      adminId: "admin-1",
      userId: "user-1",
      planId: "plan-1"
    });

    expect(mockRemnawave.resetRemnawaveUserTraffic).toHaveBeenCalledWith(linkedUuid);
    expect(mockRemnawave.updateRemnawaveUser).toHaveBeenCalledWith(
      linkedUuid,
      expect.objectContaining({
        expireAt: expectedExpiresAt.toISOString(),
        trafficLimitBytes: Number(gbToBytes(80))
      })
    );
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({
          expiresAt: expectedExpiresAt,
          trafficLimitBytes: gbToBytes(80),
          trafficUsedBytes: BigInt(0)
        })
      })
    );
  });

  it("stops before the remote update or local subscription write when traffic reset fails", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      remnawaveUuid: linkedUuid,
      remnawaveUsername: "gs_user",
      remnawaveShortUuid: "short-1"
    });
    mockPrisma.plan.findUnique.mockResolvedValue({
      id: "plan-1",
      name: "Business",
      slug: "business",
      durationDays: 14,
      trafficGB: 80,
      remnawaveInternalSquadUuids: [],
      remnawaveExternalSquadUuid: null,
      remnawaveHwidDeviceLimit: null
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      status: SubscriptionStatus.ACTIVE,
      startsAt: now,
      expiresAt: new Date("2026-05-05T12:00:00.000Z"),
      trafficLimitBytes: gbToBytes(80),
      trafficUsedBytes: BigInt(0)
    });
    mockRemnawave.resetRemnawaveUserTraffic.mockRejectedValue(new Error("reset failed"));

    await expect(grantSubscriptionByAdmin({
      adminId: "admin-1",
      userId: "user-1",
      planId: "plan-1"
    })).rejects.toThrow("reset failed");

    expect(mockRemnawave.updateRemnawaveUser).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it("does not reset traffic when a grant creates the remote identity", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      remnawaveUuid: null,
      remnawaveUsername: null,
      remnawaveShortUuid: null
    });
    mockPrisma.plan.findUnique.mockResolvedValue({
      id: "plan-1",
      name: "Business",
      slug: "business",
      durationDays: 14,
      trafficGB: 80,
      remnawaveInternalSquadUuids: [],
      remnawaveExternalSquadUuid: null,
      remnawaveHwidDeviceLimit: null
    });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockRemnawave.createRemnawaveUser.mockResolvedValue({
      uuid: "created-remote",
      username: "gs_created",
      shortUuid: "short-created"
    });

    await grantSubscriptionByAdmin({
      adminId: "admin-1",
      userId: "user-1",
      planId: "plan-1"
    });

    expect(mockRemnawave.resetRemnawaveUserTraffic).not.toHaveBeenCalled();
  });

  it("does not change entitlement while a confirmed payment still needs activation", async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({ id: "failed-payment" });

    await expect(grantSubscriptionByAdmin({
      adminId: "admin-1", userId: "user-1", planId: "plan-1"
    })).rejects.toThrow("Сначала завершите активацию оплаченной подписки пользователя");

    expect(mockRemnawave.getRemnawaveUser).not.toHaveBeenCalled();
    expect(mockRemnawave.resetRemnawaveUserTraffic).not.toHaveBeenCalled();
    expect(mockRemnawave.updateRemnawaveUser).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});
