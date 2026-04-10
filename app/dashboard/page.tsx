import { redirect } from "next/navigation";
import Link from "next/link";

import { DashboardOverviewBlocks } from "@/components/blocks/dashboard/dashboard-overview-blocks";
import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/auth";
import { getUserPaymentHistory } from "@/lib/services/payments";
import { syncUserSubscription } from "@/lib/services/subscriptions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [user, syncedUser, payments] = await Promise.all([
    getUserById(session.userId),
    syncUserSubscription(session.userId),
    getUserPaymentHistory(session.userId)
  ]);

  const activeUser = syncedUser ?? user;
  const subscription = activeUser?.subscription ?? null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const remnawaveBaseUrl = process.env.REMNAWAVE_BASE_URL?.replace(/\/$/, "");
  const referralLink = user?.referralCode ? `${siteUrl}/register?ref=${user.referralCode}` : "";
  const externalSubscriptionUrl =
    activeUser?.remnawaveShortUuid && remnawaveBaseUrl
      ? `${remnawaveBaseUrl}/api/sub/${activeUser.remnawaveShortUuid}`
      : null;
  const recentPayments = payments.slice(0, 5).map((payment) => ({
    id: payment.id,
    userInitial: session.email.slice(0, 1).toUpperCase(),
    userLabel: session.email,
    createdAt: payment.createdAt,
    status:
      payment.status === "SUCCEEDED"
        ? "completed"
        : payment.status === "FAILED"
          ? "failed"
          : payment.status === "PENDING"
            ? "pending"
            : "process"
  }));

  return (
    <div className="dashShellPageWrapper">
      <DashboardPageHeader
        title="Обзор"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Обзор" }
        ]}
        action={
          <Link href="/dashboard/buy" className="dashSidebarCta">
            КУПИТЬ ПОДПИСКУ
          </Link>
        }
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
        recentPayments={recentPayments}
        referralLink={referralLink}
        externalSubscriptionUrl={externalSubscriptionUrl}
        remnawaveUuid={activeUser?.remnawaveUuid ?? null}
      />
    </div>
  );
}
