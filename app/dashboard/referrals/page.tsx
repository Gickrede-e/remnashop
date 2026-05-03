import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { ReferralSummaryBlocks } from "@/components/blocks/dashboard/referral-summary-blocks";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getUserById } from "@/lib/services/auth";
import { getMyReferralSummary } from "@/lib/services/referrals";

export const dynamic = "force-dynamic";

export default async function DashboardReferralsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [user, summary] = await Promise.all([getUserById(session.userId), getMyReferralSummary(session.userId)]);
  const referralLink = user?.referralCode ? `${env.siteUrl}/register?ref=${user.referralCode}` : "";

  return (
    <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageReferrals dashShellPageWrapper">
      <DashboardPageHeader
        title="Рефералы"
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Рефералы" }]}
      />
      <ReferralSummaryBlocks
        referralLink={referralLink}
        referredUsers={summary.referredUsers}
        rewards={summary.rewards}
      />
    </div>
  );
}
