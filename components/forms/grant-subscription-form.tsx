"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GrantSubscriptionForm({
  users,
  plans
}: {
  users: Array<{ id: string; email: string }>;
  plans: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [durationDays, setDurationDays] = useState("");
  const [trafficGB, setTrafficGB] = useState("");
  const [note, setNote] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ручная выдача подписки</CardTitle>
        <CardDescription>Используйте форму, если нужно активировать доступ без оплаты.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="userId">Пользователь</Label>
            <select id="userId" className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4" value={userId} onChange={(event) => setUserId(event.target.value)}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planId">Тариф</Label>
            <select id="planId" className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4" value={planId} onChange={(event) => setPlanId(event.target.value)}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="durationDays">Дни</Label>
            <Input id="durationDays" type="number" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trafficGB">ГБ</Label>
            <Input id="trafficGB" type="number" value={trafficGB} onChange={(event) => setTrafficGB(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Комментарий</Label>
            <Input id="note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <div className="mt-4">
          <Button
            disabled={pending || !userId || !planId}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const response = await fetch("/api/admin/subscriptions/grant", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    userId,
                    planId,
                    durationDays: durationDays ? Number(durationDays) : undefined,
                    trafficGB: trafficGB ? Number(trafficGB) : undefined,
                    note: note || undefined
                  })
                });

                const payload = (await response.json()) as { ok: boolean; error?: { message?: string } };
                if (!response.ok || !payload.ok) {
                  setError(payload.error?.message ?? "Не удалось выдать подписку");
                  return;
                }

                router.refresh();
              })
            }
          >
            {pending ? "Выдача..." : "Выдать подписку"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
