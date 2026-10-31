import { type DbClient, prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export async function createReferralRewardForFirstPayment(input: {
  referredUserId: string;
  paymentId: string;
}, db: DbClient = prisma) {
  const user = await db.user.findUnique({
    where: { id: input.referredUserId },
    include: {
      referredBy: true
    }
  });

  if (!user?.referredById || !user.referredBy) {
    return null;
  }

  const successfulPayments = await db.payment.count({
    where: {
      userId: user.id,
      status: "SUCCEEDED"
    }
  });

  if (successfulPayments !== 1) {
    return null;
  }

  return db.referralReward.upsert({
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

// Reads (without marking) the owner's unapplied FREE_DAYS/FREE_TRAFFIC_GB rewards.
// The caller folds the sums into a subscription grant and then calls
// markReferralRewardsApplied inside the same transaction so the bonus is credited
// exactly once, atomically with the subscription write.
export async function readPendingReferralBonuses(ownerId: string, db: DbClient = prisma) {
  const rewards = await db.referralReward.findMany({
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

  return { bonusDays, bonusTrafficGb, rewardIds: rewards.map((reward) => reward.id) };
}

// Marks the given rewards applied. Idempotent (the applied:false filter makes a
// re-run a no-op), so it's safe under activation retries.
export async function markReferralRewardsApplied(rewardIds: string[], db: DbClient = prisma) {
  if (!rewardIds.length) {
    return { count: 0 };
  }
  return db.referralReward.updateMany({
    where: { id: { in: rewardIds }, applied: false },
    data: { applied: true }
  });
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
