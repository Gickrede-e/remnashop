"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  BadgePercent,
  Boxes,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Share2,
  Users
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/plans", label: "Тарифы", icon: Boxes },
  { href: "/admin/payments", label: "Платежи", icon: CreditCard },
  { href: "/admin/promos", label: "Промокоды", icon: BadgePercent },
  { href: "/admin/referrals", label: "Рефералы", icon: Share2 },
  { href: "/admin/logs", label: "Логи", icon: ClipboardList },
  { href: "/admin/export", label: "Экспорт", icon: ArrowDownToLine }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="page-surface h-fit p-4">
      <p className="px-3 pb-3 text-xs uppercase tracking-[0.24em] text-zinc-500">Админ-панель</p>
      <nav className="grid gap-2">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
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
