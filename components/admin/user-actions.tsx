"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminUserActions({
  userId,
  subscriptionId,
  currentlyEnabled,
  plans
}: {
  userId: string;
  subscriptionId?: string | null;
  currentlyEnabled: boolean;
  plans: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [grantState, setGrantState] = useState({
    planId: plans[0]?.id ?? "",
    durationDays: "",
    trafficGB: "",
    note: ""
  });

  const runAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => runAction(async () => {
          await fetch(`/api/admin/users/${userId}/sync`, { method: "POST" });
        })}>
          Sync
        </Button>
        <Button
          type="button"
          size="sm"
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
        <summary className="cursor-pointer select-none font-medium text-white">Выдать подписку вручную</summary>
        <div className="mt-3 grid gap-3">
          <div className="space-y-2">
            <Label htmlFor={`grant-plan-${userId}`}>Тариф</Label>
            <select
              id={`grant-plan-${userId}`}
              className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white"
              value={grantState.planId}
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
              <Label htmlFor={`grant-days-${userId}`}>Дни</Label>
              <Input
                id={`grant-days-${userId}`}
                type="number"
                value={grantState.durationDays}
                onChange={(event) => setGrantState((current) => ({ ...current, durationDays: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`grant-traffic-${userId}`}>Трафик, ГБ</Label>
              <Input
                id={`grant-traffic-${userId}`}
                type="number"
                value={grantState.trafficGB}
                onChange={(event) => setGrantState((current) => ({ ...current, trafficGB: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`grant-note-${userId}`}>Комментарий</Label>
            <Input
              id={`grant-note-${userId}`}
              value={grantState.note}
              onChange={(event) => setGrantState((current) => ({ ...current, note: event.target.value }))}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => runAction(async () => {
              await fetch("/api/admin/subscriptions/grant", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  userId,
                  planId: grantState.planId,
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
