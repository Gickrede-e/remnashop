import Link from "next/link";
import { Shield } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3">
      <span
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-violet-500/25 via-violet-400/10 to-blue-500/25 text-violet-200 shadow-glow",
          compact && "h-9 w-9"
        )}
      >
        <Shield className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-['Space_Grotesk'] text-lg font-semibold tracking-tight">GickVPN</span>
        {!compact ? <span className="text-xs text-muted-foreground">VPN-подписки без лишнего шума</span> : null}
      </span>
    </Link>
  );
}
