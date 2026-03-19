"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function AsyncActionButton({
  label,
  pendingLabel,
  variant = "secondary",
  endpoint,
  method = "POST"
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch(endpoint, { method });
          router.refresh();
        })
      }
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
