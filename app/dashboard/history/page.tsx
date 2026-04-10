import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { PaymentHistoryList } from "@/components/blocks/dashboard/payment-history-list";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardHistoryPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const payments = await prisma.payment.findMany({
    where: {
      userId: session.userId
    },
    include: {
      plan: true,
      promoCode: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageHistory dashShellPageWrapper">
      <DashboardPageHeader
        title="История"
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "История" }]}
      />
      <PaymentHistoryList payments={payments} />
    </div>
  );
}
