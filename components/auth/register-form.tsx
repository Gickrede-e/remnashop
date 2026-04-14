"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { buildLoginHref, sanitizeNextPath } from "@/lib/auth/navigation";
import { registerSchema } from "@/lib/schemas/auth";
import { publicEnv } from "@/lib/public-env";
import { OtpInput } from "@/components/auth/otp-input";

const clientRegisterSchema = registerSchema.extend({
  referralCode: registerSchema.shape.referralCode.optional()
});

type RegisterValues = z.infer<typeof clientRegisterSchema>;

type RegisterFormProps = {
  referralCode?: string;
  nextPath?: string;
};

export function RegisterForm({ referralCode, nextPath }: RegisterFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safeNextPath = sanitizeNextPath(nextPath);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(clientRegisterSchema),
    defaultValues: { email: "", password: "", referralCode: referralCode ?? "" }
  });

  function startCountdown() {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      if (publicEnv.EMAIL_ENABLED) {
        // Step 1: send verification code
        const res = await fetch("/api/auth/send-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        });
        const payload = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !payload.ok) {
          setError(payload.error ?? "Ошибка отправки кода");
          return;
        }
        setOtpEmail(values.email);
        setShowOtp(true);
        startCountdown();
      } else {
        // Direct registration (no email verification)
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        });
        const payload = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !payload.ok) {
          setError(payload.error ?? "Ошибка регистрации");
          return;
        }
        router.push(safeNextPath ?? "/dashboard");
        router.refresh();
      }
    });
  });

  function handleResend() {
    if (countdown > 0) return;
    setError(null);
    const values = form.getValues();
    startTransition(async () => {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const payload = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "Ошибка отправки кода");
        return;
      }
      setOtpCode("");
      startCountdown();
    });
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otpCode.length < 6) {
      setError("Введите 6-значный код");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code: otpCode })
      });
      const payload = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "Неверный или истёкший код");
        return;
      }
      router.push(safeNextPath ?? "/dashboard");
      router.refresh();
    });
  }

  // OTP verification step
  if (showOtp) {
    return (
      <form onSubmit={handleVerify} className="authStandaloneForm" noValidate>
        <p className="otpHint">
          Код отправлен на <strong>{otpEmail}</strong>. Проверьте папку «Спам».
        </p>
        <div className="authStandaloneField">
          <OtpInput value={otpCode} onChange={setOtpCode} disabled={pending} />
        </div>
        {error && <p className="authStandaloneError">{error}</p>}
        <button
          type="submit"
          className="authStandaloneSubmit"
          disabled={pending || otpCode.length < 6}
        >
          {pending ? "Проверяем..." : "Подтвердить"}
        </button>
        <div className="otpFooterRow">
          <button
            type="button"
            className="authStandaloneFooterLink"
            onClick={handleResend}
            disabled={countdown > 0 || pending}
          >
            {countdown > 0 ? `Отправить повторно (${countdown}с)` : "Отправить повторно"}
          </button>
          <button
            type="button"
            className="authStandaloneFooterLink"
            onClick={() => { setShowOtp(false); setError(null); setOtpCode(""); }}
          >
            Назад
          </button>
        </div>
      </form>
    );
  }

  // Registration form (step 1)
  return (
    <form onSubmit={onSubmit} className="authStandaloneForm" noValidate>
      <div className="authStandaloneField">
        <label htmlFor="email" className="srOnly">Email</label>
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
        <label htmlFor="password" className="srOnly">Пароль</label>
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
        <label htmlFor="referralCode" className="srOnly">Реферальный код</label>
        <input
          id="referralCode"
          type="text"
          defaultValue={referralCode ?? ""}
          placeholder="Реферальный код"
          className="authStandaloneInput"
          {...form.register("referralCode")}
        />
      </div>
      {error && <p className="authStandaloneError">{error}</p>}
      <button type="submit" className="authStandaloneSubmit" disabled={pending}>
        {pending
          ? publicEnv.EMAIL_ENABLED ? "Отправляем код..." : "Создаем аккаунт..."
          : "Создать аккаунт"}
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
