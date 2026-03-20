"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminUserActions({
  userId,
  subscriptionId,
  currentlyEnabled,
  plans,
  idPrefix = "admin-user"
}: {
  userId: string;
  subscriptionId?: string | null;
  currentlyEnabled: boolean;
  plans: Array<{ id: string; name: string }>;
  idPrefix?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [grantState, setGrantState] = useState({
    planId: plans[0]?.id ?? "",
    durationDays: "",
    trafficGB: "",
    note: ""
  });
  const selectedPlanId = useMemo(
    () => (plans.some((plan) => plan.id === grantState.planId) ? grantState.planId : plans[0]?.id ?? ""),
    [grantState.planId, plans]
  );

  const runAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  };

  const fieldId = (name: string) => `${idPrefix}-${name}-${userId}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="flex-1 sm:flex-none"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            runAction(async () => {
              await fetch(`/api/admin/users/${userId}/sync`, { method: "POST" });
            })
          }
        >
          Sync
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 sm:flex-none"
          variant="outline"
          disabled={pending}
          onClick={() => runAction(async () => {
            await fetch(`/api/admin/users/${userId}/toggle`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                enabled: !currentlyEnabled
              })
            });
          })}
        >
          {currentlyEnabled ? "Отключить" : "Включить"}
        </Button>
        {subscriptionId ? (
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            variant="destructive"
            disabled={pending}
            onClick={() => runAction(async () => {
              await fetch(`/api/admin/subscriptions/${subscriptionId}/revoke`, { method: "POST" });
            })}
          >
            Отозвать
          </Button>
        ) : null}
      </div>

      <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
        <summary className="flex min-h-11 cursor-pointer list-none items-center select-none font-medium text-white">
          Выдать подписку вручную
        </summary>
        <div className="mt-3 grid gap-3">
          <div className="space-y-2">
            <Label htmlFor={fieldId("grant-plan")}>Тариф</Label>
            <select
              id={fieldId("grant-plan")}
              className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white"
              value={selectedPlanId}
              onChange={(event) => setGrantState((current) => ({ ...current, planId: event.target.value }))}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={fieldId("grant-days")}>Дни</Label>
              <Input
                id={fieldId("grant-days")}
                type="number"
                value={grantState.durationDays}
                onChange={(event) => setGrantState((current) => ({ ...current, durationDays: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId("grant-traffic")}>Трафик, ГБ</Label>
              <Input
                id={fieldId("grant-traffic")}
                type="number"
                value={grantState.trafficGB}
                onChange={(event) => setGrantState((current) => ({ ...current, trafficGB: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("grant-note")}>Комментарий</Label>
            <Input
              id={fieldId("grant-note")}
              value={grantState.note}
              onChange={(event) => setGrantState((current) => ({ ...current, note: event.target.value }))}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={() => runAction(async () => {
              await fetch("/api/admin/subscriptions/grant", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  userId,
                  planId: selectedPlanId,
                  durationDays: grantState.durationDays ? Number(grantState.durationDays) : undefined,
                  trafficGB: grantState.trafficGB ? Number(grantState.trafficGB) : undefined,
                  note: grantState.note || undefined
                })
              });
            })}
          >
            {pending ? "Сохраняем..." : "Выдать"}
          </Button>
        </div>
      </details>
    </div>
  );
}
