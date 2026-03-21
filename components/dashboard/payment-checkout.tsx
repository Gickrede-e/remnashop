"use client";

import { memo, useCallback, useMemo, useState, useTransition } from "react";
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

const CheckoutPlanCard = memo(function CheckoutPlanCard({
  active,
  plan,
  onSelect
}: {
  active: boolean;
  plan: Plan;
  onSelect: (planId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      aria-pressed={active}
      className={`page-surface w-full text-left transition-colors ${active ? "ring-2 ring-violet-400/70" : "hover:bg-white/[0.05]"}`}
    >
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              {plan.highlight ? (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
                  {plan.highlight}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-zinc-400">
              {plan.description?.trim() ? plan.description : "Подписка активируется автоматически после оплаты."}
            </p>
          </div>
          <p className="shrink-0 text-lg font-semibold text-white">{formatPrice(plan.price)}</p>
        </div>

        <div className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            {plan.durationDays} дней, {plan.trafficGB} ГБ
          </p>
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            {active ? "Выбран для оплаты" : "Нажмите, чтобы выбрать"}
          </p>
        </div>
      </div>
    </button>
  );
});

export function PaymentCheckout({ plans }: { plans: Plan[] }) {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<PromoState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const resolvedSelectedPlanId = useMemo(
    () => (plans.some((plan) => plan.id === selectedPlanId) ? selectedPlanId : plans[0]?.id ?? ""),
    [plans, selectedPlanId]
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === resolvedSelectedPlanId) ?? plans[0] ?? null,
    [plans, resolvedSelectedPlanId]
  );

  const finalAmount = promoState?.finalAmount ?? selectedPlan?.price ?? 0;

  const handleSelectPlan = useCallback((planId: string) => {
    setSelectedPlanId(planId);
    setPromoState(null);
  }, []);

  const validatePromo = useCallback(() => {
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
  }, [promoCode, selectedPlan, startTransition]);

  const createPayment = useCallback((provider: PaymentProvider) => {
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
  }, [promoCode, selectedPlan, startTransition]);

  if (plans.length === 0) {
    return (
      <Card className="surface-soft">
        <CardHeader>
          <CardTitle>Нет доступных тарифов</CardTitle>
          <CardDescription>
            Сейчас активные тарифы не найдены. Проверьте настройки тарифов в админке и повторите попытку.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-5">
      <Card className="surface-soft overflow-hidden">
        <CardHeader className="space-y-2">
          <CardTitle>1. Выберите тариф</CardTitle>
          <CardDescription>Планы показаны сразу с ценой и объёмом. Смена плана сохраняет текущий поток оплаты.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {plans.map((plan) => (
            <CheckoutPlanCard
              key={plan.id}
              active={resolvedSelectedPlanId === plan.id}
              onSelect={handleSelectPlan}
              plan={plan}
            />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>2. Промокод и оплата</CardTitle>
            <CardDescription>Проверьте промокод перед созданием платежа и выберите провайдера.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="promoCode">Промокод</Label>
              <div className="grid gap-2">
                <Input
                  id="promoCode"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                />
                <Button type="button" variant="secondary" onClick={validatePromo} disabled={pending}>
                  Проверить промокод
                </Button>
              </div>
            </div>

            {message ? <p className="text-sm leading-5 text-zinc-400">{message}</p> : null}

            <div className="grid gap-3">
              <Button className="w-full" onClick={() => createPayment(PaymentProvider.YOOKASSA)} disabled={pending}>
                Оплатить через ЮKassa
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => createPayment(PaymentProvider.PLATEGA)} disabled={pending}>
                Оплатить через Platega
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-soft">
          <CardHeader className="space-y-2">
            <CardTitle>3. Краткая сводка</CardTitle>
            <CardDescription>Итоговая сумма и бонусы видны до перехода на страницу оплаты.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-400">Текущий тариф</p>
                  <p className="truncate text-base font-semibold text-white">{selectedPlan?.name ?? "Не выбран"}</p>
                </div>
                <p className="shrink-0 text-sm font-medium text-white">{formatPrice(selectedPlan?.price ?? 0)}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
              <div className="flex items-center justify-between gap-4">
                <span>Базовая цена</span>
                <span>{formatPrice(selectedPlan?.price ?? 0)}</span>
              </div>
              {promoState?.discountAmount ? (
                <div className="flex items-center justify-between gap-4 text-cyan-300">
                  <span>Скидка</span>
                  <span>-{formatPrice(promoState.discountAmount)}</span>
                </div>
              ) : null}
              {promoState?.bonusDays ? (
                <div className="flex items-center justify-between gap-4">
                  <span>Бонусные дни</span>
                  <span>+{promoState.bonusDays}</span>
                </div>
              ) : null}
              {promoState?.bonusTrafficGb ? (
                <div className="flex items-center justify-between gap-4">
                  <span>Бонусный трафик</span>
                  <span>+{promoState.bonusTrafficGb} ГБ</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 text-base font-semibold text-white">
                <span>Итого</span>
                <span>{formatPrice(finalAmount)}</span>
              </div>
            </div>

            <div className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                {selectedPlan?.durationDays ?? 0} дней доступа
              </p>
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                {selectedPlan?.trafficGB ?? 0} ГБ трафика
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
