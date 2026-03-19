"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";

type PlanFormValues = {
  slug: string;
  name: string;
  description?: string | null;
  durationDays: number;
  trafficGB: number;
  priceRubles: number;
  highlight?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export function PlanForm({
  mode,
  initialValues,
  planId
}: {
  mode: "create" | "edit";
  initialValues?: Partial<PlanFormValues>;
  planId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [values, setValues] = useState<PlanFormValues>({
    slug: initialValues?.slug ?? "",
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    durationDays: initialValues?.durationDays ?? 30,
    trafficGB: initialValues?.trafficGB ?? 50,
    priceRubles: initialValues?.priceRubles ?? 149,
    highlight: initialValues?.highlight ?? "",
    sortOrder: initialValues?.sortOrder ?? 0,
    isActive: initialValues?.isActive ?? true
  });

  const previewPrice = useMemo(() => `${values.priceRubles.toFixed(0)} ₽`, [values.priceRubles]);

  const submit = () => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(mode === "create" ? "/api/admin/plans" : `/api/admin/plans/${planId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setMessage(payload.error ?? "Не удалось сохранить тариф");
        return;
      }

      router.push("/admin/plans");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Новый тариф" : "Редактирование тарифа"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Название</Label>
              <Input
                id="plan-name"
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    name: event.target.value,
                    slug: current.slug || slugify(event.target.value)
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-slug">Slug</Label>
              <Input
                id="plan-slug"
                value={values.slug}
                onChange={(event) => setValues((current) => ({ ...current, slug: slugify(event.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-description">Описание</Label>
            <Textarea
              id="plan-description"
              value={values.description ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="plan-duration">Дней</Label>
              <Input
                id="plan-duration"
                type="number"
                value={values.durationDays}
                onChange={(event) => setValues((current) => ({ ...current, durationDays: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-traffic">Трафик, ГБ</Label>
              <Input
                id="plan-traffic"
                type="number"
                value={values.trafficGB}
                onChange={(event) => setValues((current) => ({ ...current, trafficGB: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-price">Цена, ₽</Label>
              <Input
                id="plan-price"
                type="number"
                value={values.priceRubles}
                onChange={(event) => setValues((current) => ({ ...current, priceRubles: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-sort">Порядок</Label>
              <Input
                id="plan-sort"
                type="number"
                value={values.sortOrder}
                onChange={(event) => setValues((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-highlight">Метка</Label>
              <Input
                id="plan-highlight"
                value={values.highlight ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, highlight: event.target.value }))}
              />
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Активный тариф
            </label>
          </div>
          {message ? <p className="text-sm text-red-300">{message}</p> : null}
          <div className="flex gap-3">
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? "Сохраняем..." : "Сохранить"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/plans")}>
              Отмена
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Предпросмотр</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xl font-semibold text-white">{values.name || "Новый тариф"}</p>
          <p className="text-3xl font-semibold text-white">{previewPrice}</p>
          <p className="text-sm text-zinc-400">{values.description || "Описание тарифа появится здесь."}</p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
            <p>{values.durationDays} дней доступа</p>
            <p>{values.trafficGB} ГБ трафика</p>
            <p>{values.highlight || "Без highlight-метки"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
