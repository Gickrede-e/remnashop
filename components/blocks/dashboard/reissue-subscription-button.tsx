"use client";

import { useState, useTransition } from "react";
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

export function ReissueSubscriptionButton() {
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
        <Button variant="destructive" className="commandButton commandButtonDanger">
          Перевыпустить подписку
          <span className="commandButtonGlyph">↻</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перевыпуск подписки</DialogTitle>
          <DialogDescription className="commandDialogDescription">
            <span className="commandDialogLine">
              Будет сгенерирована <strong className="commandDialogStrong">новая ссылка для подключения</strong>.
            </span>
            <span className="commandDialogLine">Текущая ссылка перестанет работать.</span>
            <span className="commandDialogLine">
              Все устройства нужно будет подключить заново по новой ссылке.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="commandDialogActions">
          {error ? (
            <p className="commandError">{error}</p>
          ) : null}
          <Button
            variant="destructive"
            className="commandButton commandButtonDanger"
            disabled={pending}
            onClick={handleReissue}
          >
            {pending ? "Перевыпуск..." : "Подтвердить перевыпуск"}
          </Button>
          <Button
            variant="secondary"
            className="commandButton commandButtonSecondary"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
