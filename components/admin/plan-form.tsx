"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/blocks/forms/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugToRemnawaveTag, slugify } from "@/lib/utils";

type PlanFormValues = {
  slug: string;
  name: string;
  description?: string | null;
  durationDays: number;
  trafficGB: number;
  priceRubles: number;
  highlight?: string | null;
  remnawaveExternalSquadUuid?: string | null;
  remnawaveInternalSquadUuids: string[];
  remnawaveHwidDeviceLimit: string;
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
    remnawaveExternalSquadUuid: initialValues?.remnawaveExternalSquadUuid ?? "",
    remnawaveInternalSquadUuids: initialValues?.remnawaveInternalSquadUuids ?? [],
    remnawaveHwidDeviceLimit: initialValues?.remnawaveHwidDeviceLimit ?? "",
    sortOrder: initialValues?.sortOrder ?? 0,
    isActive: initialValues?.isActive ?? true
  });
  const remnawaveTag = useMemo(() => slugToRemnawaveTag(values.slug), [values.slug]);
  const internalSquadsText = useMemo(() => values.remnawaveInternalSquadUuids.join("\n"), [values.remnawaveInternalSquadUuids]);

  const submit = () => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(mode === "create" ? "/api/admin/plans" : `/api/admin/plans/${planId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...values,
          remnawaveExternalSquadUuid: values.remnawaveExternalSquadUuid || null,
          remnawaveHwidDeviceLimit: values.remnawaveHwidDeviceLimit ? Number(values.remnawaveHwidDeviceLimit) : null
        })
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
    <div className="grid gap-4">
      <FormSection
        title="Идентичность тарифа"
        description="Название, slug и витринные тексты, по которым тариф будут узнавать в интерфейсе."
      >
        <div className="grid gap-4">
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
                    slug: current.slug || slugify(event.target.value).slice(0, 16)
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-slug">Slug</Label>
              <Input
                id="plan-slug"
                value={values.slug}
                maxLength={16}
                onChange={(event) =>
                  setValues((current) => ({ ...current, slug: slugify(event.target.value).slice(0, 16) }))
                }
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
          <div className="space-y-2">
            <Label htmlFor="plan-highlight">Метка</Label>
            <Input
              id="plan-highlight"
              value={values.highlight ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, highlight: event.target.value }))}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Ценообразование"
        description="Оставляем в одном месте только коммерческие параметры и порядок показа тарифа."
      >
        <div className="grid gap-4 md:grid-cols-2">
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
            <Label htmlFor="plan-sort">Порядок на витрине</Label>
            <Input
              id="plan-sort"
              type="number"
              value={values.sortOrder}
              onChange={(event) => setValues((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Лимиты и доступ"
        description="Основные пользовательские ограничения, которые видны и в checkout, и в личном кабинете."
      >
        <div className="grid gap-4 md:grid-cols-3">
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
            <Label htmlFor="plan-device-limit">Лимит устройств</Label>
            <Input
              id="plan-device-limit"
              type="number"
              min={1}
              placeholder="Например, 3"
              value={values.remnawaveHwidDeviceLimit}
              onChange={(event) =>
                setValues((current) => ({ ...current, remnawaveHwidDeviceLimit: event.target.value }))
              }
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Remnawave и выдача"
        description="Все параметры provisioning собраны отдельно, чтобы они не конкурировали с ценой и лимитами."
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Текущий tag</p>
            <p className="mt-2 break-all text-sm text-white">{remnawaveTag || "—"}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-external-squad">Внешний сквад Remnawave</Label>
              <Input
                id="plan-external-squad"
                placeholder="UUID внешнего сквада"
                value={values.remnawaveExternalSquadUuid ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, remnawaveExternalSquadUuid: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-internal-squads">Внутренние сквады Remnawave</Label>
              <Textarea
                id="plan-internal-squads"
                placeholder="По одному UUID на строку или через запятую"
                value={internalSquadsText}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    remnawaveInternalSquadUuids: Array.from(
                      new Set(
                        event.target.value
                          .split(/[\n,]+/)
                          .map((item) => item.trim())
                          .filter(Boolean)
                      )
                    )
                  }))
                }
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Публикация и действия"
        description="Статус публикации и сохранение оставляем последним шагом, чтобы форма читалась сверху вниз."
      >
        <div className="grid gap-4">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Активный тариф
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
              onClick={() => router.push("/admin/plans")}
            >
              Отмена
            </Button>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
