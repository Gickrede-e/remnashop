"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
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
  Menu,
  Share2,
  Users,
  type LucideIcon
} from "lucide-react";

import { AppBottomNav } from "@/components/shell/app-bottom-nav";
import { AppMoreSheet } from "@/components/shell/app-more-sheet";
import { AppTopbar } from "@/components/shell/app-topbar";
import {
  getPrimaryNavItems,
  getSecondaryNavItems,
  isNavItemActive,
  type AppNavItem,
  type AppShellArea
} from "@/lib/ui/app-shell-nav";

type AppShellProps = {
  area: AppShellArea;
  children: React.ReactNode;
};

const navIcons: Record<string, LucideIcon> = {
  "#more": Menu,
  "/dashboard": Gauge,
  "/dashboard/buy": CreditCard,
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

function resolveIcon(area: AppShellArea, item: AppNavItem) {
  if (area === "admin" && item.href === "/dashboard") {
    return ArrowLeft;
  }

  return navIcons[item.href] ?? ArrowLeft;
}

function decorateItems(area: AppShellArea, items: AppNavItem[], pathname: string, moreActive: boolean) {
  return items.map((item) => ({
    ...item,
    icon: resolveIcon(area, item),
    active: item.href === "#more" ? moreActive : isNavItemActive(pathname, item.href)
  }));
}

export function AppShell({ area, children }: AppShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreSheetId = `${area}-more-sheet`;

  const secondaryItems = decorateItems(area, getSecondaryNavItems(area), pathname, false);

  const isMoreActive = secondaryItems.some((item) => item.active);

  const primaryItems = decorateItems(area, getPrimaryNavItems(area), pathname, isMoreActive);

  const currentLabel =
    [...secondaryItems, ...primaryItems.filter((item) => item.href !== "#more")].find((item) => item.active)?.label ??
    primaryItems[0]?.label ??
    "Обзор";

  const topbarPrimaryItems = primaryItems.filter((item) => item.href !== "#more");

  return (
    <div className="app-shell">
      <AppTopbar
        area={area}
        currentLabel={currentLabel}
        primaryItems={topbarPrimaryItems}
        isMoreActive={isMoreActive}
        moreOpen={moreOpen}
        moreSheetId={moreSheetId}
        onOpenMore={() => setMoreOpen(true)}
      />

      <div className="container overflow-x-hidden py-4 pb-28 sm:py-6 sm:pb-32 md:pb-8 lg:py-8 lg:pb-10">
        <div className="grid min-w-0 gap-6">{children}</div>
      </div>

      <AppBottomNav
        items={primaryItems}
        moreOpen={moreOpen}
        moreSheetId={moreSheetId}
        onOpenMore={() => setMoreOpen(true)}
      />
      <AppMoreSheet
        area={area}
        items={secondaryItems}
        open={moreOpen}
        contentId={moreSheetId}
        onOpenChange={setMoreOpen}
      />
    </div>
  );
}
