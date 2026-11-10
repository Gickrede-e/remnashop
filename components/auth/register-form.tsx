"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { buildLoginHref, sanitizeNextPath } from "@/lib/auth/navigation";
import { registerSchema } from "@/lib/schemas/auth";
import { OtpInput } from "@/components/auth/otp-input";
import { useTurnstile } from "@/components/auth/turnstile-widget";
import { readApiEnvelope } from "@/lib/api-envelope";

const clientRegisterSchema = registerSchema.extend({
  referralCode: registerSchema.shape.referralCode.optional()
});

type RegisterValues = z.infer<typeof clientRegisterSchema>;

type RegisterFormProps = {
  emailEnabled: boolean;
  turnstileSiteKey?: string;
  referralCode?: string;
  nextPath?: string;
};

export function RegisterForm({ emailEnabled, turnstileSiteKey = "", referralCode, nextPath }: RegisterFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const turnstile = useTurnstile(turnstileSiteKey);
  const safeNextPath = sanitizeNextPath(nextPath);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(clientRegisterSchema),
    defaultValues: { email: "", password: "", referralCode: referralCode ?? "" }
  });

  useEffect(() => {
    if (!resendAt) {
      return;
    }

    const timerId = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setCountdown(seconds);
      if (!seconds) clearInterval(timerId);
    }, 1000);

    return () => clearInterval(timerId);
  }, [resendAt]);

  async function sendRegistration(values: RegisterValues) {
    setError(null);
    try {
      await turnstile.run(async (cfTurnstileToken) => {
        const res = await fetch(emailEnabled ? "/api/auth/send-verification" : "/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, cfTurnstileToken })
        });
        const payload = await readApiEnvelope(res);
        if (!res.ok || !payload?.ok) throw new Error(payload?.error ?? "Ошибка регистрации");
        if (emailEnabled) {
          setOtpEmail(values.email);
          setShowOtp(true);
          setOtpCode("");
          setResendAt(Date.now() + 60_000);
          setCountdown(60);
        } else {
          router.push(safeNextPath ?? "/dashboard");
          router.refresh();
        }
      });
    } catch (error) {
      setError(error instanceof Error && !(error instanceof TypeError)
        ? error.message : "Не удалось отправить запрос. Попробуйте ещё раз.");
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    void form.handleSubmit((values) => {
      startTransition(() => sendRegistration(values));
    })(event);
  }

  function handleResend() {
    if (countdown > 0 || pending) return;
    startTransition(() => sendRegistration(form.getValues()));
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
      const payload = await readApiEnvelope(res);
      if (!res.ok || !payload?.ok) {
        setError(payload?.error ?? "Неверный или истёкший код");
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
        {turnstile.widget}
        {error && <p className="authStandaloneError" role="alert">{error}</p>}
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
            disabled={countdown > 0 || pending || !turnstile.ready}
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
        <label htmlFor="referralCode" className="srOnly">Реферальный код (необязательно)</label>
        <input
          id="referralCode"
          type="text"
          defaultValue={referralCode ?? ""}
          placeholder="Реферальный код"
          className="authStandaloneInput"
          {...form.register("referralCode")}
        />
      </div>
      {turnstile.widget}
      {error && <p className="authStandaloneError" role="alert">{error}</p>}
      <button
        type="submit"
        className="authStandaloneSubmit"
        disabled={pending || !turnstile.ready}
      >
        {pending
          ? emailEnabled ? "Отправляем код..." : "Создаем аккаунт..."
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
