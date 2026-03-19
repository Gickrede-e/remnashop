import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export async function createReferralRewardForFirstPayment(input: {
  referredUserId: string;
  paymentId: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.referredUserId },
    include: {
      referredBy: true
    }
  });

  if (!user?.referredById || !user.referredBy) {
    return null;
  }

  const successfulPayments = await prisma.payment.count({
    where: {
      userId: user.id,
      status: "SUCCEEDED"
    }
  });

  if (successfulPayments !== 1) {
    return null;
  }

  return prisma.referralReward.upsert({
    where: {
      ownerId_referredUserId_paymentId: {
        ownerId: user.referredById,
        referredUserId: user.id,
        paymentId: input.paymentId
      }
    },
    update: {},
    create: {
      ownerId: user.referredById,
      referredUserId: user.id,
      rewardType: env.REFERRAL_REWARD_TYPE,
      rewardValue: env.REFERRAL_REWARD_VALUE,
      paymentId: input.paymentId
    }
  });
}

export async function consumeReferralBonuses(ownerId: string) {
  const rewards = await prisma.referralReward.findMany({
    where: {
      ownerId,
      applied: false,
      rewardType: {
        in: ["FREE_DAYS", "FREE_TRAFFIC_GB"]
      }
    }
  });

  const bonusDays = rewards
    .filter((reward) => reward.rewardType === "FREE_DAYS")
    .reduce((sum, reward) => sum + reward.rewardValue, 0);
  const bonusTrafficGb = rewards
    .filter((reward) => reward.rewardType === "FREE_TRAFFIC_GB")
    .reduce((sum, reward) => sum + reward.rewardValue, 0);

  if (rewards.length) {
    await prisma.referralReward.updateMany({
      where: {
        id: { in: rewards.map((reward) => reward.id) }
      },
      data: {
        applied: true
      }
    });
  }

  return { bonusDays, bonusTrafficGb, rewards };
}

export async function getMyReferralSummary(userId: string) {
  const [referredUsers, rewards] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: userId },
      orderBy: { createdAt: "desc" },
      include: {
        payments: {
          where: { status: "SUCCEEDED" },
          orderBy: { paidAt: "desc" },
          take: 1
        }
      }
    }),
    prisma.referralReward.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        referredUser: {
          select: {
            id: true,
            email: true
          }
        }
      }
    })
  ]);

  return {
    referredUsers,
    rewards
  };
}

export async function getMyReferrals(userId: string) {
  const summary = await getMyReferralSummary(userId);
  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true }
  });

  return {
    referralCode: owner?.referralCode ?? "",
    referralLink: `${env.siteUrl}/register?ref=${owner?.referralCode ?? ""}`,
    invitedCount: summary.referredUsers.length,
    successfulReferralsCount: summary.referredUsers.filter((user) => user.payments.length > 0).length,
    rewards: summary.rewards.map((reward) => ({
      id: reward.id,
      referredUserEmailMasked: reward.referredUser.email.replace(/(^.).*(@.*$)/, "$1***$2"),
      rewardType: reward.rewardType,
      rewardValue: reward.rewardValue,
      applied: reward.applied,
      createdAt: reward.createdAt
    }))
  };
}

export async function getReferralAdminOverview() {
  const [topReferrers, rewards, totalReferrals] = await Promise.all([
    prisma.user.findMany({
      orderBy: {
        referrals: {
          _count: "desc"
        }
      },
      take: 10,
      include: {
        _count: {
          select: {
            referrals: true
          }
        }
      }
    }),
    prisma.referralReward.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: {
            email: true
          }
        },
        referredUser: {
          select: {
            email: true
          }
        }
      },
      take: 50
    }),
    prisma.user.count({
      where: {
        referredById: {
          not: null
        }
      }
    })
  ]);

  return {
    topReferrers,
    rewards,
    totalReferrals
  };
}

export const getAdminReferralOverview = getReferralAdminOverview;
