import { PaymentProvider, PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { gbToBytes } from "@/lib/utils";

const {
  mockPrisma,
  mockRemnawave,
  mockLogAdminAction,
  mockNotifyPaymentSucceeded,
  mockMarkPromoUsageSucceeded,
  mockCreateReferralRewardForFirstPayment
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
  mockCreateReferralRewardForFirstPayment: vi.fn()
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
  createReferralRewardForFirstPayment: mockCreateReferralRewardForFirstPayment
}));

import { activateSubscriptionFromPayment, grantSubscriptionByAdmin } from "@/lib/services/subscriptions";

describe("subscription activation flows", () => {
  const now = new Date("2026-04-12T12:00:00.000Z");
  const linkedUuid = "11111111-1111-4111-8111-111111111111";

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

    mockRemnawave.getRemnawaveUser.mockResolvedValue({
      uuid: linkedUuid,
      username: "gs_user",
      shortUuid: "short-1",
      status: "ACTIVE"
    });
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
    mockRemnawave.updateRemnawaveUser.mockImplementation(async (_uuid: string, input: Record<string, unknown>) => ({
      uuid: linkedUuid,
      username: "gs_user",
      shortUuid: "short-1",
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
