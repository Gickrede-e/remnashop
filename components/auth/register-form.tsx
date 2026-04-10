"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

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
    <form onSubmit={onSubmit} className="authStandaloneForm" noValidate>
      <div className="authStandaloneField">
        <label htmlFor="email" className="srOnly">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          className="authStandaloneInput"
          {...form.register("email")}
        />
      </div>
      <div className="authStandaloneField">
        <label htmlFor="password" className="srOnly">
          Пароль
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Пароль"
          className="authStandaloneInput"
          {...form.register("password")}
        />
      </div>
      <div className="authStandaloneField">
        <label htmlFor="referralCode" className="srOnly">
          Реферальный код
        </label>
        <input
          id="referralCode"
          type="text"
          defaultValue={referralCode ?? ""}
          placeholder="Реферальный код"
          className="authStandaloneInput"
          {...form.register("referralCode")}
        />
      </div>
      {error ? <p className="authStandaloneError">{error}</p> : null}
      <button type="submit" className="authStandaloneSubmit" disabled={pending}>
        {pending ? "Создаем аккаунт..." : "Создать аккаунт"}
      </button>
      <p className="authStandaloneFooter">
        Уже есть аккаунт?{" "}
        <Link href={buildLoginHref(safeNextPath)} className="authStandaloneFooterLink">
          Войти
        </Link>
      </p>
    </form>
  );
}
