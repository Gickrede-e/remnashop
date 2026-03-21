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
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 text-white shadow-glow",
          compact ? "h-9 w-9" : "h-10 w-10"
        )}
      >
        <Shield className="h-5 w-5" />
      </span>
      <span className={cn("font-semibold tracking-wide text-white", compact ? "text-base" : "text-lg")}>GickVPN</span>
    </Link>
  );
}
