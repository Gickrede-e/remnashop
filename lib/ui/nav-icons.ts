import {
  ArrowDownToLine,
  ArrowLeft,
  BadgePercent,
  Boxes,
  ClipboardList,
  CreditCard,
  Gauge,
  History,
  LayoutDashboard,
  Share2,
  Smartphone,
  Users,
  type LucideIcon
} from "lucide-react";

import type { AppShellNavArea } from "@/lib/ui/app-shell-nav";

const navIcons: Record<string, LucideIcon> = {
  "/": Gauge,
  "/pricing": CreditCard,
  "/faq": ClipboardList,
  "/terms": BadgePercent,
  "/dashboard": Gauge,
  "/dashboard/buy": CreditCard,
  "/dashboard/devices": Smartphone,
  "/dashboard/history": History,
  "/dashboard/referrals": Share2,
  "/admin": LayoutDashboard,
  "/admin/users": Users,
  "/admin/payments": CreditCard,
  "/admin/plans": Boxes,
  "/admin/promos": BadgePercent,
  "/admin/referrals": Share2,
  "/admin/logs": ClipboardList,
  "/admin/export": ArrowDownToLine
};

export function resolveNavIcon(area: AppShellNavArea, href: string) {
  if (area === "admin" && href === "/dashboard") {
    return ArrowLeft;
  }

  return navIcons[href] ?? ArrowLeft;
}
