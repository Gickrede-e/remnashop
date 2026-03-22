import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk } from "@/lib/http";
import { logAdminAction } from "@/lib/services/admin-logs";
import { syncActiveSubscriptionsToRemnawave } from "@/lib/services/subscriptions";

export async function POST(_: Request) {
  try {
    const session = await requireApiAdminSession();
    const summary = await syncActiveSubscriptionsToRemnawave();

    await logAdminAction({
      adminId: session.userId,
      action: "SYNC_ACTIVE_USERS",
      targetType: "USER",
      targetId: "active-subscriptions",
      details: {
        counts: {
          totalCandidates: summary.totalCandidates,
          created: summary.created,
          attached: summary.attached,
          alreadyLinked: summary.alreadyLinked,
          skipped: summary.skipped,
          failed: summary.failed
        },
        skippedUserIds: summary.items
          .filter((item) => item.outcome === "skipped")
          .map((item) => item.userId),
        failedUserIds: summary.items
          .filter((item) => item.outcome === "failed")
          .map((item) => item.userId)
      }
    });

    return apiOk(summary);
  } catch (error) {
    return apiError(
      error instanceof Error
        ? error.message
        : "Не удалось синхронизировать активные подписки",
      400
    );
  }
}
