"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { OtpInput } from "@/components/auth/otp-input";
import { useTurnstile } from "@/components/auth/turnstile-widget";
import { readApiEnvelope } from "@/lib/api-envelope";

type Step = "email" | "otp";

export function ForgotPasswordForm({ turnstileSiteKey = "" }: { turnstileSiteKey?: string }) {
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
  const turnstile = useTurnstile(turnstileSiteKey);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCountdown() {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    const resendAt = Date.now() + 60_000;
    timerRef.current = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setCountdown(seconds);
      if (!seconds) clearInterval(timerRef.current!);
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function sendCode() {
    setError(null);
    try {
      await turnstile.run(async (cfTurnstileToken) => {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, cfTurnstileToken })
        });
        const payload = await readApiEnvelope(res);
        if (!res.ok || !payload?.ok) throw new Error(payload?.error ?? "Ошибка отправки кода");
        setStep("otp");
        setCode("");
        startCountdown();
      });
    } catch (error) {
      setError(error instanceof Error && !(error instanceof TypeError)
        ? error.message : "Не удалось отправить запрос. Попробуйте ещё раз.");
    }
  }

  function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    startTransition(sendCode);
  }

  function handleResend() {
    if (countdown > 0 || pending) return;
    startTransition(sendCode);
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
      const payload = await readApiEnvelope(res);
      if (!res.ok || !payload?.ok) {
        setError(payload?.error ?? "Не удалось сбросить пароль.");
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
        {turnstile.widget}
        {error && <p className="authStandaloneError" role="alert">{error}</p>}
        <button
          type="submit"
          className="authStandaloneSubmit"
          disabled={pending || !email || !turnstile.ready}
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

      {turnstile.widget}
      {error && <p className="authStandaloneError" role="alert">{error}</p>}
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
          disabled={countdown > 0 || pending || !turnstile.ready}
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
