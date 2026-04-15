import { redirect } from "next/navigation";

import { DashboardOverviewBlocks } from "@/components/blocks/dashboard/dashboard-overview-blocks";
import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
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
  const remnawaveBaseUrl = process.env.REMNAWAVE_BASE_URL?.replace(/\/$/, "");
  const referralLink = user?.referralCode ? `${env.siteUrl}/register?ref=${user.referralCode}` : "";
  const externalSubscriptionUrl =
    activeUser?.remnawaveShortUuid && remnawaveBaseUrl
      ? `${remnawaveBaseUrl}/api/sub/${activeUser.remnawaveShortUuid}`
      : null;

  return (
    <div className="dashShellPageWrapper">
      <DashboardPageHeader
        title="Подписка"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Подписка" }
        ]}
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
        remnawaveUuid={activeUser?.remnawaveUuid ?? null}
      />
    </div>
  );
}
