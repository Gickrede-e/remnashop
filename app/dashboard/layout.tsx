import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/sidebar-nav";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container py-6 md:py-8 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar />
        <div className="grid min-w-0 gap-6">{children}</div>
      </div>
    </div>
  );
}
