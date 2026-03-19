"use client";

import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  trafficGB: number;
  price: number;
  highlight: string | null;
};

type PromoResult = {
  finalAmount: number;
  originalAmount: number;
  discountAmount: number;
  bonuses: {
    extraDays: number;
    extraTrafficGb: number;
  };
};

export function PaymentCheckout({ plans }: { plans: Plan[] }) {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId]);

  const validatePromo = () => {
    if (!promoCode || !selectedPlanId) {
      setPromoResult(null);
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: promoCode,
          planId: selectedPlanId
        })
      });

      const payload = (await response.json()) as { ok: boolean; data?: PromoResult; error?: { message?: string } };

      if (!response.ok || !payload.ok || !payload.data) {
        setPromoResult(null);
        setError(payload.error?.message ?? "Промокод не принят");
        return;
      }

      setPromoResult(payload.data);
    });
  };

  const createPayment = (provider: "YOOKASSA" | "PLATEGA") => {
    if (!selectedPlanId) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          provider,
          promoCode: promoCode || undefined
        })
      });

      const payload = (await response.json()) as {
        ok: boolean;
        data?: { redirectUrl?: string };
        error?: { message?: string };
      };

      if (!response.ok || !payload.ok || !payload.data?.redirectUrl) {
        setError(payload.error?.message ?? "Не удалось создать платёж");
        return;
      }

      window.location.href = payload.data.redirectUrl;
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => {
          const selected = plan.id === selectedPlanId;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                setSelectedPlanId(plan.id);
                setPromoResult(null);
              }}
              className={`page-surface text-left transition ${selected ? "ring-2 ring-violet-500/30" : "hover:border-white/20"}`}
            >
              <div className="p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-['Space_Grotesk'] text-xl font-semibold">{plan.name}</h3>
                  {plan.highlight ? <Badge>{plan.highlight}</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description || "VPN-подписка для стабильной повседневной работы."}</p>
                <div className="mt-5 flex items-end justify-between">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{plan.durationDays} дней</p>
                    <p>{plan.trafficGB} ГБ трафика</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-foreground">{formatCurrency(plan.price)}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">RUB</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Промокод и оплата</CardTitle>
          <CardDescription>Выберите способ оплаты: ЮKassa или Platega.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="promo">Промокод</Label>
              <Input id="promo" placeholder="WELCOME10" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="w-full md:w-auto" type="button" variant="secondary" onClick={validatePromo} disabled={pending}>
                Проверить
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Базовая стоимость</span>
              <span>{selectedPlan ? formatCurrency(selectedPlan.price) : "—"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Итоговая сумма</span>
              <span className="font-semibold">
                {formatCurrency(promoResult?.finalAmount ?? selectedPlan?.price ?? 0)}
              </span>
            </div>
            {promoResult?.discountAmount ? (
              <p className="mt-2 text-emerald-300">Скидка: {formatCurrency(promoResult.discountAmount)}</p>
            ) : null}
            {promoResult?.bonuses.extraDays ? (
              <p className="mt-1 text-sky-300">Бонус: +{promoResult.bonuses.extraDays} дней</p>
            ) : null}
            {promoResult?.bonuses.extraTrafficGb ? (
              <p className="mt-1 text-sky-300">Бонус: +{promoResult.bonuses.extraTrafficGb} ГБ</p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </CardContent>
        <CardFooter className="grid gap-3 md:grid-cols-2">
          <Button disabled={pending || !selectedPlanId} onClick={() => createPayment("YOOKASSA")}>
            Оплатить через ЮKassa
          </Button>
          <Button disabled={pending || !selectedPlanId} onClick={() => createPayment("PLATEGA")} variant="secondary">
            Оплатить через Platega
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
