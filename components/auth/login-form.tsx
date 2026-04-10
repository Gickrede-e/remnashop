"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeNextPath } from "@/lib/auth/navigation";
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
    <div className="authFormPanel authCardForm">
      <form onSubmit={onSubmit} className="authForm">
        <div className="authFormGrid">
          <div className="authField">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          </div>
          <div className="authField">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
          </div>
          {error ? <p className="authError">{error}</p> : null}
          <Button type="submit" className="authSubmit" disabled={pending}>
            {pending ? "Входим..." : "Войти"}
          </Button>
        </div>
      </form>

      <div className="authTelegramSection">
        <div className="authDivider" aria-hidden="true">
          <span>или</span>
        </div>

        <div className="authTelegram">
          <p className="authTelegramLabel">Telegram gateway</p>
          <TelegramLoginButton botUsername={telegramUsername} nextPath={safeNextPath} />
        </div>
      </div>

      <div className="authHint">
        После входа вы вернетесь в кабинет или продолжите покупку без лишних шагов.
      </div>
    </div>
  );
}
