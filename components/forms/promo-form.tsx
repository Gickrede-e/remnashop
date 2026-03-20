"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { promoUpsertSchema } from "@/lib/validators/admin";

type PlanOption = {
  id: string;
  name: string;
};

type FormInput = z.input<typeof promoUpsertSchema>;
type FormValues = z.output<typeof promoUpsertSchema>;

function toIsoDateTime(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function PromoForm({
  mode,
  plans,
  promo
}: {
  mode: "create" | "edit";
  plans: PlanOption[];
  promo?: Partial<FormValues> & { id?: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormInput, undefined, FormValues>({
    resolver: zodResolver(promoUpsertSchema),
    defaultValues: {
      code: promo?.code ?? "",
      type: promo?.type ?? "DISCOUNT_PERCENT",
      value: promo?.value ?? 10,
      maxUsages: promo?.maxUsages,
      maxUsagesPerUser: promo?.maxUsagesPerUser ?? 1,
      minAmount: promo?.minAmount,
      applicablePlanIds: promo?.applicablePlanIds ?? [],
      startsAt: promo?.startsAt,
      expiresAt: promo?.expiresAt,
      isActive: promo?.isActive ?? true
    }
  });

  const submit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const endpoint = mode === "create" ? "/api/admin/promos" : `/api/admin/promos/${promo?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...values,
          startsAt: toIsoDateTime(values.startsAt),
          expiresAt: values.expiresAt ? toIsoDateTime(values.expiresAt) : undefined
        })
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Не удалось сохранить промокод");
        return;
      }

      router.push("/admin/promos");
      router.refresh();
    });
  });

  const selectedPlanIds = useWatch({ control: form.control, name: "applicablePlanIds" }) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Новый промокод" : "Редактирование промокода"}</CardTitle>
        <CardDescription>Скидки, бесплатные дни и бонусный трафик управляются из одной формы.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="code">Код</Label>
            <Input id="code" {...form.register("code")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Тип</Label>
            <select
              id="type"
              className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm"
              {...form.register("type")}
            >
              <option value="DISCOUNT_PERCENT">Скидка %</option>
              <option value="DISCOUNT_FIXED">Фиксированная скидка</option>
              <option value="FREE_DAYS">Бесплатные дни</option>
              <option value="FREE_TRAFFIC_GB">Бесплатный трафик</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Значение</Label>
            <Input id="value" type="number" {...form.register("value", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxUsages">Общий лимит</Label>
            <Input id="maxUsages" type="number" {...form.register("maxUsages", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxUsagesPerUser">Лимит на пользователя</Label>
            <Input id="maxUsagesPerUser" type="number" {...form.register("maxUsagesPerUser", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minAmount">Минимальная сумма, коп.</Label>
            <Input id="minAmount" type="number" {...form.register("minAmount", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startsAt">Старт действия</Label>
            <Input id="startsAt" type="datetime-local" {...form.register("startsAt")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Окончание действия</Label>
            <Input id="expiresAt" type="datetime-local" {...form.register("expiresAt")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Применимые тарифы</Label>
            <div className="grid gap-2 rounded-2xl border border-white/10 p-4 md:grid-cols-2">
              {plans.map((plan) => {
                const checked = selectedPlanIds.includes(plan.id);
                return (
                  <label key={plan.id} className="flex items-center gap-3 text-sm">
                    <input
                      checked={checked}
                      type="checkbox"
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...selectedPlanIds, plan.id]
                          : selectedPlanIds.filter((item) => item !== plan.id);
                        form.setValue("applicablePlanIds", next, { shouldDirty: true });
                      }}
                    />
                    {plan.name}
                  </label>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm md:col-span-2">
            <input type="checkbox" className="h-4 w-4" {...form.register("isActive")} />
            Промокод активен
          </label>
          {error ? <p className="text-sm text-red-300 md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2">
            <Button disabled={pending} type="submit">
              {pending ? "Сохранение..." : mode === "create" ? "Создать промокод" : "Сохранить промокод"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
