// Bulk sync of every ACTIVE subscription to Remnawave (admin "sync all"):
// ensures each user has a linked panel account and pushes the plan limits.

import { SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { slugToRemnawaveTag } from "@/lib/utils";
import { hasPendingActivation } from "@/lib/services/payment-activation";
import {
  FAR_FUTURE_REMNAWAVE_EXPIRY,
  type LinkedRemnawaveUuidRegistry,
  type RemnawaveIdentityResolutionOutcome,
  type RemnawaveIdentitySeed,
  RemnawaveIdentitySkipError,
  provisionRemnawaveIdentity,
  loadLinkedRemnawaveUuidRegistry
} from "@/lib/services/remnawave-identity";

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

export type ActiveSubscriptionsSyncSummary = {
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
  user: { id: string; email: string };
};

const ACTIVE_SUBSCRIPTION_SYNC_CONCURRENCY = 3;
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
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'user_provision:' + candidate.user.id}))`;
      const current = await tx.subscription.findUnique({
        where: { id: candidate.id },
        include: { plan: true, user: true }
      });
      if (!current || current.status !== SubscriptionStatus.ACTIVE ||
          (current.expiresAt && current.expiresAt <= new Date())) {
        return {
          userId: candidate.user.id,
          email: candidate.user.email,
          outcome: "skipped",
          message: "Subscription is no longer active"
        };
      }
      if (await hasPendingActivation(current.userId, tx)) {
        return {
          userId: current.user.id,
          email: current.user.email,
          outcome: "skipped",
          message: "Paid subscription activation is pending"
        };
      }

      const seed = buildSubscriptionIdentitySeed(current);
      if (!seed || !current.plan) {
        throw new Error("Subscription plan missing");
      }

      const remnawave = await provisionRemnawaveIdentity(current.user, seed, {
        linkedUuidRegistry,
        db: tx,
        resetTraffic: false
      });
      await tx.subscription.update({
        where: { id: current.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          remnawaveLastSyncAt: new Date()
        }
      });

      return {
        userId: current.user.id,
        email: current.user.email,
        outcome: remnawave.outcome,
        message: toSyncMessage(remnawave.outcome, remnawave.recovered)
      };
    }, { timeout: 120_000 });
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
    select: {
      id: true,
      user: { select: { id: true, email: true } }
    }
  });
  const linkedUuidRegistry = await loadLinkedRemnawaveUuidRegistry();

  const items = await mapWithConcurrency(
    candidates,
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
