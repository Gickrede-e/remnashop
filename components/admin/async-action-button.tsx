"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function AsyncActionButton({
  label,
  pendingLabel,
  variant = "secondary",
  endpoint,
  method = "POST",
  confirmMessage
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (confirmMessage && !window.confirm(confirmMessage)) {
            return;
          }

          const response = await fetch(endpoint, { method });
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            window.alert(payload?.error ?? "Не удалось выполнить действие");
            return;
          }
          router.refresh();
        })
      }
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
