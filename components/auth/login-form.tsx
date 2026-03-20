"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildRegisterHref, sanitizeNextPath } from "@/lib/auth/navigation";
import { loginSchema } from "@/lib/schemas/auth";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({
  telegramUsername,
  nextPath
}: {
  telegramUsername?: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const safeNextPath = sanitizeNextPath(nextPath);
  const registerHref = buildRegisterHref(safeNextPath);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        data?: { user?: { role?: "USER" | "ADMIN" } };
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Ошибка входа");
        return;
      }

      const role = payload.data?.user?.role ?? "USER";
      router.push(safeNextPath ?? (role === "ADMIN" ? "/admin" : "/dashboard"));
      router.refresh();
    });
  });

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Вход в GickVPN</CardTitle>
        <CardDescription>Войдите по email или через Telegram, чтобы открыть кабинет.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Входим..." : "Войти"}
          </Button>
        </form>

        <div className="space-y-3">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-zinc-500">или</p>
          <TelegramLoginButton botUsername={telegramUsername} nextPath={safeNextPath} />
        </div>

        <p className="text-sm text-zinc-400">
          Нет аккаунта?{" "}
          <Link href={registerHref} className="text-cyan-300 hover:text-cyan-200">
            Зарегистрироваться
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
