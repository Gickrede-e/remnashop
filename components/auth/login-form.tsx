"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { buildRegisterHref, sanitizeNextPath } from "@/lib/auth/navigation";
import { loginSchema } from "@/lib/schemas/auth";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ nextPath }: { nextPath?: string }) {
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
          autoComplete="current-password"
          placeholder="Пароль"
          className="authStandaloneInput"
          {...form.register("password")}
        />
      </div>
      {error ? <p className="authStandaloneError">{error}</p> : null}
      <button type="submit" className="authStandaloneSubmit" disabled={pending}>
        {pending ? "Входим..." : "Войти"}
      </button>
      <p className="authStandaloneFooter">
        Нет аккаунта?{" "}
        <Link href={buildRegisterHref(safeNextPath)} className="authStandaloneFooterLink">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}
