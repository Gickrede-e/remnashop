import { redirect } from "next/navigation";

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
    <div className="grid gap-6">
      <section className="surface-feature p-5 sm:p-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)] xl:items-end">
          <div className="space-y-3">
            <p className="section-kicker">Покупка</p>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Выберите тариф и способ оплаты</h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Итоговая цена видна до оплаты. Если у вас есть промокод, примените его прямо здесь и
              переходите к оплате без лишних шагов.
            </p>
          </div>

          <div className="surface-soft grid gap-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-400">Тарифов доступно</span>
              <span className="text-sm font-medium text-white">{plans.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-400">Промокоды</span>
              <span className="text-sm font-medium text-white">Можно применить до оплаты</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-400">Активация</span>
              <span className="text-sm font-medium text-white">Автоматически после оплаты</span>
            </div>
          </div>
        </div>
      </section>

      <PaymentCheckout plans={plans} />
    </div>
  );
}
