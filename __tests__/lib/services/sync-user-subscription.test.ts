import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, mockPrisma, mockRemnawave } = vi.hoisted(() => ({
  mockEnv: {
    REMNAWAVE_BASE_URL: "https://panel.example.com"
  },
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
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
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
  createReferralRewardForFirstPayment: vi.fn()
}));

import { syncUserSubscription, syncUserSubscriptionForDashboard } from "@/lib/services/subscriptions";

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

    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.update.mockResolvedValue(undefined);
    mockPrisma.subscription.update.mockResolvedValue(undefined);
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
        remnawaveShortUuid: null
      }
    });
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
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
        remnawaveShortUuid: null
      }
    });
    expect(result).toEqual(finalUser);
  });

  it("returns the live Remnawave subscriptionUrl for dashboard consumers", async () => {
    const initialUser = {
      id: "user-3",
      email: "dashboard@example.com",
      remnawaveUuid: "5c819239-dcd1-45a1-b4ca-c9c32b3e98e7",
      remnawaveUsername: "gs_dashboard",
      remnawaveShortUuid: "short-3",
      subscription: {
        id: "sub-3",
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
      ...initialUser
    };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(initialUser)
      .mockResolvedValueOnce(finalUser);

    mockRemnawave.getRemnawaveUser.mockResolvedValue({
      uuid: "5c819239-dcd1-45a1-b4ca-c9c32b3e98e7",
      username: "gs_dashboard",
      shortUuid: "short-3",
      subscriptionUrl: "https://sub.example.com/client-access",
      status: "ACTIVE",
      expireAt: "2026-04-25T12:00:00.000Z",
      trafficLimitBytes: 161061273600,
      trafficUsedBytes: 0
    });

    const result = await syncUserSubscriptionForDashboard("user-3");

    expect(result).toEqual({
      user: finalUser,
      externalSubscriptionUrl: "https://sub.example.com/client-access"
    });
  });

  it("falls back to the shortUuid subscription URL when Remnawave omits subscriptionUrl", async () => {
    const initialUser = {
      id: "user-4",
      email: "fallback@example.com",
      remnawaveUuid: "6c819239-dcd1-45a1-b4ca-c9c32b3e98e8",
      remnawaveUsername: "gs_fallback",
      remnawaveShortUuid: "short-4",
      subscription: {
        id: "sub-4",
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
      ...initialUser
    };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(initialUser)
      .mockResolvedValueOnce(finalUser);

    mockRemnawave.getRemnawaveUser.mockResolvedValue({
      uuid: "6c819239-dcd1-45a1-b4ca-c9c32b3e98e8",
      username: "gs_fallback",
      shortUuid: "short-4",
      status: "ACTIVE",
      expireAt: "2026-04-25T12:00:00.000Z",
      trafficLimitBytes: 161061273600,
      trafficUsedBytes: 0
    });

    const result = await syncUserSubscriptionForDashboard("user-4");

    expect(result).toEqual({
      user: finalUser,
      externalSubscriptionUrl: "https://panel.example.com/api/sub/short-4"
    });
  });
});
