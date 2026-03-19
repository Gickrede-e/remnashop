import Link from "next/link";
import { Shield } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/"
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 text-white shadow-glow">
        <Shield className="h-5 w-5" />
      </span>
      <span className="text-lg font-semibold tracking-wide text-white">GickVPN</span>
    </Link>
  );
}
