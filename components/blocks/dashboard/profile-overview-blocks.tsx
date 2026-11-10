"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Circle, CircleCheck, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

import { readApiEnvelope } from "@/lib/api-envelope";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: z.string().min(8, "Пароль должен содержать минимум 8 символов").max(128),
    confirmPassword: z.string().min(1, "Подтвердите новый пароль")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"]
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

type ProfileOverviewBlocksProps = {
  email: string;
};

export function ProfileOverviewBlocks({ email }: ProfileOverviewBlocksProps) {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });
  const { errors } = form.formState;

  const [newPassword, confirmPassword] = useWatch({
    control: form.control,
    name: ["newPassword", "confirmPassword"]
  });
  const passwordChecks = [
    { label: "Минимум 8 символов", isMet: newPassword.length >= 8 },
    { label: "Пароли совпадают", isMet: confirmPassword !== "" && confirmPassword === newPassword }
  ];

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        })
      });

      const payload = await readApiEnvelope(response);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "Не удалось изменить пароль");
        return;
      }

      setSuccess("Пароль успешно изменён");
      form.reset();
    });
  });

  return (
    <div className="dashWorkspace">
      <div className="dashCard">
        <div className="dashCardHead">
          <h2 className="dashCardTitle">Учётная запись</h2>
        </div>
        <div className="profileForm">
          <div className="profileFormField">
            <label htmlFor="accountEmail" className="profileFormLabel">
              Email
            </label>
            <input id="accountEmail" type="email" className="profileFormInput" value={email} readOnly disabled />
          </div>
          <Link href="/terms" className="profileTermsLink">
            Пользовательское соглашение
          </Link>
        </div>
      </div>

      <div className="dashCard">
        <div className="dashCardHead">
          <h2 className="dashCardTitle">Изменить пароль</h2>
        </div>
        <form onSubmit={onSubmit} className="profileForm" noValidate>
          <PasswordField
            id="currentPassword"
            label="Текущий пароль"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            registration={form.register("currentPassword")}
          />
          <PasswordField
            id="newPassword"
            label="Новый пароль"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            registration={form.register("newPassword")}
          />
          <PasswordField
            id="confirmPassword"
            label="Подтвердите новый пароль"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            registration={form.register("confirmPassword")}
          />

          <ul className="profilePasswordChecks" aria-live="polite">
            {passwordChecks.map((check) => (
              <li key={check.label} className={check.isMet ? "profilePasswordCheck is-met" : "profilePasswordCheck"}>
                {check.isMet ? (
                  <CircleCheck className="iconSm iconNoShrink" aria-hidden="true" />
                ) : (
                  <Circle className="iconSm iconNoShrink" aria-hidden="true" />
                )}
                {check.label}
                <span className="srOnly">{check.isMet ? ": выполнено" : ": не выполнено"}</span>
              </li>
            ))}
          </ul>

          {error && <p className="profileFormError">{error}</p>}
          {success && <p className="profileFormSuccess">{success}</p>}

          <button type="submit" className="profileFormSubmit" disabled={pending}>
            {pending ? "Сохраняем..." : "Сохранить"}
          </button>
        </form>
      </div>
    </div>
  );
}

type PasswordFieldProps = {
  id: keyof ChangePasswordValues;
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  registration: UseFormRegisterReturn;
};

function PasswordField({ id, label, autoComplete, error, registration }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="profileFormField">
      <label htmlFor={id} className="profileFormLabel">
        {label}
      </label>
      <div className="profilePasswordInput">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          className="profileFormInput"
          {...registration}
        />
        <button
          type="button"
          className="profilePasswordToggle"
          aria-label="Показать пароль"
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? (
            <EyeOff className="iconSm" aria-hidden="true" />
          ) : (
            <Eye className="iconSm" aria-hidden="true" />
          )}
        </button>
      </div>
      {error && <p className="profileFormError">{error}</p>}
    </div>
  );
}
