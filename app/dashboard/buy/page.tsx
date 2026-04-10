import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { PaymentCheckout } from "@/components/dashboard/payment-checkout";
import { buildLoginHref } from "@/lib/auth/navigation";
import { getSession } from "@/lib/auth/session";
import { getActivePlans } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export default async function DashboardBuyPage() {
  const session = await getSession();
  if (!session) {
    redirect(buildLoginHref("/dashboard/buy"));
  }

  const plans = await getActivePlans();

  return (
    <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageBuy dashShellPageWrapper">
      <DashboardPageHeader
        title="Купить"
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Купить" }]}
      />
      <PaymentCheckout plans={plans} />
    </div>
  );
}
