import { SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/server/logger";
import { getMetrics } from "@/lib/server/metrics";
import { notifySubscriptionExpired } from "@/lib/services/notifications";

const EXPIRE_LOCK_KEY = "cron:sync-expired";

function observeExpireTick(outcome: "success" | "failed" | "skipped", seconds: number) {
  getMetrics().cronExecutionDurationSeconds.observe({ job: "sync-expired", outcome }, seconds);
}

// Flips stale ACTIVE/DISABLED subscriptions to EXPIRED and notifies the users.
// The read+write pair runs under a transaction-scoped advisory lock, so two
// overlapping cron workers can't both process (and notify for) the same rows:
// the loser sees acquired=false and skips the tick. The lock lives and dies with
// the transaction's connection, so there is no separate unlock to get wrong.
export async function expireStaleSubscriptions() {
  const cronStart = process.hrtime.bigint();
  const elapsed = () => Number(process.hrtime.bigint() - cronStart) / 1_000_000_000;

  try {
    const expired = await prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ acquired: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtext(${EXPIRE_LOCK_KEY})::bigint) AS acquired
      `;
      if (lock[0]?.acquired !== true) {
        return null;
      }

      const rows = await tx.subscription.findMany({
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.DISABLED] },
          expiresAt: { lt: new Date() }
        },
        select: {
          id: true,
          user: { select: { email: true } },
          plan: { select: { name: true } }
        }
      });

      // Deliberately no Remnawave call here: the panel already has each user's
      // expireAt (pushed on every activation/renewal) and flips them to EXPIRED on
      // its own. Forcing /actions/disable would overwrite that with DISABLED — a
      // manual-lock status reserved for explicit admin actions (revoke / toggle).
      if (rows.length) {
        // Re-check expiresAt/status at write time, not just the id set captured
        // above: a subscription renewed between the two queries now has a future
        // expiresAt and must not be forced back to EXPIRED.
        await tx.subscription.updateMany({
          where: {
            id: { in: rows.map((subscription) => subscription.id) },
            expiresAt: { lt: new Date() },
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.DISABLED] }
          },
          data: { status: SubscriptionStatus.EXPIRED }
        });
      }
      return rows;
    });

    if (expired === null) {
      observeExpireTick("skipped", 0);
      logger.info("cron.sync_expired.skipped", { reason: "lock_busy" });
      return 0;
    }

    // Best-effort notifications after commit; notifySubscriptionExpired swallows
    // per-channel failures itself.
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

    observeExpireTick("success", elapsed());
    return expired.length;
  } catch (error) {
    observeExpireTick("failed", elapsed());
    throw error;
  }
}
