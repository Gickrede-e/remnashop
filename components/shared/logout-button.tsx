"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      className={cn(className)}
      variant="secondary"
      size="sm"
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.assign("/login");
        })
      }
      disabled={pending}
    >
      {pending ? "Выход..." : "Выйти"}
    </Button>
  );
}
