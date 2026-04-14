"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Не удалось изменить пароль");
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
        <p className="profileEmail">{email}</p>
      </div>

      <div className="dashCard">
        <div className="dashCardHead">
          <h2 className="dashCardTitle">Изменить пароль</h2>
        </div>
        <form onSubmit={onSubmit} className="profileForm" noValidate>
          <div className="profileFormField">
            <label htmlFor="currentPassword" className="profileFormLabel">
              Текущий пароль
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className="profileFormInput"
              {...form.register("currentPassword")}
            />
            {form.formState.errors.currentPassword && (
              <p className="profileFormError">{form.formState.errors.currentPassword.message}</p>
            )}
          </div>

          <div className="profileFormField">
            <label htmlFor="newPassword" className="profileFormLabel">
              Новый пароль
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="profileFormInput"
              {...form.register("newPassword")}
            />
            {form.formState.errors.newPassword && (
              <p className="profileFormError">{form.formState.errors.newPassword.message}</p>
            )}
          </div>

          <div className="profileFormField">
            <label htmlFor="confirmPassword" className="profileFormLabel">
              Подтвердите новый пароль
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="profileFormInput"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="profileFormError">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

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
