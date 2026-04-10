"use client";

import { useTransition } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
};

export function LogoutButton({
  className,
  label = "Выйти",
  variant = "secondary",
  size = "sm"
}: LogoutButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      className={cn(className)}
      variant={variant}
      size={size}
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.assign("/login");
        })
      }
      disabled={pending}
    >
      {pending ? "Выход..." : label}
    </Button>
  );
}
