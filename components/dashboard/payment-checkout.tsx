"use client";

// Checkout. Desktop shows plan, period, promo code and the order summary on one page with a live
// total; phones walk through the same sections as three steps, and only «Далее» moves them on.

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { PaymentProvider, Plan } from "@prisma/client";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { readApiEnvelope } from "@/lib/api-envelope";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/constants";
import { calculateDurationPricing, calculateEffectiveMonthlyAmount } from "@/lib/payments/pricing";
import { cn, formatDayCount, formatPrice } from "@/lib/utils";
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
          <div key={key} className="checkoutStepIndicatorItem" aria-current={active ? "step" : undefined}>
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
  isSelected,
  disabled,
  onSelect
}: {
  plan: Plan;
  isSelected: boolean;
  disabled: boolean;
  onSelect: (planId: string) => void;
}) {
  const highlight = plan.highlight?.trim();
  const features = [
    `${plan.trafficGB} ГБ трафика`,
    ...(plan.remnawaveHwidDeviceLimit ? [`до ${plan.remnawaveHwidDeviceLimit} устройств`] : [])
  ].join(" · ");

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isSelected}
      onClick={() => onSelect(plan.id)}
      className={cn("checkoutPlanCard", isSelected && "is-selected")}
    >
      <span className="checkoutPlanRing" aria-hidden="true" />
      <span className="checkoutPlanCardLeft">
        <span className="checkoutPlanCardTitleRow">
          <strong className="checkoutPlanCardName">{plan.name}</strong>
          {highlight ? <span className="badge badgeDefault">{highlight}</span> : null}
        </span>
        <span className="checkoutPlanCardMeta">{features}</span>
        {plan.description?.trim() ? (
          <span className="checkoutPlanCardDesc">{plan.description}</span>
        ) : null}
      </span>
      <span className="checkoutPlanCardRight">
        <strong className="checkoutPlanCardPrice">{formatPrice(plan.price)}</strong>
        <span className="checkoutPlanCardUnit">в месяц</span>
      </span>
    </button>
  );
});

export function PaymentCheckout({
  enabledProviders,
  plans
}: {
  enabledProviders: PaymentProvider[];
  plans: Plan[];
}) {
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [months, setMonths] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<PromoState>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const stepHeadingRefs = useRef<Record<Step, HTMLHeadingElement | null>>({
    plan: null,
    duration: null,
    payment: null
  });

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId]
  );

  // One live provider (YooKassa) — the server decides whether it is enabled.
  const provider: PaymentProvider | null = enabledProviders[0] ?? null;

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

  function goToStep(nextStep: Step) {
    setStep(nextStep);
    // On phones the pressed button leaves with its step, so hand focus to the new step's heading.
    requestAnimationFrame(() => stepHeadingRefs.current[nextStep]?.focus());
  }

  const handleSelectPlan = useCallback((planId: string) => {
    setSelectedPlanId(planId);
    setPromoState(null);
    setPromoMessage(null);
    setPaymentError(null);
  }, []);

  function handleSelectMonths(value: number) {
    setMonths(value);
    setPromoState(null);
    setPromoMessage(null);
    setPaymentError(null);
  }

  function validatePromo() {
    const requestedCode = promoCode.trim();
    const requestedPlanId = selectedPlan?.id;
    const requestedMonths = months;

    if (!selectedPlan || !requestedCode) {
      setPromoState(null);
      setPromoMessage("Введите промокод для проверки.");
      return;
    }

    startTransition(async () => {
      setPromoMessage(null);
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: requestedCode, planId: requestedPlanId, months: requestedMonths })
      });
      const payload = await readApiEnvelope<{
        finalAmount?: number;
        discountAmount?: number;
        bonusDays?: number;
        bonusTrafficGb?: number;
      }>(response);

      if (
        currentPlanIdRef.current !== requestedPlanId ||
        currentMonthsRef.current !== requestedMonths ||
        currentPromoCodeRef.current !== requestedCode
      ) {
        return;
      }

      if (!response.ok || !payload?.ok) {
        setPromoState(null);
        setPromoMessage(payload?.error ?? "Промокод недоступен");
        return;
      }

      setPromoState({
        finalAmount: payload.data.finalAmount ?? durationPricing.subtotalAmount,
        discountAmount: payload.data.discountAmount ?? 0,
        bonusDays: payload.data.bonusDays ?? 0,
        bonusTrafficGb: payload.data.bonusTrafficGb ?? 0
      });
      setPromoMessage("Промокод применён.");
    });
  }

  function createPayment() {
    if (!selectedPlan || !provider) return;

    startTransition(async () => {
      setPaymentError(null);
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          provider,
          months,
          promoCode: promoCode.trim() || undefined
        })
      });

      const payload = await readApiEnvelope<{ redirectUrl?: string }>(response);

      if (!response.ok || !payload?.ok || !payload.data.redirectUrl) {
        setPaymentError(payload?.error ?? "Не удалось создать платёж");
        return;
      }

      window.location.href = payload.data.redirectUrl;
    });
  }

  if (plans.length === 0) {
    return (
      <div className="dashWorkspace dashCheckout">
        <DashboardCard title="Выбор тарифа">
          <p>Сейчас активные тарифы не найдены. Проверьте настройки тарифов в админке и повторите попытку.</p>
        </DashboardCard>
      </div>
    );
  }

  const periodLabel = MONTH_OPTIONS.find((o) => o.months === months)?.label ?? `${months} мес.`;
  const accessDays = (selectedPlan?.durationDays ?? 0) * months;

  return (
    <div className="dashWorkspace dashCheckout" data-step={step}>
      <StepIndicator current={step} />

      <div className="checkoutLayout">
        <div className="checkoutMain">
          <section className="dashCard" data-checkout-step="plan" aria-labelledby="checkout-plan-title">
            <div className="dashCardHead">
              <h2
                id="checkout-plan-title"
                ref={(node) => {
                  stepHeadingRefs.current.plan = node;
                }}
                tabIndex={-1}
                className="dashCardTitle checkoutSectionTitle"
              >
                <span className="checkoutSectionNum" aria-hidden="true">
                  1
                </span>
                Выберите тариф
              </h2>
            </div>
            <div className="checkoutPlanList">
              {plans.map((plan) => (
                <CheckoutPlanCard
                  key={plan.id}
                  plan={plan}
                  isSelected={plan.id === selectedPlan?.id}
                  disabled={pending}
                  onSelect={handleSelectPlan}
                />
              ))}
            </div>
            <button
              type="button"
              className="button buttonPrimary buttonSizeLg checkoutNextBtn"
              onClick={() => goToStep("duration")}
            >
              Далее
              <ArrowRight className="iconSm iconNoShrink" aria-hidden="true" />
            </button>
          </section>

          <section className="dashCard" data-checkout-step="duration" aria-labelledby="checkout-duration-title">
            <button type="button" className="checkoutBackBtn checkoutStepBack" onClick={() => goToStep("plan")}>
              <ArrowLeft className="iconSm iconNoShrink" aria-hidden="true" />
              Назад
            </button>
            <div className="dashCardHead">
              <h2
                id="checkout-duration-title"
                ref={(node) => {
                  stepHeadingRefs.current.duration = node;
                }}
                tabIndex={-1}
                className="dashCardTitle checkoutSectionTitle"
              >
                <span className="checkoutSectionNum" aria-hidden="true">
                  2
                </span>
                Выберите срок
              </h2>
            </div>
            <div className="checkoutDurationGrid">
              {durationOptions.map(({ months: optionMonths, label, pricing }) => (
                <button
                  key={optionMonths}
                  type="button"
                  disabled={pending}
                  aria-pressed={months === optionMonths}
                  onClick={() => handleSelectMonths(optionMonths)}
                  className={cn("checkoutDurationOption", months === optionMonths ? "is-active" : "")}
                >
                  {pricing.durationDiscountPercent > 0 ? (
                    <span className="badge badgeDefault checkoutDurationBadge">−{pricing.durationDiscountPercent}%</span>
                  ) : null}
                  <span className="checkoutDurationLabel">{label}</span>
                  <strong className="checkoutDurationPrice">{formatPrice(pricing.subtotalAmount)}</strong>
                  <span className="checkoutDurationLabel">{formatPrice(pricing.effectiveMonthlyAmount)}/мес</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button buttonPrimary buttonSizeLg checkoutNextBtn"
              onClick={() => goToStep("payment")}
            >
              Далее
              <ArrowRight className="iconSm iconNoShrink" aria-hidden="true" />
            </button>
          </section>

          <section className="dashCard" data-checkout-step="payment" aria-labelledby="checkout-promo-title">
            <button type="button" className="checkoutBackBtn checkoutStepBack" onClick={() => goToStep("duration")}>
              <ArrowLeft className="iconSm iconNoShrink" aria-hidden="true" />
              Назад
            </button>
            <div className="dashCardHead">
              <h2
                id="checkout-promo-title"
                ref={(node) => {
                  stepHeadingRefs.current.payment = node;
                }}
                tabIndex={-1}
                className="dashCardTitle checkoutSectionTitle"
              >
                <span className="checkoutSectionNum" aria-hidden="true">
                  3
                </span>
                Промокод
              </h2>
            </div>
            <div className="checkoutPromoGroup">
              <Label htmlFor="promoCode">Промокод, если есть</Label>
              <div className="checkoutPromoControls">
                <Input
                  id="promoCode"
                  disabled={pending}
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase());
                    setPromoState(null);
                    setPromoMessage(null);
                  }}
                  placeholder="WELCOME10"
                />
                <Button type="button" variant="secondary" onClick={validatePromo} disabled={pending}>
                  Применить
                </Button>
              </div>
              {promoMessage ? (
                <p role="status" aria-live="polite" className="checkoutStatus">
                  {promoMessage}
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="dashCard checkoutSummary" data-checkout-step="payment" aria-labelledby="checkout-summary-title">
          <div className="dashCardHead">
            <h2 id="checkout-summary-title" className="dashCardTitle">
              Заказ
            </h2>
          </div>
          <div className="checkoutSummaryList">
            <div className="checkoutSummaryRow">
              <span>Тариф</span>
              <span>{selectedPlan?.name ?? "Не выбран"}</span>
            </div>
            <div className="checkoutSummaryRow">
              <span>Период</span>
              <span>{periodLabel}</span>
            </div>
            <div className="checkoutSummaryRow">
              <span>Базовая цена</span>
              <span>{formatPrice(baseAmount)}</span>
            </div>
            {durationPricing.durationDiscountAmount > 0 ? (
              <div className="checkoutSummaryRow checkoutSummaryRowAccent">
                <span>Скидка за период ({durationPricing.durationDiscountPercent}%)</span>
                <span>−{formatPrice(durationPricing.durationDiscountAmount)}</span>
              </div>
            ) : null}
            {promoState?.discountAmount ? (
              <div className="checkoutSummaryRow checkoutSummaryRowAccent">
                <span>Промокод</span>
                <span>−{formatPrice(promoState.discountAmount)}</span>
              </div>
            ) : null}
            {promoState?.bonusDays ? (
              <div className="checkoutSummaryRow">
                <span>Бонусные дни</span>
                <span>+{formatDayCount(promoState.bonusDays)}</span>
              </div>
            ) : null}
            {promoState?.bonusTrafficGb ? (
              <div className="checkoutSummaryRow">
                <span>Бонусный трафик</span>
                <span>+{promoState.bonusTrafficGb} ГБ</span>
              </div>
            ) : null}
          </div>

          <div className="checkoutTotal">
            <span>Итого</span>
            <strong className="checkoutTotalValue">{formatPrice(finalAmount)}</strong>
          </div>
          <p className="checkoutTotalMeta">
            {formatPrice(effectiveMonthlyAmount)}/мес · {formatDayCount(accessDays)} доступа ·{" "}
            {selectedPlan?.trafficGB ?? 0} ГБ трафика
          </p>

          <button
            type="button"
            className="button buttonPrimary buttonSizeLg checkoutPayBtn"
            disabled={pending || !provider}
            onClick={createPayment}
          >
            {!provider ? "Платежи недоступны" : pending ? "Подождите…" : `Оплатить ${formatPrice(finalAmount)}`}
            {provider && !pending ? <ArrowRight className="iconSm iconNoShrink" aria-hidden="true" /> : null}
          </button>
          {paymentError ? (
            <p role="alert" className="checkoutStatus">
              {paymentError}
            </p>
          ) : null}
          {provider ? (
            <p className="checkoutProviderNote">Оплата через {PAYMENT_PROVIDER_LABELS[provider]}</p>
          ) : (
            <p role="status" aria-live="polite" className="checkoutStatus">
              Платежи временно недоступны
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
