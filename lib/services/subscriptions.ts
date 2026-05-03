import { PaymentStatus, SubscriptionStatus } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/lib/server/logger";
import { bytesFromGb, slugToRemnawaveTag } from "@/lib/utils";
import { logAdminAction } from "@/lib/services/admin-logs";
import { notifyPaymentSucceeded, notifySubscriptionExpired } from "@/lib/services/notifications";
import { failPromoUsage, markPromoUsageSucceeded } from "@/lib/services/promos";
import {
  createRemnawaveUser,
  disableRemnawaveUser,
  enableRemnawaveUser,
  getRemnawaveUser,
  getRemnawaveUserByUsername,
  isRemnawaveNotFoundError,
  isRemnawaveRecoverableIdentityError,
  listRemnawaveUsersByEmail,
  resetRemnawaveUserTraffic,
  updateRemnawaveUser
} from "@/lib/services/remnawave";
import { createReferralRewardForFirstPayment } from "@/lib/services/referrals";
import {
  buildPrimaryProjectUsername,
  resolveRemnawaveIdentityLookup
} from "@/lib/services/remnawave-site-identities";

type ActivationMeta = {
  startsAt: string;
  expiresAt: string;
  trafficLimitBytes: string;
};

type RemnawaveIdentitySeed = {
  expireAt: Date;
  trafficLimitBytes?: bigint;
  description: string;
  tag: string;
  activeInternalSquads: string[];
  externalSquadUuid: string | null;
  hwidDeviceLimit: number | null;
};

type RemnawaveIdentityUser = {
  id: string;
  email: string;
  remnawaveUuid: string | null;
  remnawaveUsername: string | null;
  remnawaveShortUuid?: string | null;
};

type RemnawaveIdentityResolutionOutcome =
  | "created"
  | "attached"
  | "alreadyLinked";

type RemnawaveIdentityResolution = {
  uuid: string;
  username: string;
  shortUuid: string | null;
  outcome: RemnawaveIdentityResolutionOutcome;
  recovered: boolean;
};

type ActiveSubscriptionSyncOutcome =
  | "created"
  | "attached"
  | "alreadyLinked"
  | "skipped"
  | "failed";

type ActiveSubscriptionSyncItem = {
  userId: string;
  email: string;
  outcome: ActiveSubscriptionSyncOutcome;
  message: string;
};

type ActiveSubscriptionsSyncSummary = {
  totalCandidates: number;
  created: number;
  attached: number;
  alreadyLinked: number;
  skipped: number;
  failed: number;
  items: ActiveSubscriptionSyncItem[];
};

type ActiveSubscriptionSyncCandidate = {
  id: string;
  expiresAt: Date | null;
  trafficLimitBytes: bigint | null;
  plan: {
    name: string;
    slug: string;
    remnawaveInternalSquadUuids: string[];
    remnawaveExternalSquadUuid: string | null;
    remnawaveHwidDeviceLimit: number | null;
  } | null;
  user: RemnawaveIdentityUser;
};

type LinkedRemnawaveUuidRegistry = {
  getLinkedRemoteUuids(userId: string): ReadonlySet<string>;
  reserve(uuid: string, userId: string): boolean;
};

class RemnawaveIdentitySkipError extends Error {
  constructor(public reason: "conflicting-remote-email-match") {
    super(`Safe Remnawave identity lookup blocked: ${reason}`);
    this.name = "RemnawaveIdentitySkipError";
  }
}

const ACTIVE_SUBSCRIPTION_SYNC_CONCURRENCY = 3;
const FAR_FUTURE_REMNAWAVE_EXPIRY = new Date("2099-12-31T23:59:59.000Z");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hasValidRemnawaveUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function buildRemnawaveSubscriptionUrl(shortUuid: string | null | undefined) {
  if (!shortUuid) {
    return null;
  }

  return `${env.REMNAWAVE_BASE_URL.replace(/\/+$/, "")}/api/sub/${shortUuid}`;
}

function resolveExternalSubscriptionUrl(input: {
  subscriptionUrl?: string | null;
  shortUuid?: string | null;
}, fallbackShortUuid?: string | null) {
  return input.subscriptionUrl ?? buildRemnawaveSubscriptionUrl(input.shortUuid ?? fallbackShortUuid);
}

function toPayloadRecord(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return payload as Record<string, unknown>;
}

function mergePaymentPayload(
  payload: unknown,
  extra: Record<string, unknown>
) {
  return JSON.parse(JSON.stringify({
    ...toPayloadRecord(payload),
    ...extra
  }));
}

function parseActivationMeta(payload: unknown): ActivationMeta | null {
  const record = toPayloadRecord(payload);
  const meta = record.activationMeta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return null;
  }

  const typedMeta = meta as Record<string, unknown>;
  if (
    typeof typedMeta.startsAt !== "string" ||
    typeof typedMeta.expiresAt !== "string" ||
    typeof typedMeta.trafficLimitBytes !== "string"
  ) {
    return null;
  }

  return {
    startsAt: typedMeta.startsAt,
    expiresAt: typedMeta.expiresAt,
    trafficLimitBytes: typedMeta.trafficLimitBytes
  };
}

async function persistRemnawaveIdentity(userId: string, remote: {
  uuid: string;
  username: string;
  shortUuid?: string | null;
}) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      remnawaveUuid: remote.uuid,
      remnawaveUsername: remote.username,
      remnawaveShortUuid: remote.shortUuid ?? null
    }
  });
}

async function getLinkedRemnawaveUuids(userId: string) {
  const linkedUsers = await prisma.user.findMany({
    where: {
      id: { not: userId },
      remnawaveUuid: { not: null }
    },
    select: {
      remnawaveUuid: true
    }
  });

  return new Set(
    linkedUsers
      .map((linkedUser) => linkedUser.remnawaveUuid)
      .filter((uuid): uuid is string => Boolean(uuid))
  );
}

async function getOptionalRemnawaveUserByUsername(username: string) {
  try {
    return await getRemnawaveUserByUsername(username);
  } catch (error) {
    if (isRemnawaveNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

async function attachOrCreateRemnawaveIdentity(
  user: RemnawaveIdentityUser,
  seed: RemnawaveIdentitySeed,
  options?: {
    recovered?: boolean;
    linkedUuidRegistry?: LinkedRemnawaveUuidRegistry;
  }
): Promise<RemnawaveIdentityResolution> {
  const primaryUsername = buildPrimaryProjectUsername(user.email);
  const [usernameHit, emailHits] = await Promise.all([
    getOptionalRemnawaveUserByUsername(primaryUsername),
    listRemnawaveUsersByEmail(user.email)
  ]);
  const linkedRemoteUuids = options?.linkedUuidRegistry
    ? options.linkedUuidRegistry.getLinkedRemoteUuids(user.id)
    : await getLinkedRemnawaveUuids(user.id);

  const decision = resolveRemnawaveIdentityLookup({
    userId: user.id,
    localEmail: user.email,
    usernameHit: usernameHit
      ? {
          uuid: usernameHit.uuid,
          username: usernameHit.username,
          email: usernameHit.email
        }
      : null,
    emailHits: emailHits.map((remote) => ({
      uuid: remote.uuid,
      username: remote.username,
      email: remote.email
    })),
    linkedRemoteUuids
  });

  if (decision.action === "skip") {
    throw new RemnawaveIdentitySkipError(decision.reason);
  }

  if (decision.action === "attach") {
    if (
      options?.linkedUuidRegistry &&
      !options.linkedUuidRegistry.reserve(decision.remoteUser.uuid, user.id)
    ) {
      throw new RemnawaveIdentitySkipError("conflicting-remote-email-match");
    }

    await persistRemnawaveIdentity(user.id, decision.remoteUser);

    return {
      uuid: decision.remoteUser.uuid,
      username: decision.remoteUser.username,
      shortUuid: null,
      outcome: "attached",
      recovered: options?.recovered ?? false
    };
  }

  const created = await createRemnawaveUser({
    username: decision.username,
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

  options?.linkedUuidRegistry?.reserve(created.uuid, user.id);
  await persistRemnawaveIdentity(user.id, created);

  return {
    uuid: created.uuid,
    username: created.username,
    shortUuid: created.shortUuid ?? null,
    outcome: "created",
    recovered: options?.recovered ?? false
  };
}

async function ensureRemnawaveIdentity(
  user: RemnawaveIdentityUser,
  seed: RemnawaveIdentitySeed,
  options?: {
    linkedUuidRegistry?: LinkedRemnawaveUuidRegistry;
  }
): Promise<RemnawaveIdentityResolution> {
  const storedUuid = user.remnawaveUuid;
  if (hasValidRemnawaveUuid(storedUuid)) {
    try {
      const snapshot = await getRemnawaveUser(storedUuid);

      await persistRemnawaveIdentity(user.id, snapshot);

      return {
        uuid: snapshot.uuid,
        username: snapshot.username,
        shortUuid: snapshot.shortUuid ?? null,
        outcome: "alreadyLinked",
        recovered: false
      };
    } catch (error) {
      if (!isRemnawaveRecoverableIdentityError(error)) {
        throw error;
      }
    }
  }

  return attachOrCreateRemnawaveIdentity(user, seed, {
    recovered: Boolean(user.remnawaveUuid),
    linkedUuidRegistry: options?.linkedUuidRegistry
  });
}

function buildSyncRecoverySeed(user: {
  subscription: {
    expiresAt: Date | null;
    trafficLimitBytes: bigint | null;
    plan: {
      name: string;
      slug: string;
      remnawaveInternalSquadUuids: string[];
      remnawaveExternalSquadUuid: string | null;
      remnawaveHwidDeviceLimit: number | null;
    } | null;
  } | null;
}): RemnawaveIdentitySeed | null {
  if (!user.subscription?.plan) {
    return null;
  }

  return {
    expireAt: user.subscription.expiresAt ?? FAR_FUTURE_REMNAWAVE_EXPIRY,
    trafficLimitBytes: user.subscription.trafficLimitBytes ?? BigInt(0),
    description: `Sync recovery: ${user.subscription.plan.name}`,
    tag: slugToRemnawaveTag(user.subscription.plan.slug),
    activeInternalSquads: user.subscription.plan.remnawaveInternalSquadUuids,
    externalSquadUuid: user.subscription.plan.remnawaveExternalSquadUuid,
    hwidDeviceLimit: user.subscription.plan.remnawaveHwidDeviceLimit
  };
}

async function resetRemnawaveTrafficIfReissuing(identity: RemnawaveIdentityResolution) {
  if (identity.outcome !== "created") {
    await resetRemnawaveUserTraffic(identity.uuid);
  }
}

async function getUserWithSubscription(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: {
          plan: true
        }
      }
    }
  });
}

function buildSubscriptionIdentitySeed(subscription: {
  expiresAt: Date | null;
  trafficLimitBytes: bigint | null;
  plan: {
    name: string;
    slug: string;
    remnawaveInternalSquadUuids: string[];
    remnawaveExternalSquadUuid: string | null;
    remnawaveHwidDeviceLimit: number | null;
  } | null;
}): RemnawaveIdentitySeed | null {
  if (!subscription.plan) {
    return null;
  }

  return {
    expireAt: subscription.expiresAt ?? FAR_FUTURE_REMNAWAVE_EXPIRY,
    trafficLimitBytes: subscription.trafficLimitBytes ?? BigInt(0),
    description: `Bulk sync: ${subscription.plan.name}`,
    tag: slugToRemnawaveTag(subscription.plan.slug),
    activeInternalSquads: subscription.plan.remnawaveInternalSquadUuids,
    externalSquadUuid: subscription.plan.remnawaveExternalSquadUuid,
    hwidDeviceLimit: subscription.plan.remnawaveHwidDeviceLimit
  };
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<TResult>
) {
  const results: TResult[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex] as T);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

async function loadLinkedRemnawaveUuidRegistry(): Promise<LinkedRemnawaveUuidRegistry> {
  const linkedUsers = await prisma.user.findMany({
    where: {
      remnawaveUuid: { not: null }
    },
    select: {
      id: true,
      remnawaveUuid: true
    }
  });
  const linkedByUuid = new Map<string, string>();

  for (const linkedUser of linkedUsers) {
    if (linkedUser.remnawaveUuid) {
      linkedByUuid.set(linkedUser.remnawaveUuid, linkedUser.id);
    }
  }

  return {
    getLinkedRemoteUuids(userId: string) {
      return new Set(
        Array.from(linkedByUuid.entries())
          .filter(([, linkedUserId]) => linkedUserId !== userId)
          .map(([uuid]) => uuid)
      );
    },
    reserve(uuid: string, userId: string) {
      const linkedUserId = linkedByUuid.get(uuid);
      if (linkedUserId && linkedUserId !== userId) {
        return false;
      }

      linkedByUuid.set(uuid, userId);
      return true;
    }
  };
}

function toSyncMessage(
  outcome: RemnawaveIdentityResolutionOutcome | "skipped" | "failed",
  recovered: boolean,
  errorMessage?: string
) {
  if (outcome === "created") {
    return recovered
      ? "Recovered stale link by creating Remnawave user"
      : "Created Remnawave user";
  }

  if (outcome === "attached") {
    return recovered
      ? "Recovered stale link by attaching existing Remnawave user"
      : "Attached existing Remnawave user";
  }

  if (outcome === "alreadyLinked") {
    return "Already linked Remnawave user synced";
  }

  if (outcome === "skipped") {
    return "Unsafe remote matches prevented auto-attach";
  }

  return errorMessage ?? "Не удалось синхронизировать пользователя";
}

async function syncActiveSubscriptionCandidate(
  candidate: ActiveSubscriptionSyncCandidate,
  linkedUuidRegistry?: LinkedRemnawaveUuidRegistry
): Promise<ActiveSubscriptionSyncItem> {
  try {
    const seed = buildSubscriptionIdentitySeed(candidate);
    if (!seed || !candidate.plan) {
      throw new Error("Subscription plan missing");
    }

    const remnawave = await ensureRemnawaveIdentity(candidate.user, seed, {
      linkedUuidRegistry
    });
    const snapshot = await updateRemnawaveUser(remnawave.uuid, {
      expireAt: seed.expireAt.toISOString(),
      trafficLimitBytes: Number(seed.trafficLimitBytes ?? BigInt(0)),
      status: "ACTIVE",
      description: seed.description,
      tag: seed.tag,
      activeInternalSquads: seed.activeInternalSquads,
      externalSquadUuid: seed.externalSquadUuid,
      hwidDeviceLimit: seed.hwidDeviceLimit
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: candidate.user.id },
        data: {
          remnawaveUuid: snapshot.uuid,
          remnawaveUsername: snapshot.username,
          remnawaveShortUuid: snapshot.shortUuid ?? null
        }
      });
      await tx.subscription.update({
        where: { id: candidate.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          remnawaveLastSyncAt: new Date()
        }
      });
    });

    return {
      userId: candidate.user.id,
      email: candidate.user.email,
      outcome: remnawave.outcome,
      message: toSyncMessage(remnawave.outcome, remnawave.recovered)
    };
  } catch (error) {
    if (error instanceof RemnawaveIdentitySkipError) {
      return {
        userId: candidate.user.id,
        email: candidate.user.email,
        outcome: "skipped",
        message: toSyncMessage("skipped", false)
      };
    }

    return {
      userId: candidate.user.id,
      email: candidate.user.email,
      outcome: "failed",
      message: error instanceof Error ? error.message : "Не удалось синхронизировать пользователя"
    };
  }
}

export async function syncActiveSubscriptionsToRemnawave(): Promise<ActiveSubscriptionsSyncSummary> {
  const now = new Date();
  const candidates = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    },
    include: {
      plan: true,
      user: {
        select: {
          id: true,
          email: true,
          remnawaveUuid: true,
          remnawaveUsername: true,
          remnawaveShortUuid: true
        }
      }
    }
  });
  const linkedUuidRegistry = await loadLinkedRemnawaveUuidRegistry();

  const items = await mapWithConcurrency(
    candidates as ActiveSubscriptionSyncCandidate[],
    ACTIVE_SUBSCRIPTION_SYNC_CONCURRENCY,
    async (candidate) => syncActiveSubscriptionCandidate(candidate, linkedUuidRegistry)
  );

  return items.reduce<ActiveSubscriptionsSyncSummary>(
    (summary, item) => {
      summary.items.push(item);
      if (item.outcome === "created") {
        summary.created += 1;
      } else if (item.outcome === "attached") {
        summary.attached += 1;
      } else if (item.outcome === "alreadyLinked") {
        summary.alreadyLinked += 1;
      } else if (item.outcome === "skipped") {
        summary.skipped += 1;
      } else {
        summary.failed += 1;
      }
      return summary;
    },
    {
      totalCandidates: candidates.length,
      created: 0,
      attached: 0,
      alreadyLinked: 0,
      skipped: 0,
      failed: 0,
      items: []
    }
  );
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
  const savedActivationMeta = parseActivationMeta(payment.providerPayload);
  const startsAt = savedActivationMeta
    ? new Date(savedActivationMeta.startsAt)
    : existingSubscription?.startsAt ?? now;
  const expiresAt = savedActivationMeta
    ? new Date(savedActivationMeta.expiresAt)
    : new Date(
        (isActive && currentExpiry ? currentExpiry : now).getTime() +
          (payment.plan.durationDays * (payment.months ?? 1) + promoBonusDays) * 86400000
      );
  const newTrafficLimit = savedActivationMeta
    ? BigInt(savedActivationMeta.trafficLimitBytes)
    : bytesFromGb(payment.plan.trafficGB + promoBonusTrafficGb);
  const remnawaveTag = slugToRemnawaveTag(payment.plan.slug);
  const activationMeta = savedActivationMeta ?? {
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    trafficLimitBytes: newTrafficLimit.toString()
  };

  // Phase 1: Track activation intent in payload (no status change yet — payment stays PENDING
  // until Remnawave provisioning succeeds, so failures don't leave "paid but not provisioned" state).
  if (!savedActivationMeta) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPayload: mergePaymentPayload(payment.providerPayload, {
          activationMeta,
          activationState: "PROCESSING"
        })
      }
    });
  }

  try {
    // Phase 2: Remnawave provisioning. Idempotent (ensureRemnawaveIdentity handles existing users).
    // Runs outside the DB transaction because it's long-running and external.
    const remnawave = await ensureRemnawaveIdentity(payment.user, {
      expireAt: expiresAt,
      trafficLimitBytes: newTrafficLimit,
      description: `GickShop ${payment.plan.name}`,
      tag: remnawaveTag,
      activeInternalSquads: payment.plan.remnawaveInternalSquadUuids,
      externalSquadUuid: payment.plan.remnawaveExternalSquadUuid,
      hwidDeviceLimit: payment.plan.remnawaveHwidDeviceLimit
    });
    await resetRemnawaveTrafficIfReissuing(remnawave);

    const snapshot = await updateRemnawaveUser(remnawave.uuid, {
      expireAt: expiresAt.toISOString(),
      trafficLimitBytes: Number(newTrafficLimit),
      status: "ACTIVE",
      description: `GickShop ${payment.plan.name}`,
      tag: remnawaveTag,
      activeInternalSquads: payment.plan.remnawaveInternalSquadUuids,
      externalSquadUuid: payment.plan.remnawaveExternalSquadUuid,
      hwidDeviceLimit: payment.plan.remnawaveHwidDeviceLimit
    });
    await persistRemnawaveIdentity(payment.user.id, snapshot);

    // Phase 3: Atomic DB writes. pg_advisory_xact_lock serializes concurrent activations
    // for the same paymentId so promo counter, payment.subscriptionId, and side effects
    // happen exactly once even under racing webhooks/admin-refresh.
    const updatedPaymentPayload = mergePaymentPayload(payment.providerPayload, {
      activationMeta,
      activationState: "DONE",
      activationSnapshot: snapshot
    });

    const txResult = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment_activate:${payment.id}`})::bigint)`;

      const fresh = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      if (fresh.status === PaymentStatus.SUCCEEDED && fresh.subscriptionId) {
        return { payment: fresh, alreadyDone: true as const, subscriptionId: fresh.subscriptionId };
      }

      const subscription = await tx.subscription.upsert({
        where: { userId: payment.userId },
        update: {
          planId: payment.planId,
          status: SubscriptionStatus.ACTIVE,
          startsAt,
          expiresAt,
          trafficLimitBytes: newTrafficLimit,
          remnawaveLastSyncAt: new Date(),
          trafficUsedBytes: BigInt(0)
        },
        create: {
          userId: payment.userId,
          planId: payment.planId,
          status: SubscriptionStatus.ACTIVE,
          startsAt,
          expiresAt,
          trafficLimitBytes: newTrafficLimit,
          trafficUsedBytes: BigInt(0),
          remnawaveLastSyncAt: new Date()
        }
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: payment.paidAt ?? new Date(),
          subscriptionId: subscription.id,
          providerPayload: updatedPaymentPayload
        }
      });

      if (payment.promoCodeId) {
        await markPromoUsageSucceeded(payment.id, tx);
      }

      const finalPayment = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      return { payment: finalPayment, alreadyDone: false as const, subscriptionId: subscription.id };
    }, { timeout: 30_000 });

    if (txResult.alreadyDone) {
      return txResult.payment;
    }

    // Phase 4: Side effects. Idempotent (referral upsert dedupes; notification can be best-effort).
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
          subscriptionId: txResult.subscriptionId,
          provider: payment.provider
        }
      })
    ]);

    return txResult.payment;
  } catch (error) {
    logger.error("subscription.provision_failed", {
      paymentId: payment.id,
      userId: payment.userId,
      provider: payment.provider,
      error: serializeError(error)
    });
    await Promise.allSettled([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerPayload: mergePaymentPayload(payment.providerPayload, {
            activationMeta,
            activationState: "PROVISION_FAILED",
            lastError: error instanceof Error ? error.message : "Unknown activation error",
            lastErrorAt: new Date().toISOString()
          })
        }
      }),
      logAdminAction({
        action: "PAYMENT_ACTIVATION_FAILED",
        targetType: "PAYMENT",
        targetId: payment.id,
        details: {
          provider: payment.provider,
          error: error instanceof Error ? error.message : "Unknown activation error"
        }
      })
    ]);
    if (payment.promoCodeId) {
      await failPromoUsage(payment.id).catch(() => null);
    }
    throw error;
  }
}

async function syncUserSubscriptionInternal(userId: string) {
  const user = await getUserWithSubscription(userId);
  let externalSubscriptionUrl = buildRemnawaveSubscriptionUrl(user?.remnawaveShortUuid);

  if (!user?.remnawaveUuid) {
    return {
      user,
      externalSubscriptionUrl
    };
  }

  try {
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

      const recoveredIdentity = await ensureRemnawaveIdentity(user, recoverySeed);
      snapshot = await getRemnawaveUser(recoveredIdentity.uuid);
    }

    externalSubscriptionUrl = resolveExternalSubscriptionUrl(snapshot, user.remnawaveShortUuid ?? null);

    await persistRemnawaveIdentity(user.id, {
      uuid: snapshot.uuid,
      username: snapshot.username,
      shortUuid: snapshot.shortUuid ?? user.remnawaveShortUuid ?? null
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
    logger.error("subscription.sync_failed", {
      userId,
      remnawaveUuid: user.remnawaveUuid,
      error: serializeError(error)
    });
  }

  return {
    user: await getUserWithSubscription(userId),
    externalSubscriptionUrl
  };
}

export async function syncUserSubscription(userId: string) {
  const result = await syncUserSubscriptionInternal(userId);
  return result.user;
}

export async function syncUserSubscriptionForDashboard(userId: string) {
  return syncUserSubscriptionInternal(userId);
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
  // pg_try_advisory_lock returns false if another worker already holds it; we then
  // skip this tick instead of double-processing. Best-effort unlock in finally — if
  // the unlock query lands on a different pooled connection it silently no-ops, and
  // the lock auto-releases when the original connection is closed/reused.
  const lockKey = "cron:sync-expired";
  const acquired = await prisma.$queryRaw<Array<{ acquired: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey})::bigint) AS acquired
  `;

  if (acquired[0]?.acquired !== true) {
    getMetrics().cronExecutionDurationSeconds.observe(
      { job: "sync-expired", outcome: "skipped" },
      0
    );
    logger.info("cron.sync_expired.skipped", { reason: "lock_busy" });
    return 0;
  }

  const cronStart = process.hrtime.bigint();
  try {
    const expired = await prisma.subscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.DISABLED]
        },
        expiresAt: {
          lt: new Date()
        }
      },
      select: {
        id: true,
        user: {
          select: {
            email: true,
            remnawaveUuid: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      }
    });

    const batchSize = 10;

    for (let index = 0; index < expired.length; index += batchSize) {
      const batch = expired.slice(index, index + batchSize);
      await Promise.allSettled(
        batch.map(async (subscription) => {
          if (!subscription.user.remnawaveUuid) {
            return;
          }

          try {
            await disableRemnawaveUser(subscription.user.remnawaveUuid);
          } catch (error) {
            logger.error("subscription.remnawave_disable_failed", {
              subscriptionId: subscription.id,
              remnawaveUuid: subscription.user.remnawaveUuid,
              error: serializeError(error)
            });
          }
        })
      );
    }

    if (expired.length) {
      await prisma.subscription.updateMany({
        where: {
          id: {
            in: expired.map((subscription) => subscription.id)
          }
        },
        data: {
          status: SubscriptionStatus.EXPIRED
        }
      });

      // Best-effort user notifications. Failures are swallowed by Promise.allSettled
      // inside notifySubscriptionExpired; we only log if a delivery batch crashes hard.
      await Promise.allSettled(
        expired
          .filter((subscription) => subscription.user.email)
          .map((subscription) =>
            notifySubscriptionExpired({
              email: subscription.user.email,
              planName: subscription.plan?.name ?? null
            })
          )
      );
    }

    getMetrics().cronExecutionDurationSeconds.observe(
      { job: "sync-expired", outcome: "success" },
      Number(process.hrtime.bigint() - cronStart) / 1_000_000_000
    );
    return expired.length;
  } catch (cronError) {
    getMetrics().cronExecutionDurationSeconds.observe(
      { job: "sync-expired", outcome: "failed" },
      Number(process.hrtime.bigint() - cronStart) / 1_000_000_000
    );
    throw cronError;
  } finally {
    await prisma
      .$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey})::bigint)`
      .catch(() => null);
  }
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
  const trafficLimitBytes = bytesFromGb(trafficGB);
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
  await resetRemnawaveTrafficIfReissuing(remnawave);
  const snapshot = await updateRemnawaveUser(remnawave.uuid, {
    expireAt: expiresAt.toISOString(),
    trafficLimitBytes: Number(trafficLimitBytes),
    status: "ACTIVE",
    description: `Admin grant: ${plan.name}`,
    tag: remnawaveTag,
    activeInternalSquads: plan.remnawaveInternalSquadUuids,
    externalSquadUuid: plan.remnawaveExternalSquadUuid,
    hwidDeviceLimit: plan.remnawaveHwidDeviceLimit
  });
  await persistRemnawaveIdentity(user.id, snapshot);

  const subscription = current
    ? await prisma.subscription.update({
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
    : await prisma.subscription.create({
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
