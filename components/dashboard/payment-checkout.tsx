"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { PaymentProvider, type Plan } from "@prisma/client";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/constants";
import { getPlategaPaymentMethodLabel } from "@/lib/payments/platega-methods";
import { calculateDurationPricing, calculateEffectiveMonthlyAmount } from "@/lib/payments/pricing";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "plan" | "duration" | "payment";

type PromoState = {
  finalAmount: number;
  discountAmount: number;
  bonusDays: number;
  bonusTrafficGb: number;
} | null;

const MONTH_OPTIONS = [
  { months: 1, label: "1 месяц" },
  { months: 3, label: "3 месяца" },
  { months: 6, label: "6 месяцев" },
  { months: 12, label: "12 месяцев" }
] as const;

const STEPS: { key: Step; label: string }[] = [
  { key: "plan", label: "Тариф" },
  { key: "duration", label: "Срок" },
  { key: "payment", label: "Оплата" }
];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="checkoutStepIndicator">
      {STEPS.map(({ key, label }, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={key} className="checkoutStepIndicatorItem">
            {index > 0 && (
              <div className={cn("checkoutStepLine", done || active ? "is-active" : "")} />
            )}
            <div className={cn("checkoutStepDot", active ? "is-current" : done ? "is-done" : "")}>
              {done ? "✓" : index + 1}
            </div>
            <span className={cn("checkoutStepLabel", active ? "is-current" : done ? "is-done" : "")}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const CheckoutPlanCard = memo(function CheckoutPlanCard({
  plan,
  disabled,
  onSelect
}: {
  plan: Plan;
  disabled: boolean;
  onSelect: (planId: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(plan.id)}
      className="checkoutPlanCard"
    >
      <div className="checkoutPlanCardLeft">
        <strong className="checkoutPlanCardName">{plan.name}</strong>
        <span className="checkoutPlanCardMeta">
          {plan.durationDays} дней · {plan.trafficGB} ГБ
        </span>
        {plan.description?.trim() ? (
          <span className="checkoutPlanCardDesc">{plan.description}</span>
        ) : null}
      </div>
      <div className="checkoutPlanCardRight">
        <strong className="checkoutPlanCardPrice">{formatPrice(plan.price)}</strong>
        <span className="checkoutPlanCardUnit">/мес</span>
      </div>
    </button>
  );
});

export function PaymentCheckout({
  enabledProviders,
  plans,
  plategaPaymentMethods
}: {
  enabledProviders: PaymentProvider[];
  plans: Plan[];
  plategaPaymentMethods: number[];
}) {
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [months, setMonths] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<PromoState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(
    enabledProviders[0] ?? null
  );
  const [selectedPlategaPaymentMethod, setSelectedPlategaPaymentMethod] = useState<number | null>(
    plategaPaymentMethods[0] ?? null
  );
  const [pending, startTransition] = useTransition();

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId]
  );

  const resolvedSelectedProvider = useMemo(
    () =>
      selectedProvider && enabledProviders.includes(selectedProvider)
        ? selectedProvider
        : (enabledProviders[0] ?? null),
    [enabledProviders, selectedProvider]
  );
  const resolvedPlategaPaymentMethod = useMemo(
    () =>
      selectedPlategaPaymentMethod &&
      plategaPaymentMethods.includes(selectedPlategaPaymentMethod)
        ? selectedPlategaPaymentMethod
        : (plategaPaymentMethods[0] ?? null),
    [plategaPaymentMethods, selectedPlategaPaymentMethod]
  );

  const durationPricing = calculateDurationPricing(selectedPlan?.price ?? 0, months);
  const durationOptions = MONTH_OPTIONS.map((option) => ({
    ...option,
    pricing: calculateDurationPricing(selectedPlan?.price ?? 0, option.months)
  }));
  const baseAmount = durationPricing.baseAmount;
  const finalAmount = promoState?.finalAmount ?? durationPricing.subtotalAmount;
  const effectiveMonthlyAmount = calculateEffectiveMonthlyAmount(finalAmount, durationPricing.months);

  const currentPlanIdRef = useRef(selectedPlanId);
  const currentMonthsRef = useRef(months);
  const currentPromoCodeRef = useRef(promoCode.trim());

  useEffect(() => {
    currentPlanIdRef.current = selectedPlanId;
    currentMonthsRef.current = months;
    currentPromoCodeRef.current = promoCode.trim();
  }, [selectedPlanId, months, promoCode]);

  useEffect(() => {
    setSelectedProvider(resolvedSelectedProvider);
  }, [resolvedSelectedProvider]);

  useEffect(() => {
    setSelectedPlategaPaymentMethod(resolvedPlategaPaymentMethod);
  }, [resolvedPlategaPaymentMethod]);

  const goBack = useCallback(() => {
    if (step === "duration") setStep("plan");
    else if (step === "payment") setStep("duration");
  }, [step]);

  const handleSelectPlan = useCallback((planId: string) => {
    setSelectedPlanId(planId);
    setPromoState(null);
    setMessage(null);
    setStep("duration");
  }, []);

  const handleSelectMonths = useCallback((m: number) => {
    setMonths(m);
    setPromoState(null);
    setMessage(null);
    setStep("payment");
  }, []);

  const validatePromo = useCallback(() => {
    const requestedCode = promoCode.trim();
    const requestedPlanId = selectedPlan?.id;
    const requestedMonths = months;

    if (!selectedPlan || !requestedCode) {
      setPromoState(null);
      setMessage("Введите промокод для проверки.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: requestedCode, planId: requestedPlanId, months: requestedMonths })
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
        currentMonthsRef.current !== requestedMonths ||
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
        finalAmount: payload.data.finalAmount ?? durationPricing.subtotalAmount,
        discountAmount: payload.data.discountAmount ?? 0,
        bonusDays: payload.data.bonusDays ?? 0,
        bonusTrafficGb: payload.data.bonusTrafficGb ?? 0
      });
      setMessage("Промокод применён.");
    });
  }, [durationPricing.subtotalAmount, months, promoCode, selectedPlan]);

  const createPayment = useCallback(
    (provider: PaymentProvider | null) => {
      if (!selectedPlan || !provider || !enabledProviders.includes(provider)) return;

      startTransition(async () => {
        setMessage(null);
        const response = await fetch("/api/payments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: selectedPlan.id,
            provider,
            months,
            promoCode: promoCode.trim() || undefined,
            paymentMethod:
              provider === PaymentProvider.PLATEGA
                ? resolvedPlategaPaymentMethod ?? undefined
                : undefined
          })
        });

        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          data?: { redirectUrl?: string };
        };

        if (!response.ok || !payload.ok || !payload.data?.redirectUrl) {
          setMessage(payload.error ?? "Не удалось создать платёж");
          return;
        }

        window.location.href = payload.data.redirectUrl;
      });
    },
    [enabledProviders, months, promoCode, resolvedPlategaPaymentMethod, selectedPlan]
  );

  if (plans.length === 0) {
    return (
      <div className="dashWorkspace dashCheckout">
        <DashboardCard title="Выбор тарифа">
          <p>Сейчас активные тарифы не найдены. Проверьте настройки тарифов в админке и повторите попытку.</p>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="dashWorkspace dashCheckout">
      <StepIndicator current={step} />

      {step === "plan" && (
        <div key="plan" className="checkoutStep">
          <DashboardCard title="Выберите тариф">
            <div className="checkoutPlanList">
              {plans.map((plan) => (
                <CheckoutPlanCard
                  key={plan.id}
                  plan={plan}
                  disabled={pending}
                  onSelect={handleSelectPlan}
                />
              ))}
            </div>
          </DashboardCard>
        </div>
      )}

      {step === "duration" && (
        <div key="duration" className="checkoutStep">
          <div className="checkoutBackNav">
            <button type="button" className="checkoutBackBtn" onClick={goBack} disabled={pending}>
              ← Назад
            </button>
            <span className="checkoutBackContext">
              {selectedPlan?.name} · {formatPrice(selectedPlan?.price ?? 0)}/мес
            </span>
          </div>
          <DashboardCard title="Выберите период">
            <div className="checkoutDurationGrid">
              {durationOptions.map(({ months: m, label, pricing }) => (
                <button
                  key={m}
                  type="button"
                  disabled={pending}
                  onClick={() => handleSelectMonths(m)}
                  className={cn("checkoutDurationOption", months === m ? "is-active" : "")}
                >
                  <span className="checkoutDurationLabel">{label}</span>
                  <strong className="checkoutDurationPrice">
                    {formatPrice(pricing.subtotalAmount)}
                  </strong>
                  <span className="checkoutDurationLabel">
                    {formatPrice(pricing.effectiveMonthlyAmount)}/мес
                    {pricing.durationDiscountPercent > 0 ? ` · -${pricing.durationDiscountPercent}%` : ""}
                  </span>
                </button>
              ))}
            </div>
          </DashboardCard>
        </div>
      )}

      {step === "payment" && (
        <div key="payment" className="checkoutStep">
          <div className="checkoutBackNav">
            <button type="button" className="checkoutBackBtn" onClick={goBack} disabled={pending}>
              ← Назад
            </button>
          </div>

          <DashboardCard title="К оплате">
            <div className="checkoutSummaryList">
              <div className="checkoutSummaryRow">
                <span>Тариф</span>
                <span>{selectedPlan?.name ?? "Не выбран"}</span>
              </div>
              <div className="checkoutSummaryRow">
                <span>Период</span>
                <span>
                  {MONTH_OPTIONS.find((o) => o.months === months)?.label ?? `${months} мес.`}
                </span>
              </div>
              <div className="checkoutSummaryRow">
                <span>Базовая цена</span>
                <span>{formatPrice(baseAmount)}</span>
              </div>
              {durationPricing.durationDiscountAmount > 0 ? (
                <div className="checkoutSummaryRow checkoutSummaryRowAccent">
                  <span>Скидка за период ({durationPricing.durationDiscountPercent}%)</span>
                  <span>-{formatPrice(durationPricing.durationDiscountAmount)}</span>
                </div>
              ) : null}
              {promoState?.discountAmount ? (
                <div className="checkoutSummaryRow checkoutSummaryRowAccent">
                  <span>Промокод</span>
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
                <strong>{formatPrice(finalAmount)}</strong>
              </div>
              <div className="checkoutSummaryRow">
                <span>В месяц</span>
                <span>{formatPrice(effectiveMonthlyAmount)}/мес</span>
              </div>
            </div>

            <div className="checkoutSummaryMeta">
              <p className="checkoutSummaryMetaItem">
                {(selectedPlan?.durationDays ?? 0) * months} дней доступа
              </p>
              <p className="checkoutSummaryMetaItem">{selectedPlan?.trafficGB ?? 0} ГБ трафика</p>
            </div>
          </DashboardCard>

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
              <Button type="button" variant="secondary" onClick={validatePromo} disabled={pending}>
                Проверить
              </Button>
            </div>
          </div>

          {message ? (
            <p role="status" aria-live="polite" className="checkoutStatus">
              {message}
            </p>
          ) : null}

          {enabledProviders.length > 0 ? (
            <div className="checkoutProviderStack">
              {enabledProviders.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  aria-pressed={resolvedSelectedProvider === provider}
                  disabled={pending}
                  onClick={() => setSelectedProvider(provider)}
                  className={cn(
                    "dashStatusPill",
                    resolvedSelectedProvider === provider ? "is-completed" : "is-pending"
                  )}
                >
                  {PAYMENT_PROVIDER_LABELS[provider]}
                </button>
              ))}
            </div>
          ) : (
            <p role="status" aria-live="polite" className="checkoutStatus">
              Платежи временно недоступны
            </p>
          )}

          {resolvedSelectedProvider === PaymentProvider.PLATEGA &&
          plategaPaymentMethods.length > 1 ? (
            <div className="checkoutPromoGroup">
              <Label>Способ оплаты</Label>
              <div className="checkoutProviderStack">
                {plategaPaymentMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={resolvedPlategaPaymentMethod === method}
                    disabled={pending}
                    onClick={() => setSelectedPlategaPaymentMethod(method)}
                    className={cn(
                      "dashStatusPill",
                      resolvedPlategaPaymentMethod === method ? "is-completed" : "is-pending"
                    )}
                  >
                    {getPlategaPaymentMethodLabel(method)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className="dashSidebarCta"
            disabled={pending || !resolvedSelectedProvider}
            onClick={() => createPayment(resolvedSelectedProvider)}
          >
            {resolvedSelectedProvider ? "Оплатить" : "Платежи недоступны"}
          </button>
        </div>
      )}
    </div>
  );
}
