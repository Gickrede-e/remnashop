"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicEnv } from "@/lib/public-env";
import { loginSchema, registerSchema } from "@/lib/validators/auth";

const baseSchema = z.object({
  email: z.string().email("Нужен корректный email"),
  password: z.string().min(8, "Минимум 8 символов")
});

const authSchema = registerSchema.extend({
  email: baseSchema.shape.email,
  password: baseSchema.shape.password
});

type AuthFormValues = z.infer<typeof authSchema>;

export function AuthForm({
  mode,
  referralCode
}: {
  mode: "login" | "register";
  referralCode?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get("next") || (mode === "login" ? "/dashboard" : "/dashboard");

  const resolverSchema = useMemo(() => (mode === "login" ? loginSchema : authSchema), [mode]);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(resolverSchema),
    defaultValues: {
      email: "",
      password: "",
      referralCode: referralCode ?? ""
    }
  });

  const submit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          mode === "login"
            ? { email: values.email, password: values.password }
            : { email: values.email, password: values.password, referralCode: values.referralCode || undefined }
        )
      });

      const payload = (await response.json()) as { ok: boolean; error?: { message?: string } };

      if (!response.ok || !payload.ok) {
        setError(payload.error?.message ?? "Не удалось выполнить запрос");
        return;
      }

      router.push(next);
      router.refresh();
    });
  });

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{mode === "login" ? "Вход в GickVPN" : "Регистрация GickVPN"}</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Войдите в аккаунт, чтобы управлять подпиской, платежами и рефералами."
            : "Создайте аккаунт, чтобы покупать и продлевать VPN-подписки."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-sm text-red-300">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" placeholder="Минимум 8 символов" {...form.register("password")} />
            {form.formState.errors.password ? (
              <p className="text-sm text-red-300">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          {mode === "register" ? (
            <div className="space-y-2">
              <Label htmlFor="referralCode">Реферальный код</Label>
              <Input id="referralCode" placeholder="Необязательно" {...form.register("referralCode")} />
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button className="w-full" disabled={pending} type="submit">
            {pending ? "Отправка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <Button
            className="w-full"
            type="button"
            variant="secondary"
            disabled={!publicEnv.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}
            asChild={Boolean(publicEnv.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME)}
          >
            {publicEnv.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ? (
              <Link href={`https://t.me/${publicEnv.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`} target="_blank">
                Войти через Telegram
              </Link>
            ) : (
              <span>Telegram-логин недоступен без настройки бота</span>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <Link className="text-violet-200 transition hover:text-white" href={mode === "login" ? "/register" : "/login"}>
              {mode === "login" ? "Зарегистрироваться" : "Войти"}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
