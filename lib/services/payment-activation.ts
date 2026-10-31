import { PaymentStatus, type Prisma, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

import { prisma, toJsonValue } from "@/lib/prisma";
import { logger, serializeError } from "@/lib/server/logger";
import { bytesFromGb, slugToRemnawaveTag } from "@/lib/utils";
import { logAdminAction } from "@/lib/services/admin-logs";
import { notifyPaymentSucceeded } from "@/lib/services/notifications";
import { markPromoUsageSucceeded } from "@/lib/services/promos";
import { provisionRemnawaveIdentity } from "@/lib/services/remnawave-identity";
import { createReferralRewardForFirstPayment, markReferralRewardsApplied, readPendingReferralBonuses } from "@/lib/services/referrals";

const activationMetaSchema = z.object({
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  trafficLimitBytes: z.string().regex(/^\d+$/),
  referralRewardIds: z.array(z.string()).default([])
});

const pendingActivation: Prisma.PaymentWhereInput = {
  activationConfirmedAt: { not: null },
  OR: [{ status: { not: PaymentStatus.SUCCEEDED } }, { subscriptionId: null }]
};
const RETRY_DELAY_MS = 2 * 60_000;
const ACTIVATIONS_PER_RUN = 25;

export async function hasPendingActivation(userId: string, db: Prisma.TransactionClient): Promise<boolean> {
  return Boolean(await db.payment.findFirst({ where: { ...pendingActivation, userId }, select: { id: true } }));
}

function getHead(db: Prisma.TransactionClient, userId: string) {
  return db.payment.findFirst({
    where: { ...pendingActivation, userId },
    // Once prepared, a head cannot be overtaken, including equal confirmation timestamps.
    orderBy: [
      { activationAttemptedAt: { sort: "asc", nulls: "last" } },
      { activationConfirmedAt: "asc" },
      { id: "asc" }
    ],
    include: { user: true, plan: true, promoCode: true }
  });
}

async function prepareHead(userId: string, force: boolean) {
  return prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_xact_lock(hashtext(${`user_provision:${userId}`})::bigint) AS acquired
    `;
    if (!lock?.acquired) return null;

    const payment = await getHead(tx, userId);
    if (!payment) return null;
    const now = new Date();
    if (!force && payment.activationAttemptedAt && now.getTime() - payment.activationAttemptedAt.getTime() < RETRY_DELAY_MS) {
      return null;
    }

    let meta = payment.activationMeta;
    if (meta == null) {
      // Only the head is calculated: the previous payment has already committed its extension.
      const current = await tx.subscription.findUnique({ where: { userId } });
      const active = current?.status === SubscriptionStatus.ACTIVE && current.expiresAt && current.expiresAt > now;
      const referral = await readPendingReferralBonuses(userId, tx);
      const bonusDays = payment.promoCode?.type === "FREE_DAYS" ? payment.promoCode.value : 0;
      const bonusTraffic = payment.promoCode?.type === "FREE_TRAFFIC_GB" ? payment.promoCode.value : 0;
      meta = {
        startsAt: (current?.startsAt ?? now).toISOString(),
        expiresAt: new Date((active ? current.expiresAt! : now).getTime() +
          (payment.plan.durationDays * payment.months + bonusDays + referral.bonusDays) * 86400000).toISOString(),
        trafficLimitBytes: bytesFromGb(payment.plan.trafficGB + bonusTraffic + referral.bonusTrafficGb).toString(),
        referralRewardIds: referral.rewardIds
      };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { activationMeta: toJsonValue(meta), activationAttemptedAt: now }
    });
    return payment.id;
  });
}

async function executeHead(userId: string, paymentId: string) {
  // The preparation is already committed. A process/transaction failure here keeps
  // the same intent available for retry, even if the remote update succeeded.
  const completed = await prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_xact_lock(hashtext(${`user_provision:${userId}`})::bigint) AS acquired
    `;
    if (!lock?.acquired) return null;
    const payment = await getHead(tx, userId);
    if (!payment || payment.id !== paymentId) return null;
    const meta = activationMetaSchema.parse(payment.activationMeta);
    const expiresAt = new Date(meta.expiresAt);
    const trafficLimitBytes = BigInt(meta.trafficLimitBytes);
    await provisionRemnawaveIdentity(payment.user, {
      expireAt: expiresAt,
      trafficLimitBytes,
      description: `GickShop ${payment.plan.name}`,
      tag: slugToRemnawaveTag(payment.plan.slug),
      activeInternalSquads: payment.plan.remnawaveInternalSquadUuids,
      externalSquadUuid: payment.plan.remnawaveExternalSquadUuid,
      hwidDeviceLimit: payment.plan.remnawaveHwidDeviceLimit
    }, { db: tx, resetTraffic: true });

    const values = {
      planId: payment.planId,
      status: SubscriptionStatus.ACTIVE,
      startsAt: new Date(meta.startsAt),
      expiresAt,
      trafficLimitBytes,
      trafficUsedBytes: BigInt(0),
      remnawaveLastSyncAt: new Date()
    };
    const subscription = await tx.subscription.upsert({
      where: { userId },
      create: { userId, ...values },
      update: values
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCEEDED, subscriptionId: subscription.id, paidAt: payment.paidAt ?? new Date() }
    });
    if (payment.promoCodeId) await markPromoUsageSucceeded(payment.id, tx);
    await markReferralRewardsApplied(meta.referralRewardIds, tx);
    // The second payment cannot race the first-payment reward calculation.
    await createReferralRewardForFirstPayment({ referredUserId: userId, paymentId: payment.id }, tx);
    return { payment, subscriptionId: subscription.id, expiresAt };
  }, { timeout: 120_000 });

  if (!completed) return false;
  await Promise.allSettled([
    notifyPaymentSucceeded({ email: completed.payment.user.email, planName: completed.payment.plan.name, expiresAt: completed.expiresAt }),
    logAdminAction({ action: "AUTO_ACTIVATE", targetType: "PAYMENT", targetId: paymentId,
      details: { subscriptionId: completed.subscriptionId, provider: completed.payment.provider } })
  ]);
  return true;
}

async function drainUser(userId: string, limit: number, force: boolean) {
  let attempted = 0;
  let recovered = 0;
  // ponytail: bounded inline drain; existing Cron resumes queues longer than this batch.
  while (attempted < limit) {
    let paymentId: string | null = null;
    try {
      paymentId = await prepareHead(userId, force);
      if (!paymentId) break;
      attempted += 1;
      if (!await executeHead(userId, paymentId)) break;
      recovered += 1;
    } catch (error) {
      logger.error("subscription.provision_failed", { userId, paymentId, error: serializeError(error) });
      if (paymentId) {
        await logAdminAction({ action: "PAYMENT_ACTIVATION_FAILED", targetType: "PAYMENT", targetId: paymentId,
          details: { error: error instanceof Error ? error.message : "Unknown activation error" } }).catch(() => null);
      }
      // Keep the paid promo reservation and the prepared head. Never skip it.
      break;
    }
  }
  return { attempted, recovered };
}

// Only call after authoritative provider verification (or a legacy SUCCEEDED payment).
// Duplicate confirmations neither reorder the queue nor replace its saved calculation.
export async function activateSubscriptionFromPayment(paymentId: string, confirmation: {
  externalPaymentId?: string | null;
  providerPayload?: unknown;
} = {}) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status === PaymentStatus.SUCCEEDED && payment.subscriptionId) return payment;
  const observation = {
    externalPaymentId: confirmation.externalPaymentId ?? undefined,
    providerPayload: confirmation.providerPayload === undefined ? undefined : toJsonValue(confirmation.providerPayload)
  };
  // Commit the verified observation and queue admission together. A crash after
  // this statement must leave a payment that Cron can find without the webhook.
  const registered = await prisma.payment.updateMany({
    where: { id: paymentId, activationConfirmedAt: null },
    data: { ...observation, activationConfirmedAt: new Date() }
  });
  if (!registered.count && confirmation.providerPayload !== undefined) {
    await prisma.payment.update({ where: { id: paymentId }, data: observation });
  }
  await drainUser(payment.userId, ACTIVATIONS_PER_RUN, true);
  return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
}

export async function retryPendingActivations(options: { limit?: number } = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? ACTIVATIONS_PER_RUN, ACTIVATIONS_PER_RUN));
  // Rank actual heads, not unprepared tail payments: a long blocked queue must
  // not keep winning the batch ahead of other users' overdue activations.
  const users = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT "userId" FROM (
      SELECT DISTINCT ON ("userId") "userId", "activationAttemptedAt", "activationConfirmedAt"
      FROM "payments"
      WHERE "activationConfirmedAt" IS NOT NULL
        AND ("status" <> 'SUCCEEDED' OR "subscriptionId" IS NULL)
      ORDER BY "userId", "activationAttemptedAt" ASC NULLS LAST, "activationConfirmedAt", "id"
    ) AS heads
    WHERE "activationAttemptedAt" IS NULL OR "activationAttemptedAt" < ${new Date(Date.now() - RETRY_DELAY_MS)}
    ORDER BY COALESCE("activationAttemptedAt", "activationConfirmedAt"), "userId"
    LIMIT ${limit}
  `;
  let attempted = 0;
  let recovered = 0;
  for (const { userId } of users) {
    if (attempted >= limit) break;
    const result = await drainUser(userId, limit - attempted, false);
    attempted += result.attempted;
    recovered += result.recovered;
  }
  return { attempted, recovered };
}
