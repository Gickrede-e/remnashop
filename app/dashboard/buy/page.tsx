import { redirect } from "next/navigation";

import { PaymentCheckout } from "@/components/dashboard/payment-checkout";
import { getSession } from "@/lib/auth/session";
import { getActivePlans } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export default async function DashboardBuyPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const plans = await getActivePlans();

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Покупка</p>
        <h1 className="text-4xl font-semibold text-white">Выберите тариф и способ оплаты</h1>
      </div>
      <PaymentCheckout plans={plans} />
    </>
  );
}
