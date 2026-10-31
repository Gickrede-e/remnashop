import { redirect } from "next/navigation";

import { CabinetTour } from "@/components/blocks/dashboard/cabinet-tour";
import { DashboardOverviewBlocks } from "@/components/blocks/dashboard/dashboard-overview-blocks";
import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getUserById } from "@/lib/services/auth";
import { syncUserSubscriptionForDashboard } from "@/lib/services/subscriptions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [user, synced] = await Promise.all([
    getUserById(session.userId),
    syncUserSubscriptionForDashboard(session.userId)
  ]);

  const activeUser = synced.user ?? user;
  const subscription = activeUser?.subscription ?? null;
  const externalSubscriptionUrl = synced.externalSubscriptionUrl;

  const subscriptionSummary = subscription
    ? {
        status: subscription.status,
        planName: subscription.plan?.name ?? null,
        expiresAt: subscription.expiresAt,
        trafficLimitBytes: subscription.trafficLimitBytes,
        trafficUsedBytes: subscription.trafficUsedBytes
      }
    : null;

  return (
    <div className="dashShellPageWrapper">
      <DashboardPageHeader
        title="Подписка"
        crumbs={[
          { label: "Кабинет", href: "/dashboard" },
          { label: "Подписка" }
        ]}
      />
      <DashboardOverviewBlocks
        subscription={subscriptionSummary}
        externalSubscriptionUrl={externalSubscriptionUrl}
        remnawaveUuid={activeUser?.remnawaveUuid ?? null}
        referralBonusDays={env.referralBonusDays}
      />
      <CabinetTour />
    </div>
  );
}
