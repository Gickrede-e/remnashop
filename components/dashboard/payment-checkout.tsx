"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { PaymentProvider, type Plan } from "@prisma/client";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/constants";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PromoState = {
  finalAmount: number;
  discountAmount: number;
  bonusDays: number;
  bonusTrafficGb: number;
} | null;

const CheckoutPlanRow = memo(function CheckoutPlanRow({
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
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(plan.id)}
        aria-pressed={active}
        className={cn("dashListItem", active ? "is-completed" : "is-not-completed")}
        style={{ width: "100%", textAlign: "left" }}
      >
        <div style={{ display: "grid", gap: "0.25rem" }}>
          <strong>{plan.name}</strong>
          <span>{plan.description?.trim() ? plan.description : "Подписка активируется автоматически после оплаты."}</span>
          <span>
            {plan.durationDays} дней, {plan.trafficGB} ГБ
          </span>
        </div>
        <div style={{ display: "grid", justifyItems: "end", gap: "0.25rem" }}>
          <strong>{formatPrice(plan.price)}</strong>
          <span>{plan.highlight || (active ? "Выбран" : "Выбрать")}</span>
        </div>
      </button>
    </li>
  );
});

export function PaymentCheckout({ plans }: { plans: Plan[] }) {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<PromoState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(PaymentProvider.YOOKASSA);
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

      if (currentPlanIdRef.current !== requestedPlanId || currentPromoCodeRef.current !== requestedCode) {
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
      <div className="dashWorkspace dashCheckout">
        <DashboardCard title="Выбор тарифа">
          <p>Сейчас активные тарифы не найдены. Проверьте настройки тарифов в админке и повторите попытку.</p>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="dashWorkspace dashCheckout">
      <div className="dashCardGrid">
        <DashboardCard title="Выбор тарифа" className="dashCardWide">
          <ul className="dashList">
            {plans.map((plan) => (
              <CheckoutPlanRow
                key={plan.id}
                active={resolvedSelectedPlanId === plan.id}
                disabled={pending}
                onSelect={handleSelectPlan}
                plan={plan}
              />
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard title="К оплате" className="dashCardNarrow">
          <div className="checkoutSummaryList">
            <div className="checkoutSummaryRow">
              <span>Тариф</span>
              <span>{selectedPlan?.name ?? "Не выбран"}</span>
            </div>
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
            <p className="checkoutSummaryMetaItem">{selectedPlan?.durationDays ?? 0} дней доступа</p>
            <p className="checkoutSummaryMetaItem">{selectedPlan?.trafficGB ?? 0} ГБ трафика</p>
          </div>
        </DashboardCard>
      </div>

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
        {(Object.entries(PAYMENT_PROVIDER_LABELS) as Array<[PaymentProvider, string]>).map(([provider, label]) => (
          <button
            key={provider}
            type="button"
            aria-pressed={selectedProvider === provider}
            disabled={pending}
            onClick={() => setSelectedProvider(provider)}
            className={cn("dashStatusPill", selectedProvider === provider ? "is-completed" : "is-pending")}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="dashSidebarCta"
        disabled={pending}
        onClick={() => createPayment(selectedProvider)}
      >
        Оплатить
      </button>
    </div>
  );
}
