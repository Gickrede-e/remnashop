"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

  const runAction = (action: () => Promise<Response>) => {
    startTransition(async () => {
      try {
        const response = await action();

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string | { message?: string } }
            | null;
          const error =
            typeof payload?.error === "string"
              ? payload.error
              : payload?.error?.message ?? "Не удалось выполнить действие";

          window.alert(error);
          return;
        }

        router.refresh();
      } catch {
        window.alert("Не удалось выполнить действие");
      }
    });
  };

  const fieldId = (name: string) => `${idPrefix}-${name}-${userId}`;

  return (
    <div className="adminUserActions">
      <div className="adminUserActionGrid">
        <Button
          type="button"
          size="sm"
          className="commandButton commandButtonSecondary"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            runAction(async () => {
              return fetch(`/api/admin/users/${userId}/sync`, { method: "POST" });
            })
          }
        >
          Синхронизировать
        </Button>
        <Button
          type="button"
          size="sm"
          className="commandButton commandButtonSecondary"
          variant="outline"
          disabled={pending}
          onClick={() =>
            runAction(async () => {
              return fetch(`/api/admin/users/${userId}/toggle`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  enabled: !currentlyEnabled
                })
              });
            })
          }
        >
          {currentlyEnabled ? "Отключить" : "Включить"}
        </Button>
        {subscriptionId ? (
          <Button
            type="button"
            size="sm"
            className="commandButton commandButtonDanger adminUserActionWide"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              runAction(async () => {
                return fetch(`/api/admin/subscriptions/${subscriptionId}/revoke`, { method: "POST" });
              })
            }
          >
            Отозвать
          </Button>
        ) : null}
      </div>

      <details className="grantFormSurface">
        <summary className="grantFormSummary">
          Выдать подписку вручную
        </summary>
        <div className="grantFormBody">
          <div className="controlField">
            <Label htmlFor={fieldId("grant-plan")}>Тариф</Label>
            <select
              id={fieldId("grant-plan")}
              disabled={pending}
              className="controlSurface controlSelect"
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
          <div className="controlFieldGrid">
            <div className="controlField">
              <Label htmlFor={fieldId("grant-days")}>Дни</Label>
              <Input
                id={fieldId("grant-days")}
                type="number"
                disabled={pending}
                value={grantState.durationDays}
                onChange={(event) => setGrantState((current) => ({ ...current, durationDays: event.target.value }))}
              />
            </div>
            <div className="controlField">
              <Label htmlFor={fieldId("grant-traffic")}>Трафик, ГБ</Label>
              <Input
                id={fieldId("grant-traffic")}
                type="number"
                disabled={pending}
                value={grantState.trafficGB}
                onChange={(event) => setGrantState((current) => ({ ...current, trafficGB: event.target.value }))}
              />
            </div>
          </div>
          <div className="controlField">
            <Label htmlFor={fieldId("grant-note")}>Комментарий</Label>
            <Input
              id={fieldId("grant-note")}
              disabled={pending}
              value={grantState.note}
              onChange={(event) => setGrantState((current) => ({ ...current, note: event.target.value }))}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="commandButton commandButtonPrimary"
            disabled={pending}
            onClick={() =>
              runAction(async () => {
                return fetch("/api/admin/subscriptions/grant", {
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
              })
            }
          >
            {pending ? "Сохраняем..." : "Выдать"}
          </Button>
        </div>
      </details>
    </div>
  );
}
