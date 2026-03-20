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
    <div className="container py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Pricing</p>
        <h1 className="mt-3 font-['Space_Grotesk'] text-4xl font-semibold">Тарифы GickVPN</h1>
        <p className="mt-3 text-muted-foreground">Каждый тариф активируется через личный кабинет, поддерживает продление и работает с промокодами.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-violet-500/12 to-blue-500/12">
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.highlight ? <Badge>{plan.highlight}</Badge> : null}
              </div>
              <CardDescription>{plan.description || "VPN-подписка с предсказуемым лимитом."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-3xl font-semibold">{formatCurrency(plan.price)}</p>
                <p className="text-sm text-muted-foreground">{plan.durationDays} дней</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{plan.trafficGB} ГБ трафика</li>
                <li>Покупка через ЮKassa и Platega</li>
                <li>История платежей в кабинете</li>
                <li>Продление без потери остатка</li>
              </ul>
              <Button asChild className="w-full">
                <Link href={purchaseHref}>Купить тариф</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
