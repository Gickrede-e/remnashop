"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Gauge, History, Share2, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Обзор", icon: Gauge, exact: true },
  { href: "/dashboard/buy", label: "Купить", icon: CreditCard, exact: false },
  { href: "/dashboard/devices", label: "Устройства", icon: Smartphone, exact: false },
  { href: "/dashboard/history", label: "История", icon: History, exact: false },
  { href: "/dashboard/referrals", label: "Рефералы", icon: Share2, exact: false }
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="dashMobileNav" aria-label="Мобильная навигация">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("dashMobileNavItem", active && "is-active")}
          >
            <item.icon className="dashMobileNavItemIcon" aria-hidden="true" />
            <span className="dashMobileNavItemLabel">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
