import { redirect } from "next/navigation";

import { DashboardOverviewBlocks } from "@/components/blocks/dashboard/dashboard-overview-blocks";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/auth";
import { syncUserSubscription } from "@/lib/services/subscriptions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [user, syncedUser] = await Promise.all([
    getUserById(session.userId),
    syncUserSubscription(session.userId)
  ]);

  const activeUser = syncedUser ?? user;
  const subscription = activeUser?.subscription ?? null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const remnawaveBaseUrl = process.env.REMNAWAVE_BASE_URL?.replace(/\/$/, "");
  const referralLink = activeUser?.referralCode ? `${siteUrl}/register?ref=${activeUser.referralCode}` : "";
  const externalSubscriptionUrl =
    activeUser?.remnawaveShortUuid && remnawaveBaseUrl
      ? `${remnawaveBaseUrl}/api/sub/${activeUser.remnawaveShortUuid}`
      : null;

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Личный кабинет"
        title="Обзор"
        description="Подписка, быстрые действия и ссылка для доступа к вашему профилю."
      />
      <DashboardOverviewBlocks
        subscription={
          subscription
            ? {
                status: subscription.status,
                planName: subscription.plan?.name ?? null,
                expiresAt: subscription.expiresAt,
                trafficLimitBytes: subscription.trafficLimitBytes,
                trafficUsedBytes: subscription.trafficUsedBytes
              }
            : null
        }
        referralLink={referralLink}
        externalSubscriptionUrl={externalSubscriptionUrl}
      />
    </div>
  );
}
