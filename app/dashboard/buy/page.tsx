import { redirect } from "next/navigation";

import { PaymentCheckout } from "@/components/dashboard/payment-checkout";
import { ScreenHeader } from "@/components/shell/screen-header";
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
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Покупка"
        title="Купить тариф"
        description={`Выберите план, проверьте итоговую цену${plans.length > 0 ? ` из ${plans.length} доступных` : ""} и перейдите к оплате.`}
      />
      <PaymentCheckout plans={plans} />
    </div>
  );
}
