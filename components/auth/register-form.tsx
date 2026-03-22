"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeNextPath } from "@/lib/auth/navigation";
import { registerSchema } from "@/lib/schemas/auth";

const clientRegisterSchema = registerSchema.extend({
  referralCode: registerSchema.shape.referralCode.optional()
});

type RegisterValues = z.infer<typeof clientRegisterSchema>;

export function RegisterForm({
  referralCode,
  nextPath
}: {
  referralCode?: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const safeNextPath = sanitizeNextPath(nextPath);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(clientRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      referralCode: referralCode ?? ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Ошибка регистрации");
        return;
      }

      router.push(safeNextPath ?? "/dashboard");
      router.refresh();
    });
  });

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referralCode">Реферальный код</Label>
          <Input id="referralCode" {...form.register("referralCode")} placeholder="Необязательно" />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Создаем аккаунт..." : "Создать аккаунт"}
        </Button>
      </form>

      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-zinc-400">
        После регистрации можно сразу выбрать тариф, применить промокод и оплатить подписку.
      </div>
    </div>
  );
}
