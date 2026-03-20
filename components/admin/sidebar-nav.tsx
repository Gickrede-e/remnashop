"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
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
  { href: "/admin/export", label: "Экспорт", icon: ArrowDownToLine },
  { href: "/dashboard", label: "Личный кабинет", icon: ArrowLeft }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="page-surface h-fit overflow-hidden p-3 lg:p-4">
      <p className="hidden px-3 pb-3 text-xs uppercase tracking-[0.24em] text-zinc-500 lg:block">Админ-панель</p>
      <nav className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:gap-2 lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 min-w-max shrink-0 snap-start items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white lg:px-3",
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
