// components/shared/logo.tsx
//
// Новый словознак для GickShop в духе терминала:
//   gickshop_
// где «_» — мигающий зелёный курсор. Без Shield-иконки, без подложки.
// Полностью текстовый знак, читаемый в любом масштабе.

import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  compact = false,
  variant = "default"
}: {
  className?: string;
  href?: string;
  compact?: boolean;
  variant?: "default" | "rail";
}) {
  const rail = variant === "rail";

  return (
    <Link
      href={href}
      className={cn("appLogo", compact && "appLogoCompact", rail && "appLogoRail", className)}
      aria-label="GickShop"
    >
      <span className="appLogoWordmark">gickshop</span>
      <span className="appLogoCursor" aria-hidden="true" />
    </Link>
  );
}
