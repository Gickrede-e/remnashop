"use client";

import { useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import { planUpsertSchema } from "@/lib/validators/admin";

type FormInput = z.input<typeof planUpsertSchema>;
type FormValues = z.output<typeof planUpsertSchema>;

export function PlanForm({
  mode,
  plan
}: {
  mode: "create" | "edit";
  plan?: Partial<FormValues> & { id?: string; priceRub?: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormInput, undefined, FormValues>({
    resolver: zodResolver(planUpsertSchema),
    defaultValues: {
      slug: plan?.slug ?? "",
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      durationDays: plan?.durationDays ?? 30,
      trafficGB: plan?.trafficGB ?? 100,
      priceRub: plan?.priceRub ?? 299,
      highlight: plan?.highlight ?? "",
      sortOrder: plan?.sortOrder ?? 0,
      isActive: plan?.isActive ?? true
    }
  });

  const nameValue = useWatch({ control: form.control, name: "name" });
  const slugValue = useWatch({ control: form.control, name: "slug" });
  const descriptionValue = useWatch({ control: form.control, name: "description" });
  const durationDaysValue = useWatch({ control: form.control, name: "durationDays" });
  const trafficGbValue = useWatch({ control: form.control, name: "trafficGB" });

  useEffect(() => {
    if (!slugValue && nameValue) {
      form.setValue("slug", slugify(nameValue), { shouldDirty: true });
    }
  }, [form, nameValue, slugValue]);

  const submit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const endpoint = mode === "create" ? "/api/admin/plans" : `/api/admin/plans/${plan?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Не удалось сохранить тариф");
        return;
      }

      router.push("/admin/plans");
      router.refresh();
    });
  });

  const previewPrice = Number(useWatch({ control: form.control, name: "priceRub" }) ?? 0) * 100;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Новый тариф" : "Редактирование тарифа"}</CardTitle>
          <CardDescription>Управляйте slug, длительностью, трафиком, ценой и highlight-меткой.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="name">Название</Label>
              <Input id="name" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...form.register("slug")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea id="description" {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationDays">Длительность, дни</Label>
              <Input id="durationDays" type="number" {...form.register("durationDays", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trafficGB">Трафик, ГБ</Label>
              <Input id="trafficGB" type="number" {...form.register("trafficGB", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceRub">Цена, ₽</Label>
              <Input id="priceRub" type="number" step="0.01" {...form.register("priceRub", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlight">Highlight</Label>
              <Input id="highlight" placeholder="Популярный" {...form.register("highlight")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Порядок</Label>
              <Input id="sortOrder" type="number" {...form.register("sortOrder", { valueAsNumber: true })} />
            </div>
            <label className="flex items-center gap-3 text-sm md:col-span-2">
              <input type="checkbox" className="h-4 w-4" {...form.register("isActive")} />
              Тариф активен
            </label>
            {error ? <p className="text-sm text-red-300 md:col-span-2">{error}</p> : null}
            <div className="md:col-span-2">
              <Button disabled={pending} type="submit">
                {pending ? "Сохранение..." : mode === "create" ? "Создать тариф" : "Сохранить изменения"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Предпросмотр</CardTitle>
          <CardDescription>Так карточка будет выглядеть в публичном блоке тарифов.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-violet-500/10 to-blue-500/10 p-5">
            <p className="font-['Space_Grotesk'] text-xl font-semibold">{nameValue || "Новый тариф"}</p>
            <p className="mt-2 text-sm text-muted-foreground">{descriptionValue || "Краткое описание тарифа."}</p>
            <div className="mt-5 flex items-end justify-between">
              <div className="text-sm text-muted-foreground">
                <p>{durationDaysValue || 0} дней</p>
                <p>{trafficGbValue || 0} ГБ</p>
              </div>
              <p className="text-2xl font-semibold">{(previewPrice / 100).toFixed(0)} ₽</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
