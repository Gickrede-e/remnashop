"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, type ButtonProps } from "@/components/ui/button";

type ApiActionButtonProps = ButtonProps & {
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  confirmMessage?: string;
  successMessage?: string;
};

export function ApiActionButton({
  endpoint,
  method = "POST",
  body,
  confirmMessage,
  successMessage,
  children,
  ...props
}: ApiActionButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        {...props}
        disabled={pending || props.disabled}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) {
            return;
          }

          setError(null);
          startTransition(async () => {
            const response = await fetch(endpoint, {
              method,
              headers: {
                "Content-Type": "application/json"
              },
              body: body ? JSON.stringify(body) : undefined
            });

            const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
            if (!response.ok) {
              setError(payload?.error?.message ?? "Операция не выполнена");
              return;
            }

            if (successMessage) {
              setError(successMessage);
            }
            router.refresh();
          });
        }}
      >
        {pending ? "..." : children}
      </Button>
      {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}
    </div>
  );
}
