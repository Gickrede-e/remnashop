"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PromoCodeType, type Plan } from "@prisma/client";

import { FormSection } from "@/components/blocks/forms/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PromoFormValues = {
  code: string;
  type: PromoCodeType;
  value: number;
  maxUsages?: number | null;
  maxUsagesPerUser: number;
  minAmount?: number | null;
  applicablePlanIds: string[];
  startsAt?: string;
  expiresAt?: string | null;
  isActive: boolean;
};

function toIsoDateTime(value?: string | null) {
  if (!value) {
    return value ?? undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function PromoForm({
  mode,
  plans,
  initialValues,
  promoId
}: {
  mode: "create" | "edit";
  plans: Plan[];
  initialValues?: Partial<PromoFormValues>;
  promoId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [values, setValues] = useState<PromoFormValues>({
    code: initialValues?.code ?? "",
    type: initialValues?.type ?? PromoCodeType.DISCOUNT_PERCENT,
    value: initialValues?.value ?? 10,
    maxUsages: initialValues?.maxUsages ?? null,
    maxUsagesPerUser: initialValues?.maxUsagesPerUser ?? 1,
    minAmount: initialValues?.minAmount ?? null,
    applicablePlanIds: initialValues?.applicablePlanIds ?? [],
    startsAt: initialValues?.startsAt ?? "",
    expiresAt: initialValues?.expiresAt ?? "",
    isActive: initialValues?.isActive ?? true
  });

  const submit = () => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(mode === "create" ? "/api/admin/promos" : `/api/admin/promos/${promoId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...values,
          code: values.code.toUpperCase(),
          startsAt: toIsoDateTime(values.startsAt),
          expiresAt: values.expiresAt ? toIsoDateTime(values.expiresAt) : null
        })
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setMessage(payload.error ?? "Не удалось сохранить промокод");
        return;
      }

      router.push("/admin/promos");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4">
      <FormSection
        title="Идентичность промокода"
        description="Код и тип бонуса, по которым админ сразу понимает, как этот промо работает в checkout."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="promo-code">Код</Label>
            <Input
              id="promo-code"
              value={values.code}
              onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-type">Тип</Label>
            <select
              id="promo-type"
              className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white"
              value={values.type}
              onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as PromoCodeType }))}
            >
              <option value={PromoCodeType.DISCOUNT_PERCENT}>Скидка, %</option>
              <option value={PromoCodeType.DISCOUNT_FIXED}>Фиксированная скидка</option>
              <option value={PromoCodeType.FREE_DAYS}>Бесплатные дни</option>
              <option value={PromoCodeType.FREE_TRAFFIC_GB}>Бесплатный трафик</option>
            </select>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Поведение скидки"
        description="Собираем числовые правила в одном месте, чтобы не растягивать форму по четырём строкам."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="promo-value">Значение</Label>
            <Input
              id="promo-value"
              type="number"
              value={values.value}
              onChange={(event) => setValues((current) => ({ ...current, value: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-min">Мин. сумма, коп.</Label>
            <Input
              id="promo-min"
              type="number"
              value={values.minAmount ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  minAmount: event.target.value ? Number(event.target.value) : null
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-max">Общий лимит</Label>
            <Input
              id="promo-max"
              type="number"
              value={values.maxUsages ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  maxUsages: event.target.value ? Number(event.target.value) : null
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-user-limit">Лимит на пользователя</Label>
            <Input
              id="promo-user-limit"
              type="number"
              value={values.maxUsagesPerUser}
              onChange={(event) =>
                setValues((current) => ({ ...current, maxUsagesPerUser: Number(event.target.value) }))
              }
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Окно активации"
        description="Период действия вынесен отдельно, чтобы его можно было проверить перед публикацией промокода."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="promo-start">Активен с</Label>
            <Input
              id="promo-start"
              type="datetime-local"
              value={values.startsAt ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, startsAt: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-end">Истекает</Label>
            <Input
              id="promo-end"
              type="datetime-local"
              value={values.expiresAt ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, expiresAt: event.target.value }))}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Применимость и публикация"
        description="Выбираем, где промокод доступен, и сразу задаём его итоговый статус."
      >
        <div className="grid gap-4">
          <div className="space-y-3">
            <Label>Тарифы</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {plans.map((plan) => {
                const checked = values.applicablePlanIds.includes(plan.id);
                return (
                  <label
                    key={plan.id}
                    className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          applicablePlanIds: event.target.checked
                            ? [...current.applicablePlanIds, plan.id]
                            : current.applicablePlanIds.filter((id) => id !== plan.id)
                        }))
                      }
                    />
                    {plan.name}
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Промокод активен
          </label>

          {message ? <p className="text-sm text-red-300">{message}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" onClick={submit} disabled={pending}>
              {pending ? "Сохраняем..." : "Сохранить"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => router.push("/admin/promos")}
            >
              Отмена
            </Button>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
