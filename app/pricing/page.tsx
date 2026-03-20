import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { buildLoginHref } from "@/lib/auth/navigation";
import { getPublicPlans } from "@/lib/services/plans";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const session = await getSession();
  const plans = await getPublicPlans();
  const purchaseHref = session ? "/dashboard/buy" : buildLoginHref("/dashboard/buy");

  return (
    <div className="container py-8 sm:py-10 lg:py-14">
      <div className="grid gap-6">
        <section className="surface-feature overflow-hidden p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-end">
            <div className="space-y-4">
              <p className="section-kicker">Тарифы</p>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                  Выберите тариф под свой ритм и подключайтесь без лишних шагов.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                  Все условия видны сразу: цена, срок, объём трафика и метки выгоды. После оплаты доступ
                  появляется в кабинете автоматически.
                </p>
              </div>
            </div>

            <div className="surface-soft grid gap-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-400">Способы оплаты</span>
                <span className="text-sm font-medium text-white">ЮKassa и Platega</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-400">Промокоды</span>
                <span className="text-sm font-medium text-white">Поддерживаются</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-400">Продление</span>
                <span className="text-sm font-medium text-white">Без потери остатка</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`overflow-hidden ${plan.highlight ? "surface-feature border-sky-300/18" : "surface-soft"}`}
            >
              <CardHeader className="gap-4 border-b border-white/8 bg-gradient-to-br from-sky-400/8 via-transparent to-transparent p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription className="leading-6">
                      {plan.description || "Полный доступ к VPN, личный кабинет и удобное продление."}
                    </CardDescription>
                  </div>
                  {plan.highlight ? <Badge className="shrink-0">{plan.highlight}</Badge> : null}
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-semibold text-white">{formatCurrency(plan.price)}</p>
                  <p className="text-sm text-zinc-400">{plan.durationDays} дней доступа</p>
                </div>
              </CardHeader>
              <CardContent className="flex h-full flex-col gap-5 p-5 sm:p-6">
                <ul className="grid gap-3 text-sm leading-6 text-zinc-300">
                  <li className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                    {plan.trafficGB} ГБ трафика
                  </li>
                  <li className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                    История платежей и управление в кабинете
                  </li>
                  <li className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                    Продление с сохранением дней и трафика
                  </li>
                </ul>
                <Button asChild className="mt-auto w-full">
                  <Link href={purchaseHref}>Купить тариф</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
