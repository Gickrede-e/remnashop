import { redirect } from "next/navigation";

import { ReferralSummaryBlocks } from "@/components/blocks/dashboard/referral-summary-blocks";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/auth";
import { getMyReferralSummary } from "@/lib/services/referrals";

export const dynamic = "force-dynamic";

export default async function DashboardReferralsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [user, summary] = await Promise.all([getUserById(session.userId), getMyReferralSummary(session.userId)]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const referralLink = user?.referralCode ? `${siteUrl}/register?ref=${user.referralCode}` : "";

  return (
    <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageReferrals">
      <ScreenHeader
        eyebrow="Личный кабинет"
        title="Рефералы"
        description="Ваша ссылка для приглашений, список регистраций и история начисленных наград в мобильном формате."
      />
      <ReferralSummaryBlocks
        referralLink={referralLink}
        referredUsers={summary.referredUsers}
        rewards={summary.rewards}
      />
    </div>
  );
}
