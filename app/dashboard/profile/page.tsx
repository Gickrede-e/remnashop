import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { ProfileOverviewBlocks } from "@/components/blocks/dashboard/profile-overview-blocks";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="dashShellPageWrapper">
      <DashboardPageHeader
        title="Профиль"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Профиль" }
        ]}
      />
      <ProfileOverviewBlocks email={session.email} />
    </div>
  );
}
