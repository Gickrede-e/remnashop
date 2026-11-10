import {
  ArrowDownToLine,
  ArrowLeft,
  BadgePercent,
  Boxes,
  CircleUserRound,
  ClipboardList,
  CreditCard,
  Gauge,
  History,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Share2,
  Smartphone,
  Users,
  type LucideIcon
} from "lucide-react";

import type { AppShellArea } from "@/lib/ui/app-shell-nav";

const navIcons: Record<string, LucideIcon> = {
  "/dashboard": Gauge,
  "/dashboard/buy": CreditCard,
  "/dashboard/devices": Smartphone,
  "/dashboard/history": History,
  "/dashboard/referrals": Share2,
  "/dashboard/help": LifeBuoy,
  "/dashboard/profile": CircleUserRound,
  "/admin": LayoutDashboard,
  "/admin/users": Users,
  "/admin/payments": CreditCard,
  "/admin/plans": Boxes,
  "/admin/promos": BadgePercent,
  "/admin/referrals": Share2,
  "/admin/broadcasts": Mail,
  "/admin/logs": ClipboardList,
  "/admin/export": ArrowDownToLine
};

export function resolveNavIcon(area: AppShellArea, href: string) {
  if (area === "admin" && href === "/dashboard") {
    return ArrowLeft;
  }

  return navIcons[href] ?? ArrowLeft;
}
