import Link from "next/link";
import type { Plan } from "@prisma/client";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

export function PricingGrid({
  plans,
  compact = false
}: {
  plans: Plan[];
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-6 ${compact ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
      {plans.map((plan) => (
        <Card key={plan.id} className="relative overflow-hidden">
          {plan.highlight ? (
            <div className="absolute right-4 top-4">
              <Badge>{plan.highlight}</Badge>
            </div>
          ) : null}
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <p className="text-3xl font-semibold text-white">{formatPrice(plan.price)}</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-300" />
              {plan.durationDays} дней доступа
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-300" />
              {plan.trafficGB} ГБ трафика
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-300" />
              Подключение после оплаты
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/buy" className="w-full">
              <Button className="w-full justify-between">
                Купить
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
