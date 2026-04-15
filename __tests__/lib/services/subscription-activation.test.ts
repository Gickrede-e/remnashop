import { PaymentProvider, PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { gbToBytes } from "@/lib/utils";

const {
  mockPrisma,
  mockRemnawave,
  mockLogAdminAction,
  mockNotifyPaymentSucceeded,
  mockMarkPromoUsageSucceeded,
  mockCreateReferralRewardForFirstPayment,
  mockGetPendingReferralBonuses,
  mockMarkReferralBonusesApplied
} = vi.hoisted(() => ({
  mockPrisma: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn()
    },
    plan: {
      findUnique: vi.fn()
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
  mockLogAdminAction: vi.fn(),
  mockNotifyPaymentSucceeded: vi.fn(),
  mockMarkPromoUsageSucceeded: vi.fn(),
  mockCreateReferralRewardForFirstPayment: vi.fn(),
  mockGetPendingReferralBonuses: vi.fn(),
  mockMarkReferralBonusesApplied: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

vi.mock("@/lib/services/remnawave", () => mockRemnawave);

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: mockLogAdminAction
}));

vi.mock("@/lib/services/notifications", () => ({
  notifyPaymentSucceeded: mockNotifyPaymentSucceeded
}));

vi.mock("@/lib/services/promos", () => ({
  markPromoUsageSucceeded: mockMarkPromoUsageSucceeded
}));

vi.mock("@/lib/services/referrals", () => ({
  createReferralRewardForFirstPayment: mockCreateReferralRewardForFirstPayment,
  getPendingReferralBonuses: mockGetPendingReferralBonuses,
  markReferralBonusesApplied: mockMarkReferralBonusesApplied
}));

import {
  activateSubscriptionFromPayment,
  grantSubscriptionByAdmin,
  syncUserSubscription
} from "@/lib/services/subscriptions";

describe("subscription activation flows", () => {
  const now = new Date("2026-04-12T12:00:00.000Z");
  const linkedUuid = "11111111-1111-4111-8111-111111111111";
  const ownerUuid = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();

    mockPrisma.payment.findUnique.mockReset();
    mockPrisma.payment.update.mockReset();
    mockPrisma.subscription.findUnique.mockReset();
    mockPrisma.subscription.update.mockReset();
    mockPrisma.subscription.create.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.user.update.mockReset();
    mockPrisma.plan.findUnique.mockReset();

    mockPrisma.payment.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "payment-1",
      ...data
    }));
    mockPrisma.subscription.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "sub-1",
      ...data
    }));
    mockPrisma.subscription.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "sub-new",
      ...data
    }));
    mockPrisma.user.update.mockResolvedValue(undefined);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockGetPendingReferralBonuses.mockResolvedValue({
      bonusDays: 0,
      bonusTrafficGb: 0,
      rewards: []
    });
    mockMarkReferralBonusesApplied.mockResolvedValue({ count: 0 });

    mockRemnawave.getRemnawaveUser.mockImplementation(async (uuid: string) => ({
      uuid,
      username: uuid === ownerUuid ? "gs_owner" : "gs_user",
      shortUuid: uuid === ownerUuid ? "short-owner" : "short-1",
      status: "ACTIVE"
    }));
    mockRemnawave.isRemnawaveNotFoundError.mockReturnValue(false);
    mockRemnawave.isRemnawaveRecoverableIdentityError.mockReturnValue(false);
    mockRemnawave.getRemnawaveUserByUsername.mockResolvedValue(null);
    mockRemnawave.listRemnawaveUsersByEmail.mockResolvedValue([]);
    mockRemnawave.resetRemnawaveUserTraffic.mockResolvedValue(undefined);
    mockRemnawave.createRemnawaveUser.mockResolvedValue({
      uuid: linkedUuid,
      username: "gs_user",
      shortUuid: "short-1"
    });
    mockRemnawave.updateRemnawaveUser.mockImplementation(async (uuid: string, input: Record<string, unknown>) => ({
      uuid,
      username: uuid === ownerUuid ? "gs_owner" : "gs_user",
      shortUuid: uuid === ownerUuid ? "short-owner" : "short-1",
      status: String(input.status ?? "ACTIVE"),
      expireAt: String(input.expireAt ?? ""),
      trafficLimitBytes: Number(input.trafficLimitBytes ?? 0)
    }));
  });

  it("extends an active paid subscription but resets traffic to the newly purchased amount", async () => {
    const currentExpiresAt = new Date("2026-05-02T12:00:00.000Z");
    const expectedExpiresAt = new Date(currentExpiresAt.getTime() + 30 * 86400000);

    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      userId: "user-1",
      planId: "plan-1",
      status: PaymentStatus.PENDING,
      paidAt: null,
      provider: PaymentProvider.YOOKASSA,
      providerPayload: {},
      promoCodeId: null,
      promoCode: null,
      subscriptionId: null,
      subscription: null,
      user: {
        id: "user-1",
        email: "user@example.com",
        remnawaveUuid: linkedUuid,
        remnawaveUsername: "gs_user",
        remnawaveShortUuid: "short-1"
      },
      plan: {
        id: "plan-1",
        name: "Pro",
        slug: "pro",
        durationDays: 30,
        trafficGB: 50,
        remnawaveInternalSquadUuids: [],
        remnawaveExternalSquadUuid: null,
        remnawaveHwidDeviceLimit: null
      }
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      status: SubscriptionStatus.ACTIVE,
      startsAt: new Date("2026-04-01T12:00:00.000Z"),
      expiresAt: currentExpiresAt,
      trafficLimitBytes: gbToBytes(150),
      trafficUsedBytes: gbToBytes(20)
    });

    await activateSubscriptionFromPayment("payment-1");

    expect(mockRemnawave.resetRemnawaveUserTraffic).toHaveBeenCalledWith(linkedUuid);
    expect(mockRemnawave.updateRemnawaveUser).toHaveBeenCalledWith(
      linkedUuid,
      expect.objectContaining({
        expireAt: expectedExpiresAt.toISOString(),
        trafficLimitBytes: Number(gbToBytes(50)),
        status: "ACTIVE"
      })
    );
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({
          expiresAt: expectedExpiresAt,
          trafficLimitBytes: gbToBytes(50),
          trafficUsedBytes: BigInt(0)
        })
      })
    );
  });

  it("applies pending referral bonus days to the inviter subscription after a referred payment succeeds", async () => {
    const referredPaymentExpiry = new Date("2026-05-12T12:00:00.000Z");
    const ownerCurrentExpiry = new Date("2026-04-20T12:00:00.000Z");
    const ownerExpectedExpiry = new Date(ownerCurrentExpiry.getTime() + 3 * 86400000);

    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      userId: "referred-user-1",
      planId: "plan-1",
      status: PaymentStatus.PENDING,
      paidAt: null,
      provider: PaymentProvider.YOOKASSA,
      providerPayload: {
        activationMeta: {
          startsAt: now.toISOString(),
          expiresAt: referredPaymentExpiry.toISOString(),
          trafficLimitBytes: gbToBytes(50).toString()
        }
      },
      promoCodeId: null,
      promoCode: null,
      subscriptionId: null,
      subscription: null,
      user: {
        id: "referred-user-1",
        email: "friend@example.com",
        remnawaveUuid: linkedUuid,
        remnawaveUsername: "gs_user",
        remnawaveShortUuid: "short-1"
      },
      plan: {
        id: "plan-1",
        name: "Pro",
        slug: "pro",
        durationDays: 30,
        trafficGB: 50,
        remnawaveInternalSquadUuids: [],
        remnawaveExternalSquadUuid: null,
        remnawaveHwidDeviceLimit: null
      }
    });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockCreateReferralRewardForFirstPayment.mockResolvedValue({
      id: "reward-1",
      ownerId: "owner-1"
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "owner-1",
      email: "owner@example.com",
      remnawaveUuid: ownerUuid,
      remnawaveUsername: "gs_owner",
      remnawaveShortUuid: "short-owner",
      subscription: {
        id: "owner-sub-1",
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date("2026-04-01T12:00:00.000Z"),
        expiresAt: ownerCurrentExpiry,
        trafficLimitBytes: gbToBytes(100),
        trafficUsedBytes: gbToBytes(25),
        plan: {
          id: "owner-plan-1",
          name: "Owner Pro",
          slug: "owner-pro",
          remnawaveInternalSquadUuids: [],
          remnawaveExternalSquadUuid: null,
          remnawaveHwidDeviceLimit: null
        }
      }
    });
    mockGetPendingReferralBonuses.mockResolvedValue({
      bonusDays: 3,
      bonusTrafficGb: 0,
      rewards: [{ id: "reward-1" }]
    });

    await activateSubscriptionFromPayment("payment-1");

    expect(mockGetPendingReferralBonuses).toHaveBeenCalledWith("owner-1");
    expect(mockRemnawave.updateRemnawaveUser).toHaveBeenCalledWith(
      ownerUuid,
      expect.objectContaining({
        expireAt: ownerExpectedExpiry.toISOString(),
        trafficLimitBytes: Number(gbToBytes(100)),
        status: "ACTIVE"
      })
    );
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "owner-sub-1" },
        data: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          expiresAt: ownerExpectedExpiry,
          trafficLimitBytes: gbToBytes(100),
          trafficUsedBytes: gbToBytes(25)
        })
      })
    );
    expect(mockMarkReferralBonusesApplied).toHaveBeenCalledWith(["reward-1"]);
  });

  it("applies already pending referral bonus days during subscription sync", async () => {
    const ownerCurrentExpiry = new Date("2026-04-20T12:00:00.000Z");
    const ownerExpectedExpiry = new Date(ownerCurrentExpiry.getTime() + 3 * 86400000);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "owner-1",
      email: "owner@example.com",
      remnawaveUuid: ownerUuid,
      remnawaveUsername: "gs_owner",
      remnawaveShortUuid: "short-owner",
      subscription: {
        id: "owner-sub-1",
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date("2026-04-01T12:00:00.000Z"),
        expiresAt: ownerCurrentExpiry,
        trafficLimitBytes: gbToBytes(100),
        trafficUsedBytes: gbToBytes(25),
        plan: {
          id: "owner-plan-1",
          name: "Owner Pro",
          slug: "owner-pro",
          remnawaveInternalSquadUuids: [],
          remnawaveExternalSquadUuid: null,
          remnawaveHwidDeviceLimit: null
        }
      }
    });
    mockGetPendingReferralBonuses.mockResolvedValue({
      bonusDays: 3,
      bonusTrafficGb: 0,
      rewards: [{ id: "reward-1" }]
    });

    await syncUserSubscription("owner-1");

    expect(mockGetPendingReferralBonuses).toHaveBeenCalledWith("owner-1");
    expect(mockRemnawave.updateRemnawaveUser).toHaveBeenCalledWith(
      ownerUuid,
      expect.objectContaining({
        expireAt: ownerExpectedExpiry.toISOString(),
        trafficLimitBytes: Number(gbToBytes(100)),
        status: "ACTIVE"
      })
    );
    expect(mockMarkReferralBonusesApplied).toHaveBeenCalledWith(["reward-1"]);
  });

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
});
