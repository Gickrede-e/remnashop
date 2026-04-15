import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, mockPrisma } = vi.hoisted(() => ({
  mockEnv: {
    REFERRAL_REWARD_TYPE: "FREE_DAYS",
    REFERRAL_REWARD_VALUE: 3,
    siteUrl: "https://vpn.example.com"
  },
  mockPrisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    payment: {
      count: vi.fn()
    },
    referralReward: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import {
  createReferralRewardForFirstPayment,
  getMyReferrals
} from "@/lib/services/referrals";

describe("lib/services/referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a reward for each successful invited payment, not only the first one", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "referred-user-1",
      referredById: "owner-1",
      referredBy: {
        id: "owner-1"
      }
    });
    mockPrisma.payment.count.mockResolvedValue(2);
    mockPrisma.referralReward.upsert.mockResolvedValue({
      id: "reward-2",
      ownerId: "owner-1",
      referredUserId: "referred-user-1",
      paymentId: "payment-2",
      rewardType: "FREE_DAYS",
      rewardValue: 3
    });

    await expect(
      createReferralRewardForFirstPayment({
        referredUserId: "referred-user-1",
        paymentId: "payment-2"
      })
    ).resolves.toEqual({
      id: "reward-2",
      ownerId: "owner-1",
      referredUserId: "referred-user-1",
      paymentId: "payment-2",
      rewardType: "FREE_DAYS",
      rewardValue: 3
    });
    expect(mockPrisma.referralReward.upsert).toHaveBeenCalledWith({
      where: {
        ownerId_referredUserId_paymentId: {
          ownerId: "owner-1",
          referredUserId: "referred-user-1",
          paymentId: "payment-2"
        }
      },
      update: {},
      create: {
        ownerId: "owner-1",
        referredUserId: "referred-user-1",
        rewardType: "FREE_DAYS",
        rewardValue: 3,
        paymentId: "payment-2"
      }
    });
  });

  it("returns null when the invited user has no referrer", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "referred-user-1",
      referredById: null,
      referredBy: null
    });

    await expect(
      createReferralRewardForFirstPayment({
        referredUserId: "referred-user-1",
        paymentId: "payment-1"
      })
    ).resolves.toBeNull();

    expect(mockPrisma.referralReward.upsert).not.toHaveBeenCalled();
  });

  it("builds the outward referral link from the canonical env site url", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.referralReward.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({
      referralCode: "ALLY42"
    });

    await expect(getMyReferrals("owner-1")).resolves.toEqual({
      referralCode: "ALLY42",
      referralLink: "https://vpn.example.com/register?ref=ALLY42",
      invitedCount: 0,
      successfulReferralsCount: 0,
      rewards: []
    });
  });
});
