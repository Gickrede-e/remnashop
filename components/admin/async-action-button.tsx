"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AsyncActionButton({
  label,
  pendingLabel,
  variant = "secondary",
  endpoint,
  method = "POST",
  confirmMessage,
  className
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
  confirmMessage?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className={cn("w-full sm:w-auto", className)}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            if (confirmMessage && !window.confirm(confirmMessage)) {
              return;
            }

            const response = await fetch(endpoint, { method });
            if (!response.ok) {
              const payload = (await response.json().catch(() => null)) as
                | { error?: string | { message?: string } }
                | null;
              const error =
                typeof payload?.error === "string"
                  ? payload.error
                  : payload?.error?.message ?? "Не удалось выполнить действие";

              window.alert(error);
              return;
            }

            router.refresh();
          } catch {
            window.alert("Не удалось выполнить действие");
          }
        })
      }
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
