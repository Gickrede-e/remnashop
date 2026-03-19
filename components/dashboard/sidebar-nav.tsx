"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Gauge, History, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Обзор", icon: Gauge },
  { href: "/dashboard/buy", label: "Купить", icon: CreditCard },
  { href: "/dashboard/history", label: "История", icon: History },
  { href: "/dashboard/referrals", label: "Рефералы", icon: Share2 }
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="page-surface h-fit p-4">
      <p className="px-3 pb-3 text-xs uppercase tracking-[0.24em] text-zinc-500">Кабинет</p>
      <nav className="grid gap-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white",
                active && "bg-white/[0.06] text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
