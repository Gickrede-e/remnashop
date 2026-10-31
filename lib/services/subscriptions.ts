import { SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/lib/server/logger";
import { bytesFromGb, slugToRemnawaveTag } from "@/lib/utils";
import { logAdminAction } from "@/lib/services/admin-logs";
import { hasPendingActivation } from "@/lib/services/payment-activation";
import {
  disableRemnawaveUser,
  enableRemnawaveUser,
  getRemnawaveUser,
  isRemnawaveRecoverableIdentityError
} from "@/lib/services/remnawave";
import {
  buildRemnawaveSubscriptionUrl,
  buildSyncRecoverySeed,
  ensureRemnawaveIdentity,
  getUserWithSubscription,
  hasValidRemnawaveUuid,
  persistRemnawaveIdentity,
  provisionRemnawaveIdentity,
  resolveExternalSubscriptionUrl
} from "@/lib/services/remnawave-identity";

async function syncUserSubscriptionInternal(userId: string) {
  let externalSubscriptionUrl: string | null = null;

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'user_provision:' + userId}))`;
      const user = await getUserWithSubscription(userId, tx);
      externalSubscriptionUrl = buildRemnawaveSubscriptionUrl(user?.remnawaveShortUuid);

      if (!user?.remnawaveUuid || await hasPendingActivation(userId, tx)) {
        return { user, externalSubscriptionUrl };
      }

      let snapshot: Awaited<ReturnType<typeof getRemnawaveUser>> | null = null;

      if (hasValidRemnawaveUuid(user.remnawaveUuid)) {
        try {
          snapshot = await getRemnawaveUser(user.remnawaveUuid);
        } catch (error) {
          if (!isRemnawaveRecoverableIdentityError(error)) {
            throw error;
          }
        }
      }

      if (!snapshot) {
        const recoverySeed = buildSyncRecoverySeed(user);
        if (!recoverySeed) {
          throw new Error("Recovery seed missing");
        }

        const recoveredIdentity = await ensureRemnawaveIdentity(user, recoverySeed, { db: tx });
        snapshot = await getRemnawaveUser(recoveredIdentity.uuid);
      }

      externalSubscriptionUrl = resolveExternalSubscriptionUrl(snapshot, user.remnawaveShortUuid ?? null);

      await persistRemnawaveIdentity(user.id, {
        uuid: snapshot.uuid,
        username: snapshot.username,
        shortUuid: snapshot.shortUuid ?? user.remnawaveShortUuid ?? null
      }, tx);

      if (user.subscription) {
        const nextExpiresAt = snapshot.expireAt ? new Date(snapshot.expireAt) : user.subscription.expiresAt;
        await tx.subscription.update({
          where: { id: user.subscription.id },
          data: {
            // Map ALL four Remnawave statuses (ACTIVE | DISABLED | LIMITED | EXPIRED).
            // Previously only DISABLED was handled and everything else defaulted to
            // ACTIVE — so a LIMITED (traffic cap hit, connections blocked) or a
            // panel-side EXPIRED user showed as "Активна" on the dashboard while the
            // VPN was actually cut off.
            status:
              nextExpiresAt && nextExpiresAt < new Date()
                  ? SubscriptionStatus.EXPIRED
                  : snapshot.status === "EXPIRED"
                    ? SubscriptionStatus.EXPIRED
                    : snapshot.status === "DISABLED" || snapshot.status === "LIMITED"
                      ? SubscriptionStatus.DISABLED
                      : SubscriptionStatus.ACTIVE,
            expiresAt: nextExpiresAt,
            trafficLimitBytes: snapshot.trafficLimitBytes
              ? BigInt(snapshot.trafficLimitBytes)
              : user.subscription.trafficLimitBytes,
            trafficUsedBytes: snapshot.trafficUsedBytes
              ? BigInt(snapshot.trafficUsedBytes)
              : user.subscription.trafficUsedBytes,
            remnawaveLastSyncAt: new Date()
          }
        });
      }

      return {
        user: await getUserWithSubscription(userId, tx),
        externalSubscriptionUrl
      };
    }, { timeout: 120_000 });
  } catch (error) {
    const user = await getUserWithSubscription(userId);
    logger.error("subscription.sync_failed", {
      userId,
      remnawaveUuid: user?.remnawaveUuid,
      error: serializeError(error)
    });
    return {
      user,
      externalSubscriptionUrl: externalSubscriptionUrl ?? buildRemnawaveSubscriptionUrl(user?.remnawaveShortUuid)
    };
  }
}

export async function syncUserSubscription(userId: string) {
  const result = await syncUserSubscriptionInternal(userId);
  return result.user;
}

export async function syncUserSubscriptionForDashboard(userId: string) {
  return syncUserSubscriptionInternal(userId);
}

export async function grantSubscriptionByAdmin(input: {
  adminId: string;
  userId: string;
  planId: string;
  durationDays?: number;
  trafficGB?: number;
  note?: string;
}) {
  const { subscription, user, plan, durationDays, trafficGB } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'user_provision:' + input.userId}))`;
    if (await hasPendingActivation(input.userId, tx)) {
      throw new Error("Сначала завершите активацию оплаченной подписки пользователя");
    }

    const [user, plan, current] = await Promise.all([
      tx.user.findUnique({ where: { id: input.userId } }),
      tx.plan.findUnique({ where: { id: input.planId } }),
      tx.subscription.findUnique({ where: { userId: input.userId } })
    ]);

    if (!user || !plan) {
      throw new Error("Пользователь или тариф не найден");
    }

    const durationDays = input.durationDays ?? plan.durationDays;
    const trafficGB = input.trafficGB ?? plan.trafficGB;
    const now = new Date();
    const baseDate = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now;
    const expiresAt = new Date(baseDate.getTime() + durationDays * 86400000);
    const trafficLimitBytes = bytesFromGb(trafficGB);
    const remnawaveTag = slugToRemnawaveTag(plan.slug);

    await provisionRemnawaveIdentity(user, {
      expireAt: expiresAt,
      trafficLimitBytes,
      description: `Admin grant: ${plan.name}`,
      tag: remnawaveTag,
      activeInternalSquads: plan.remnawaveInternalSquadUuids,
      externalSquadUuid: plan.remnawaveExternalSquadUuid,
      hwidDeviceLimit: plan.remnawaveHwidDeviceLimit
    }, { db: tx, resetTraffic: true });

    const subscription = current
      ? await tx.subscription.update({
          where: { id: current.id },
          data: {
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            expiresAt,
            trafficLimitBytes,
            trafficUsedBytes: BigInt(0),
            grantedByAdminId: input.adminId,
            grantNote: input.note ?? null,
            remnawaveLastSyncAt: new Date()
          }
        })
      : await tx.subscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            startsAt: now,
            expiresAt,
            trafficLimitBytes,
            trafficUsedBytes: BigInt(0),
            grantedByAdminId: input.adminId,
            grantNote: input.note ?? null,
            remnawaveLastSyncAt: new Date()
          }
        });

    return { subscription, user, plan, durationDays, trafficGB };
  }, { timeout: 120_000 });

  await logAdminAction({
    adminId: input.adminId,
    action: "GRANT_SUBSCRIPTION",
    targetType: "SUBSCRIPTION",
    targetId: subscription.id,
    details: {
      userId: user.id,
      planId: plan.id,
      durationDays,
      trafficGB,
      note: input.note ?? null
    }
  });

  return subscription;
}

export async function revokeSubscriptionByAdmin(input: {
  adminId: string;
  subscriptionId: string;
}) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: input.subscriptionId },
    include: {
      user: true
    }
  });

  if (!subscription) {
    throw new Error("Подписка не найдена");
  }

  if (subscription.user.remnawaveUuid) {
    await disableRemnawaveUser(subscription.user.remnawaveUuid);
  }

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.CANCELED
    }
  });

  await logAdminAction({
    adminId: input.adminId,
    action: "REVOKE_SUBSCRIPTION",
    targetType: "SUBSCRIPTION",
    targetId: subscription.id,
    details: {
      userId: subscription.userId
    }
  });

  return updated;
}

export async function toggleUserRemnawaveState(input: {
  adminId: string;
  userId: string;
  enabled?: boolean;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: {
      subscription: true
    }
  });

  if (!user?.remnawaveUuid) {
    throw new Error("У пользователя нет Remnawave-аккаунта");
  }

  const remote = await getRemnawaveUser(user.remnawaveUuid);
  const shouldEnable = input.enabled ?? remote.status === "DISABLED";

  if (shouldEnable) {
    await enableRemnawaveUser(user.remnawaveUuid);
  } else {
    await disableRemnawaveUser(user.remnawaveUuid);
  }

  if (user.subscription) {
    await prisma.subscription.update({
      where: { id: user.subscription.id },
      data: {
        status: shouldEnable ? SubscriptionStatus.ACTIVE : SubscriptionStatus.DISABLED,
        remnawaveLastSyncAt: new Date()
      }
    });
  }

  await logAdminAction({
    adminId: input.adminId,
    action: "TOGGLE_USER",
    targetType: "USER",
    targetId: user.id,
    details: {
      enabled: shouldEnable
    }
  });

  return shouldEnable;
}
