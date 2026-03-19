"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildLoginHref, sanitizeNextPath } from "@/lib/auth/navigation";
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
  const loginHref = buildLoginHref(safeNextPath);
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
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт, чтобы покупать и продлевать подписки GickVPN.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            {pending ? "Создаём аккаунт..." : "Создать аккаунт"}
          </Button>
        </form>

        <p className="text-sm text-zinc-400">
          Уже зарегистрированы?{" "}
          <Link href={loginHref} className="text-cyan-300 hover:text-cyan-200">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
