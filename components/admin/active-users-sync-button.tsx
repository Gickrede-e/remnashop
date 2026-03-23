"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type ActiveUsersSyncPayload = {
  data?: {
    totalCandidates: number;
    created: number;
    attached: number;
    alreadyLinked: number;
    skipped: number;
    failed: number;
  };
  error?: string | { message?: string };
};

export function ActiveUsersSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-center sm:w-auto"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const response = await fetch("/api/admin/users/sync", { method: "POST" });
            const payload = (await response.json().catch(() => null)) as ActiveUsersSyncPayload | null;

            if (!response.ok || !payload?.data) {
              const error =
                typeof payload?.error === "string"
                  ? payload.error
                  : payload?.error?.message ?? "Не удалось синхронизировать активных пользователей";

              window.alert(error);
              return;
            }

            const summary = payload.data;

            window.alert(
              `Активные подписки: ${summary.totalCandidates}; создано: ${summary.created}; привязано: ${summary.attached}; уже связаны: ${summary.alreadyLinked}; пропущено: ${summary.skipped}; ошибки: ${summary.failed}`
            );
            router.refresh();
          } catch {
            window.alert("Не удалось синхронизировать активных пользователей");
          }
        })
      }
    >
      {pending ? "Синхронизация..." : "Синхронизировать активных"}
    </Button>
  );
}
