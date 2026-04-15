import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockRemnawave, mockGetPendingReferralBonuses, mockMarkReferralBonusesApplied } =
  vi.hoisted(() => ({
    mockPrisma: {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
      },
      subscription: {
        update: vi.fn()
      }
    },
    mockRemnawave: {
      createRemnawaveUser: vi.fn(),
      disableRemnawaveUser: vi.fn(),
      enableRemnawaveUser: vi.fn(),
      getRemnawaveUser: vi.fn(),
      getRemnawaveUserByUsername: vi.fn(),
      isRemnawaveNotFoundError: vi.fn(),
      isRemnawaveRecoverableIdentityError: vi.fn(),
      listRemnawaveUsersByEmail: vi.fn(),
      resetRemnawaveUserTraffic: vi.fn(),
      updateRemnawaveUser: vi.fn()
    },
    mockGetPendingReferralBonuses: vi.fn(),
    mockMarkReferralBonusesApplied: vi.fn()
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

vi.mock("@/lib/services/remnawave", () => mockRemnawave);

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: vi.fn()
}));

vi.mock("@/lib/services/notifications", () => ({
  notifyPaymentSucceeded: vi.fn()
}));

vi.mock("@/lib/services/promos", () => ({
  markPromoUsageSucceeded: vi.fn()
}));

vi.mock("@/lib/services/referrals", () => ({
  createReferralRewardForFirstPayment: vi.fn(),
  getPendingReferralBonuses: mockGetPendingReferralBonuses,
  markReferralBonusesApplied: mockMarkReferralBonusesApplied
}));

import { syncUserSubscription } from "@/lib/services/subscriptions";

describe("syncUserSubscription", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.user.update.mockReset();
    mockPrisma.subscription.update.mockReset();

    mockRemnawave.createRemnawaveUser.mockReset();
    mockRemnawave.disableRemnawaveUser.mockReset();
    mockRemnawave.enableRemnawaveUser.mockReset();
    mockRemnawave.getRemnawaveUser.mockReset();
    mockRemnawave.getRemnawaveUserByUsername.mockReset();
    mockRemnawave.isRemnawaveNotFoundError.mockReset();
    mockRemnawave.isRemnawaveRecoverableIdentityError.mockReset();
    mockRemnawave.listRemnawaveUsersByEmail.mockReset();
    mockRemnawave.resetRemnawaveUserTraffic.mockReset();
    mockRemnawave.updateRemnawaveUser.mockReset();
    mockGetPendingReferralBonuses.mockReset();
    mockMarkReferralBonusesApplied.mockReset();

    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.update.mockResolvedValue(undefined);
    mockPrisma.subscription.update.mockResolvedValue(undefined);
    mockGetPendingReferralBonuses.mockResolvedValue({
      bonusDays: 0,
      bonusTrafficGb: 0,
      rewards: []
    });
    mockMarkReferralBonusesApplied.mockResolvedValue({ count: 0 });
    mockRemnawave.isRemnawaveNotFoundError.mockReturnValue(false);
    mockRemnawave.isRemnawaveRecoverableIdentityError.mockImplementation(
      (error: unknown) => error instanceof Error && error.message === "not-found"
    );
  });

  it("skips direct remote lookup when the stored remnawaveUuid is malformed and recovers via gs username", async () => {
    const initialUser = {
      id: "user-1",
      email: "recover@example.com",
      remnawaveUuid: "stale-live-link",
      remnawaveUsername: "gs_recover",
      remnawaveShortUuid: null,
      subscription: {
        id: "sub-1",
        expiresAt: new Date("2026-04-25T12:00:00.000Z"),
        trafficLimitBytes: 161061273600n,
        trafficUsedBytes: 0n,
        plan: {
          name: "Про",
          slug: "pro",
          remnawaveInternalSquadUuids: [],
          remnawaveExternalSquadUuid: null,
          remnawaveHwidDeviceLimit: null
        }
      }
    };
    const finalUser = {
      ...initialUser,
      remnawaveUuid: "5c819239-dcd1-45a1-b4ca-c9c32b3e98e7",
      remnawaveShortUuid: "26R6187GqDtUaLyS"
    };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(initialUser)
      .mockResolvedValueOnce(initialUser)
      .mockResolvedValueOnce(finalUser);

    mockRemnawave.getRemnawaveUser.mockImplementation(async (uuid: string) => {
      if (uuid === "5c819239-dcd1-45a1-b4ca-c9c32b3e98e7") {
        return {
          uuid,
          username: "gs_recover",
          shortUuid: "26R6187GqDtUaLyS",
          status: "ACTIVE",
          expireAt: "2026-04-25T12:00:00.000Z",
          trafficLimitBytes: 161061273600,
          trafficUsedBytes: 0
        };
      }

      throw new Error(`unexpected getRemnawaveUser(${uuid})`);
    });
    mockRemnawave.getRemnawaveUserByUsername.mockResolvedValue({
      uuid: "5c819239-dcd1-45a1-b4ca-c9c32b3e98e7",
      username: "gs_recover",
      email: "recover@example.com"
    });
    mockRemnawave.listRemnawaveUsersByEmail.mockResolvedValue([
      {
        uuid: "5c819239-dcd1-45a1-b4ca-c9c32b3e98e7",
        username: "gs_recover",
        email: "recover@example.com"
      }
    ]);

    const result = await syncUserSubscription("user-1");

    expect(mockRemnawave.getRemnawaveUser).not.toHaveBeenCalledWith("stale-live-link");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        remnawaveUuid: "5c819239-dcd1-45a1-b4ca-c9c32b3e98e7",
        remnawaveUsername: "gs_recover",
        remnawaveShortUuid: "26R6187GqDtUaLyS"
      }
    });
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        status: "ACTIVE",
        remnawaveLastSyncAt: expect.any(Date)
      })
    });
    expect(result).toEqual(finalUser);
  });

  it("recovers malformed remnawaveUuid links even when the active subscription has no expiresAt", async () => {
    const initialUser = {
      id: "user-2",
      email: "no-expiry@example.com",
      remnawaveUuid: "stale-no-expiry-link",
      remnawaveUsername: "gs_no_expiry",
      remnawaveShortUuid: null,
      subscription: {
        id: "sub-2",
        expiresAt: null,
        trafficLimitBytes: 161061273600n,
        trafficUsedBytes: 0n,
        plan: {
          name: "Про",
          slug: "pro",
          remnawaveInternalSquadUuids: [],
          remnawaveExternalSquadUuid: null,
          remnawaveHwidDeviceLimit: null
        }
      }
    };
    const finalUser = {
      ...initialUser,
      remnawaveUuid: "6c819239-dcd1-45a1-b4ca-c9c32b3e98e8",
      remnawaveShortUuid: "short-no-expiry"
    };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(initialUser)
      .mockResolvedValueOnce(initialUser)
      .mockResolvedValueOnce(finalUser);

    mockRemnawave.getRemnawaveUser.mockImplementation(async (uuid: string) => {
      if (uuid === "6c819239-dcd1-45a1-b4ca-c9c32b3e98e8") {
        return {
          uuid,
          username: "gs_no_expiry",
          shortUuid: "short-no-expiry",
          status: "ACTIVE",
          expireAt: null,
          trafficLimitBytes: 161061273600,
          trafficUsedBytes: 0
        };
      }

      throw new Error(`unexpected getRemnawaveUser(${uuid})`);
    });
    mockRemnawave.getRemnawaveUserByUsername.mockResolvedValue({
      uuid: "6c819239-dcd1-45a1-b4ca-c9c32b3e98e8",
      username: "gs_no_expiry",
      email: "no-expiry@example.com"
    });
    mockRemnawave.listRemnawaveUsersByEmail.mockResolvedValue([
      {
        uuid: "6c819239-dcd1-45a1-b4ca-c9c32b3e98e8",
        username: "gs_no_expiry",
        email: "no-expiry@example.com"
      }
    ]);

    const result = await syncUserSubscription("user-2");

    expect(mockRemnawave.getRemnawaveUser).not.toHaveBeenCalledWith("stale-no-expiry-link");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: {
        remnawaveUuid: "6c819239-dcd1-45a1-b4ca-c9c32b3e98e8",
        remnawaveUsername: "gs_no_expiry",
        remnawaveShortUuid: "short-no-expiry"
      }
    });
    expect(result).toEqual(finalUser);
  });
});
