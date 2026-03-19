"use client";

import { useMemo, useState, useTransition } from "react";
import { PaymentProvider, type Plan } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";

type PromoState = {
  finalAmount: number;
  discountAmount: number;
  bonusDays: number;
  bonusTrafficGb: number;
} | null;

export function PaymentCheckout({ plans }: { plans: Plan[] }) {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<PromoState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId]
  );

  const finalAmount = promoState?.finalAmount ?? selectedPlan?.price ?? 0;

  const validatePromo = () => {
    if (!selectedPlan || !promoCode.trim()) {
      setPromoState(null);
      setMessage("Введите промокод для проверки.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: promoCode.trim(),
          planId: selectedPlan.id
        })
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        data?: {
          finalAmount?: number;
          discountAmount?: number;
          bonusDays?: number;
          bonusTrafficGb?: number;
        };
      };

      if (!response.ok || !payload.ok || !payload.data) {
        setPromoState(null);
        setMessage(payload.error ?? "Промокод недоступен");
        return;
      }

      setPromoState({
        finalAmount: payload.data.finalAmount ?? selectedPlan.price,
        discountAmount: payload.data.discountAmount ?? 0,
        bonusDays: payload.data.bonusDays ?? 0,
        bonusTrafficGb: payload.data.bonusTrafficGb ?? 0
      });
      setMessage("Промокод применён.");
    });
  };

  const createPayment = (provider: PaymentProvider) => {
    if (!selectedPlan) {
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          provider,
          promoCode: promoCode.trim() || undefined
        })
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        data?: {
          redirectUrl?: string;
        };
      };

      if (!response.ok || !payload.ok || !payload.data?.redirectUrl) {
        setMessage(payload.error ?? "Не удалось создать платёж");
        return;
      }

      window.location.href = payload.data.redirectUrl;
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="grid gap-4">
        {plans.map((plan) => {
          const active = selectedPlanId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                setSelectedPlanId(plan.id);
                setPromoState(null);
              }}
              className={`page-surface text-left transition ${active ? "ring-2 ring-violet-400/70" : "hover:bg-white/[0.05]"}`}
            >
              <div className="flex items-start justify-between gap-4 p-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                  <p className="text-sm text-zinc-400">
                    {plan.durationDays} дней, {plan.trafficGB} ГБ
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-white">{formatPrice(plan.price)}</p>
                  {plan.highlight ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-300">{plan.highlight}</p>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Оформление</CardTitle>
          <CardDescription>Проверьте тариф, промокод и выберите способ оплаты.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="promoCode">Промокод</Label>
            <div className="flex gap-2">
              <Input
                id="promoCode"
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                placeholder="WELCOME10"
              />
              <Button type="button" variant="secondary" onClick={validatePromo} disabled={pending}>
                Проверить
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
            <div className="flex items-center justify-between">
              <span>Базовая цена</span>
              <span>{formatPrice(selectedPlan?.price ?? 0)}</span>
            </div>
            {promoState?.discountAmount ? (
              <div className="flex items-center justify-between text-cyan-300">
                <span>Скидка</span>
                <span>-{formatPrice(promoState.discountAmount)}</span>
              </div>
            ) : null}
            {promoState?.bonusDays ? (
              <div className="flex items-center justify-between">
                <span>Бонусные дни</span>
                <span>+{promoState.bonusDays}</span>
              </div>
            ) : null}
            {promoState?.bonusTrafficGb ? (
              <div className="flex items-center justify-between">
                <span>Бонусный трафик</span>
                <span>+{promoState.bonusTrafficGb} ГБ</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
              <span>Итого</span>
              <span>{formatPrice(finalAmount)}</span>
            </div>
          </div>

          {message ? <p className="text-sm text-zinc-400">{message}</p> : null}

          <div className="grid gap-3">
            <Button onClick={() => createPayment(PaymentProvider.YOOKASSA)} disabled={pending}>
              Оплатить через ЮKassa
            </Button>
            <Button variant="secondary" onClick={() => createPayment(PaymentProvider.PLATEGA)} disabled={pending}>
              Оплатить через Platega
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
