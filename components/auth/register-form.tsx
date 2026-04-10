"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
              autoComplete="new-password"
              {...form.register("password")}
            />
          </div>
          <div className="authField">
            <Label htmlFor="referralCode">Реферальный код</Label>
            <Input
              id="referralCode"
              defaultValue={referralCode ?? ""}
              {...form.register("referralCode")}
              placeholder="Необязательно"
            />
          </div>
          {error ? <p className="authError">{error}</p> : null}
          <Button type="submit" className="authSubmit" disabled={pending}>
            {pending ? "Создаем аккаунт..." : "Создать аккаунт"}
          </Button>
        </div>
      </form>

      <div className="authFormFooter">
        <p className="authFormFooterText">
          Уже есть аккаунт?{" "}
          <Link href={buildLoginHref(safeNextPath)} className="authFormFooterLink">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
