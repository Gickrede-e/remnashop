import Link from "next/link";
import { Shield } from "lucide-react";

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
    <Link href={href} className={cn("appLogo", compact && "appLogoCompact", rail && "appLogoRail", className)}>
      <span className="appLogoMark" aria-hidden="true">
        <span className="appLogoMarkCore">
          <Shield className="iconSm" />
        </span>
      </span>
      <span className="appLogoBody">
        {!compact ? <span className="appLogoEyebrow">{rail ? "Единый контур" : "Защищённый доступ"}</span> : null}
        <span className="appLogoWordmark">GickShop</span>
      </span>
    </Link>
  );
}
