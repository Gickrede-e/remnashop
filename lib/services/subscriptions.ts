import { PaymentStatus, SubscriptionStatus } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { bytesFromGb, slugToRemnawaveTag } from "@/lib/utils";
import { logAdminAction } from "@/lib/services/admin-logs";
import { notifyPaymentSucceeded } from "@/lib/services/notifications";
import { markPromoUsageSucceeded } from "@/lib/services/promos";
import {
  createRemnawaveUser,
  disableRemnawaveUser,
  enableRemnawaveUser,
  getRemnawaveUser,
  updateRemnawaveUser
} from "@/lib/services/remnawave";
import { createReferralRewardForFirstPayment } from "@/lib/services/referrals";

function buildRemnawaveUsername(email: string, userId: string) {
  return `${email.split("@")[0]?.replace(/[^a-z0-9]/gi, "").slice(0, 12) ?? "user"}-${userId.slice(-6)}`;
}

async function ensureRemnawaveIdentity(user: {
  id: string;
  email: string;
  remnawaveUuid: string | null;
  remnawaveUsername: string | null;
}, seed: {
  expireAt: Date;
  trafficLimitBytes?: bigint;
  description: string;
  tag: string;
  activeInternalSquads: string[];
  externalSquadUuid: string | null;
  hwidDeviceLimit: number | null;
}) {
  if (user.remnawaveUuid) {
    return {
      uuid: user.remnawaveUuid,
      username: user.remnawaveUsername ?? buildRemnawaveUsername(user.email, user.id)
    };
  }

  const created = await createRemnawaveUser({
    username: buildRemnawaveUsername(user.email, user.id),
    expireAt: seed.expireAt.toISOString(),
    status: "ACTIVE",
    trafficLimitBytes: Number(seed.trafficLimitBytes ?? BigInt(0)),
    trafficLimitStrategy: "NO_RESET",
    description: seed.description,
    email: user.email,
    tag: seed.tag,
    activeInternalSquads: seed.activeInternalSquads,
    externalSquadUuid: seed.externalSquadUuid,
    hwidDeviceLimit: seed.hwidDeviceLimit
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      remnawaveUuid: created.uuid,
      remnawaveUsername: created.username,
      remnawaveShortUuid: created.shortUuid ?? null
    }
  });

  return {
    uuid: created.uuid,
    username: created.username
  };
}

export async function activateSubscriptionFromPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: true,
      plan: true,
      promoCode: true,
      subscription: true
    }
  });

  if (!payment) {
    throw new Error("Платёж не найден");
  }

  if (payment.status === PaymentStatus.SUCCEEDED && payment.subscriptionId) {
    return payment;
  }

  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId: payment.userId }
  });

  const now = new Date();
  const currentExpiry = existingSubscription?.expiresAt;
  const isActive =
    existingSubscription?.status === SubscriptionStatus.ACTIVE &&
    !!currentExpiry &&
    currentExpiry > now;

  const promoBonusDays =
    payment.promoCode?.type === "FREE_DAYS" ? payment.promoCode.value : 0;
  const promoBonusTrafficGb =
    payment.promoCode?.type === "FREE_TRAFFIC_GB" ? payment.promoCode.value : 0;

  const baseDate = isActive && currentExpiry ? currentExpiry : now;
  const expiresAt = new Date(baseDate.getTime() + (payment.plan.durationDays + promoBonusDays) * 86400000);

  const baseTraffic = isActive && existingSubscription?.trafficLimitBytes
    ? existingSubscription.trafficLimitBytes
    : BigInt(0);
  const newTrafficLimit =
    baseTraffic + bytesFromGb(payment.plan.trafficGB + promoBonusTrafficGb);
  const remnawaveTag = slugToRemnawaveTag(payment.plan.slug);

  const remnawave = await ensureRemnawaveIdentity(payment.user, {
    expireAt: expiresAt,
    trafficLimitBytes: newTrafficLimit,
    description: `GickVPN ${payment.plan.name}`,
    tag: remnawaveTag,
    activeInternalSquads: payment.plan.remnawaveInternalSquadUuids,
    externalSquadUuid: payment.plan.remnawaveExternalSquadUuid,
    hwidDeviceLimit: payment.plan.remnawaveHwidDeviceLimit
  });

  let snapshot;
  try {
    snapshot = await updateRemnawaveUser(remnawave.uuid, {
      expireAt: expiresAt.toISOString(),
      trafficLimitBytes: Number(newTrafficLimit),
      status: "ACTIVE",
      description: `GickVPN ${payment.plan.name}`,
      tag: remnawaveTag,
      activeInternalSquads: payment.plan.remnawaveInternalSquadUuids,
      externalSquadUuid: payment.plan.remnawaveExternalSquadUuid,
      hwidDeviceLimit: payment.plan.remnawaveHwidDeviceLimit
    });
    await enableRemnawaveUser(remnawave.uuid);
  } catch (error) {
    console.error("Failed to provision Remnawave subscription", error);
    throw error;
  }

  const subscription = existingSubscription
    ? await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: payment.planId,
          status: SubscriptionStatus.ACTIVE,
          startsAt: existingSubscription.startsAt ?? now,
          expiresAt,
          trafficLimitBytes: newTrafficLimit,
          remnawaveLastSyncAt: new Date(),
          trafficUsedBytes: existingSubscription.trafficUsedBytes ?? BigInt(0)
        }
      })
    : await prisma.subscription.create({
        data: {
          userId: payment.userId,
          planId: payment.planId,
          status: SubscriptionStatus.ACTIVE,
          startsAt: now,
          expiresAt,
          trafficLimitBytes: newTrafficLimit,
          trafficUsedBytes: BigInt(0),
          remnawaveLastSyncAt: new Date()
        }
      });

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.SUCCEEDED,
      paidAt: new Date(),
      subscriptionId: subscription.id,
      providerPayload: JSON.parse(
        JSON.stringify({
          ...(payment.providerPayload && typeof payment.providerPayload === "object" ? payment.providerPayload : {}),
          activationSnapshot: snapshot
        })
      )
    }
  });

  if (payment.promoCodeId) {
    await markPromoUsageSucceeded(payment.promoCodeId);
  }

  await Promise.allSettled([
    createReferralRewardForFirstPayment({
      referredUserId: payment.userId,
      paymentId: payment.id
    }),
    notifyPaymentSucceeded({
      email: payment.user.email,
      planName: payment.plan.name,
      expiresAt
    }),
    logAdminAction({
      action: "AUTO_ACTIVATE",
      targetType: "PAYMENT",
      targetId: payment.id,
      details: {
        subscriptionId: subscription.id,
        provider: payment.provider
      }
    })
  ]);

  return updatedPayment;
}

export async function syncUserSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: {
          plan: true
        }
      }
    }
  });

  if (!user?.remnawaveUuid) {
    return user;
  }

  try {
    const snapshot = await getRemnawaveUser(user.remnawaveUuid);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        remnawaveShortUuid: snapshot.shortUuid ?? user.remnawaveShortUuid
      }
    });

    if (user.subscription) {
      const nextExpiresAt = snapshot.expireAt ? new Date(snapshot.expireAt) : user.subscription.expiresAt;
      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          status:
            nextExpiresAt && nextExpiresAt < new Date()
                ? SubscriptionStatus.EXPIRED
                : snapshot.status === "DISABLED"
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
  } catch (error) {
    console.error("Failed to sync subscription", error);
  }

  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: { plan: true }
      }
    }
  });
}

export const syncSubscriptionForUser = syncUserSubscription;

export function toDashboardSubscriptionDto(input: {
  user: {
    remnawaveUsername?: string | null;
    remnawaveShortUuid?: string | null;
  };
  subscription:
    | {
        status: string;
        startsAt: Date | null;
        expiresAt: Date | null;
        trafficLimitBytes: bigint | null;
        trafficUsedBytes: bigint | null;
        remnawaveLastSyncAt?: Date | null;
        plan?: { name: string } | null;
      }
    | null;
}) {
  const trafficLimitBytes = input.subscription?.trafficLimitBytes ? Number(input.subscription.trafficLimitBytes) : 0;
  const trafficUsedBytes = input.subscription?.trafficUsedBytes ? Number(input.subscription.trafficUsedBytes) : 0;

  return {
    status: input.subscription?.status ?? "PENDING",
    planName: input.subscription?.plan?.name,
    startsAt: input.subscription?.startsAt ?? null,
    expiresAt: input.subscription?.expiresAt ?? null,
    trafficLimitBytes,
    trafficUsedBytes,
    trafficRemainingBytes: Math.max(0, trafficLimitBytes - trafficUsedBytes),
    remnawaveUsername: input.user.remnawaveUsername ?? null,
    subscriptionUrl: input.user.remnawaveShortUuid ? `${env.REMNAWAVE_BASE_URL}/api/sub/${input.user.remnawaveShortUuid}` : null,
    remnawaveStatus: input.subscription?.status ?? null,
    lastSyncedAt: input.subscription?.remnawaveLastSyncAt ?? null
  };
}

export async function expireStaleSubscriptions() {
  const expired = await prisma.subscription.findMany({
    where: {
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.DISABLED]
      },
      expiresAt: {
        lt: new Date()
      }
    },
    include: {
      user: true
    }
  });

  for (const subscription of expired) {
    if (subscription.user.remnawaveUuid) {
      try {
        await disableRemnawaveUser(subscription.user.remnawaveUuid);
      } catch (error) {
        console.error("Failed to disable Remnawave user", error);
      }
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.EXPIRED
      }
    });
  }

  return expired.length;
}

export async function grantSubscriptionByAdmin(input: {
  adminId: string;
  userId: string;
  planId: string;
  durationDays?: number;
  trafficGB?: number;
  note?: string;
}) {
  const [user, plan, current] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId } }),
    prisma.plan.findUnique({ where: { id: input.planId } }),
    prisma.subscription.findUnique({ where: { userId: input.userId } })
  ]);

  if (!user || !plan) {
    throw new Error("Пользователь или тариф не найден");
  }

  const durationDays = input.durationDays ?? plan.durationDays;
  const trafficGB = input.trafficGB ?? plan.trafficGB;
  const now = new Date();
  const baseDate = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now;
  const expiresAt = new Date(baseDate.getTime() + durationDays * 86400000);
  const trafficLimitBytes =
    (current?.expiresAt && current.expiresAt > now ? current.trafficLimitBytes ?? BigInt(0) : BigInt(0)) +
    bytesFromGb(trafficGB);
  const remnawaveTag = slugToRemnawaveTag(plan.slug);

  const remnawave = await ensureRemnawaveIdentity(user, {
    expireAt: expiresAt,
    trafficLimitBytes,
    description: `Admin grant: ${plan.name}`,
    tag: remnawaveTag,
    activeInternalSquads: plan.remnawaveInternalSquadUuids,
    externalSquadUuid: plan.remnawaveExternalSquadUuid,
    hwidDeviceLimit: plan.remnawaveHwidDeviceLimit
  });
  await updateRemnawaveUser(remnawave.uuid, {
    expireAt: expiresAt.toISOString(),
    trafficLimitBytes: Number(trafficLimitBytes),
    status: "ACTIVE",
    description: `Admin grant: ${plan.name}`,
    tag: remnawaveTag,
    activeInternalSquads: plan.remnawaveInternalSquadUuids,
    externalSquadUuid: plan.remnawaveExternalSquadUuid,
    hwidDeviceLimit: plan.remnawaveHwidDeviceLimit
  });
  await enableRemnawaveUser(remnawave.uuid);

  const subscription = current
    ? await prisma.subscription.update({
        where: { id: current.id },
        data: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          expiresAt,
          trafficLimitBytes,
          grantedByAdminId: input.adminId,
          grantNote: input.note ?? null,
          remnawaveLastSyncAt: new Date()
        }
      })
    : await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startsAt: now,
          expiresAt,
          trafficLimitBytes,
          grantedByAdminId: input.adminId,
          grantNote: input.note ?? null,
          remnawaveLastSyncAt: new Date()
        }
      });

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

export const toggleRemnawaveUserByAdmin = toggleUserRemnawaveState;
