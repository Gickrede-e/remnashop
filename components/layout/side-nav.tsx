"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function SideNav({
  items,
  title
}: {
  items: Array<{ href: string; label: string }>;
  title: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="page-surface h-fit p-4">
      <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "bg-gradient-to-r from-violet-500/20 to-blue-500/20 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
