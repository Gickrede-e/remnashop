import Link from "next/link";
import { Shield } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  compact = false
}: {
  className?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className={cn("appLogo", compact && "appLogoCompact", className)}>
      <span className="appLogoMark" aria-hidden="true">
        <span className="appLogoMarkCore">
          <Shield className="h-4 w-4" />
        </span>
      </span>
      <span className="appLogoBody">
        {!compact ? <span className="appLogoEyebrow">Secure commerce</span> : null}
        <span className="appLogoWordmark">GickShop</span>
      </span>
    </Link>
  );
}
