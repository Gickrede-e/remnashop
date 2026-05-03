"use client";

import { type ComponentPropsWithoutRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ReissueSubscriptionButtonProps = {
  className?: string;
  label?: string;
} & Omit<ComponentPropsWithoutRef<"button">, "type" | "onClick" | "children">;

export function ReissueSubscriptionButton({
  className,
  label = "Перевыпуск подписки",
  ...buttonProps
}: ReissueSubscriptionButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleReissue() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/subscription/reissue", { method: "POST" });
        const payload = (await response.json().catch(() => null)) as {
          ok: boolean;
          error?: string;
        } | null;

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? "Не удалось перевыпустить подписку");
          return;
        }

        setOpen(false);
        router.refresh();
      } catch {
        setError("Не удалось выполнить запрос. Попробуйте ещё раз.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={cn(className || "dashSidebarCta")} {...buttonProps}>
          {label}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перевыпуск подписки</DialogTitle>
          <DialogDescription className="commandDialogDescription">
            <span className="commandDialogLine">
              После подтверждения <strong className="commandDialogStrong">ссылка на подписку изменится</strong>.
            </span>
            <span className="commandDialogLine">Текущая ссылка перестанет работать сразу после перевыпуска.</span>
            <span className="commandDialogLine">
              Все устройства будут отключены, их нужно будет подключить заново по новой ссылке.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="commandDialogActions">
          {error ? <p className="commandError">{error}</p> : null}
          <Button variant="destructive" disabled={pending} onClick={handleReissue}>
            {pending ? "Перевыпуск..." : "Подтвердить перевыпуск"}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
