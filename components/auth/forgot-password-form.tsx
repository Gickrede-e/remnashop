"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { publicEnv } from "@/lib/public-env";
import { OtpInput } from "@/components/auth/otp-input";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

type Step = "email" | "otp";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [pending, startTransition] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnstileEnabled = Boolean(publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  function startCountdown() {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (turnstileEnabled && !turnstileToken) {
      setError("Подождите, идёт проверка капчи…");
      return;
    }
    const body = JSON.stringify({ email, cfTurnstileToken: turnstileToken ?? undefined });
    startTransition(async () => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const payload = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "Ошибка. Попробуйте снова.");
        setTurnstileToken(null);
        return;
      }
      setStep("otp");
      startCountdown();
    });
  }

  function handleResend() {
    if (countdown > 0) return;
    setError(null);
    if (turnstileEnabled && !turnstileToken) {
      setError("Подождите, идёт проверка капчи…");
      return;
    }
    const body = JSON.stringify({ email, cfTurnstileToken: turnstileToken ?? undefined });
    startTransition(async () => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const payload = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "Ошибка отправки кода.");
        setTurnstileToken(null);
        return;
      }
      setCode("");
      startCountdown();
    });
  }

  function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (newPassword.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      return;
    }
    if (code.length < 6) {
      setError("Введите 6-значный код");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword })
      });
      const payload = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "Не удалось сбросить пароль.");
        return;
      }
      setSuccess("Пароль успешно изменён. Войдите с новым паролем.");
      setTimeout(() => router.push("/login"), 2000);
    });
  }

  if (step === "email") {
    return (
      <form onSubmit={handleSendCode} className="authStandaloneForm" noValidate>
        <div className="authStandaloneField">
          <label htmlFor="fp-email" className="srOnly">Email</label>
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            className="authStandaloneInput"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <TurnstileWidget
          onToken={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
        />
        {error && <p className="authStandaloneError">{error}</p>}
        <button
          type="submit"
          className="authStandaloneSubmit"
          disabled={pending || !email || (turnstileEnabled && !turnstileToken)}
        >
          {pending ? "Отправляем..." : "Отправить код"}
        </button>
        <p className="authStandaloneFooter">
          <Link href="/login" className="authStandaloneFooterLink">← Назад к входу</Link>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleReset} className="authStandaloneForm" noValidate>
      <p className="otpHint">
        Код отправлен на <strong>{email}</strong>. Проверьте папку «Спам».
      </p>

      <div className="authStandaloneField">
        <OtpInput value={code} onChange={setCode} disabled={pending} />
      </div>

      <div className="authStandaloneField">
        <label htmlFor="fp-newpw" className="srOnly">Новый пароль</label>
        <input
          id="fp-newpw"
          type="password"
          autoComplete="new-password"
          placeholder="Новый пароль"
          className="authStandaloneInput"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>

      <div className="authStandaloneField">
        <label htmlFor="fp-confirmpw" className="srOnly">Подтвердите пароль</label>
        <input
          id="fp-confirmpw"
          type="password"
          autoComplete="new-password"
          placeholder="Подтвердите пароль"
          className="authStandaloneInput"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className="authStandaloneError">{error}</p>}
      {success && <p className="authStandaloneSuccess">{success}</p>}

      <button
        type="submit"
        className="authStandaloneSubmit"
        disabled={pending || code.length < 6}
      >
        {pending ? "Сохраняем..." : "Сменить пароль"}
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
          onClick={() => { setStep("email"); setError(null); setCode(""); }}
        >
          Назад
        </button>
      </div>
    </form>
  );
}
