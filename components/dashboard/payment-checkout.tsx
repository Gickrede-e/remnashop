"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { PaymentProvider, type Plan } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";

type PromoState = {
  finalAmount: number;
  discountAmount: number;
  bonusDays: number;
  bonusTrafficGb: number;
} | null;

const CheckoutPlanCard = memo(function CheckoutPlanCard({
  active,
  disabled,
  plan,
  onSelect
}: {
  active: boolean;
  disabled: boolean;
  plan: Plan;
  onSelect: (planId: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(plan.id)}
      aria-pressed={active}
      className={cn(
        "checkoutPlanOption",
        active && "checkoutPlanOptionCurrent",
        disabled && "checkoutPlanOptionDisabled"
      )}
    >
      <div className="checkoutPlanBody">
        <div className="checkoutPlanHead">
          <div className="checkoutPlanCopy">
            <div className="checkoutPlanNameRow">
              <h3 className="checkoutPlanTitle">{plan.name}</h3>
              {plan.highlight ? (
                <span className="checkoutPlanBadge">
                  {plan.highlight}
                </span>
              ) : null}
            </div>
            <p className="checkoutPlanDescription">
              {plan.description?.trim() ? plan.description : "Подписка активируется автоматически после оплаты."}
            </p>
          </div>
          <p className="checkoutPlanPrice">{formatPrice(plan.price)}</p>
        </div>

        <div className="checkoutPlanMeta">
          <p className="checkoutPlanMetaItem">
            {plan.durationDays} дней, {plan.trafficGB} ГБ
          </p>
          <p className="checkoutPlanMetaItem">
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
  const currentPlanIdRef = useRef(resolvedSelectedPlanId);
  const currentPromoCodeRef = useRef(promoCode.trim());

  const finalAmount = promoState?.finalAmount ?? selectedPlan?.price ?? 0;

  useEffect(() => {
    currentPlanIdRef.current = resolvedSelectedPlanId;
    currentPromoCodeRef.current = promoCode.trim();
  }, [promoCode, resolvedSelectedPlanId]);

  const handleSelectPlan = useCallback((planId: string) => {
    setSelectedPlanId(planId);
    setPromoState(null);
    setMessage(null);
  }, []);

  const validatePromo = useCallback(() => {
    const requestedCode = promoCode.trim();
    const requestedPlanId = selectedPlan?.id;

    if (!selectedPlan || !requestedCode) {
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
          code: requestedCode,
          planId: requestedPlanId
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

      if (
        currentPlanIdRef.current !== requestedPlanId ||
        currentPromoCodeRef.current !== requestedCode
      ) {
        return;
      }

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
      <Card className="checkoutEmptyPanel">
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
    <div className="dashboardWorkspace checkoutWorkspace">
      <Card className="dashboardSection checkoutPlansPanel">
        <CardHeader>
          <CardTitle>1. Выберите тариф</CardTitle>
          <CardDescription>Планы показаны сразу с ценой и объёмом. Смена плана сохраняет текущий поток оплаты.</CardDescription>
        </CardHeader>
        <CardContent className="checkoutPlansStack">
          {plans.map((plan) => (
            <CheckoutPlanCard
              key={plan.id}
              active={resolvedSelectedPlanId === plan.id}
              disabled={pending}
              onSelect={handleSelectPlan}
              plan={plan}
            />
          ))}
        </CardContent>
      </Card>

      <div className="checkoutSidebar">
        <Card className="dashboardSection checkoutPaymentPanel">
          <CardHeader>
            <CardTitle>2. Промокод и оплата</CardTitle>
            <CardDescription>Проверьте промокод перед созданием платежа и выберите провайдера.</CardDescription>
          </CardHeader>
          <CardContent className="checkoutPaymentContent">
            <div className="checkoutPromoGroup">
              <Label htmlFor="promoCode">Промокод</Label>
              <div className="checkoutPromoControls">
                <Input
                  id="promoCode"
                  disabled={pending}
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase());
                    setPromoState(null);
                    setMessage(null);
                  }}
                  placeholder="WELCOME10"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="commandButton commandButtonSecondary"
                  onClick={validatePromo}
                  disabled={pending}
                >
                  Проверить промокод
                </Button>
              </div>
            </div>

            {message ? (
              <p role="status" aria-live="polite" className="checkoutStatus">
                {message}
              </p>
            ) : null}

            <div className="checkoutProviderStack">
              <Button
                className="commandButton commandButtonPrimary"
                onClick={() => createPayment(PaymentProvider.YOOKASSA)}
                disabled={pending}
              >
                Оплатить через ЮKassa
              </Button>
              <Button
                className="commandButton commandButtonSecondary"
                variant="secondary"
                onClick={() => createPayment(PaymentProvider.PLATEGA)}
                disabled={pending}
              >
                Оплатить через Platega
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="checkoutSummaryPanel">
          <CardHeader>
            <CardTitle>3. Краткая сводка</CardTitle>
            <CardDescription>Итоговая сумма и бонусы видны до перехода на страницу оплаты.</CardDescription>
          </CardHeader>
          <CardContent className="checkoutSummaryContent">
            <div className="checkoutSummaryCard">
              <div className="checkoutSummaryCardHead">
                <div className="checkoutSummaryCardCopy">
                  <p className="checkoutSummaryCardLabel">Текущий тариф</p>
                  <p className="checkoutSummaryCardValue">{selectedPlan?.name ?? "Не выбран"}</p>
                </div>
                <p className="checkoutSummaryCardPrice">{formatPrice(selectedPlan?.price ?? 0)}</p>
              </div>
            </div>

            <div className="checkoutSummaryList">
              <div className="checkoutSummaryRow">
                <span>Базовая цена</span>
                <span>{formatPrice(selectedPlan?.price ?? 0)}</span>
              </div>
              {promoState?.discountAmount ? (
                <div className="checkoutSummaryRow checkoutSummaryRowAccent">
                  <span>Скидка</span>
                  <span>-{formatPrice(promoState.discountAmount)}</span>
                </div>
              ) : null}
              {promoState?.bonusDays ? (
                <div className="checkoutSummaryRow">
                  <span>Бонусные дни</span>
                  <span>+{promoState.bonusDays}</span>
                </div>
              ) : null}
              {promoState?.bonusTrafficGb ? (
                <div className="checkoutSummaryRow">
                  <span>Бонусный трафик</span>
                  <span>+{promoState.bonusTrafficGb} ГБ</span>
                </div>
              ) : null}
              <div className="checkoutSummaryRow checkoutSummaryRowTotal">
                <span>Итого</span>
                <span>{formatPrice(finalAmount)}</span>
              </div>
            </div>

            <div className="checkoutSummaryMeta">
              <p className="checkoutSummaryMetaItem">
                {selectedPlan?.durationDays ?? 0} дней доступа
              </p>
              <p className="checkoutSummaryMetaItem">
                {selectedPlan?.trafficGB ?? 0} ГБ трафика
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
