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

import { AppNavRail } from "@/components/shell/app-nav-rail";
import { AppMoreSheet } from "@/components/shell/app-more-sheet";
import { AppTopbar } from "@/components/shell/app-topbar";
import {
  getFooterActions,
  getPrimaryNavItems,
  getSecondaryNavItems,
  isNavItemActive,
  type AppNavItem,
  type AppShellArea
} from "@/lib/ui/app-shell-nav";

type AppShellProps = {
  area: AppShellArea;
  canAccessAdmin?: boolean;
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

export function AppShell({ area, canAccessAdmin = false, children }: AppShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreSheetId = `${area}-more-sheet`;

  const secondaryItems = decorateItems(area, getSecondaryNavItems(area, { canAccessAdmin }), pathname, false);
  const isMoreActive = secondaryItems.some((item) => item.active);
  const primaryItems = decorateItems(area, getPrimaryNavItems(area), pathname, isMoreActive);
  const railPrimaryItems = primaryItems.filter((item) => item.href !== "#more");
  const activeRouteLabel =
    [...railPrimaryItems, ...secondaryItems].find((item) => item.active)?.label ?? railPrimaryItems[0]?.label ?? "Обзор";
  const footerActions = getFooterActions(area, { authenticated: true, canAccessAdmin });

  return (
    <div className="appShell overrridesShell">
      <a href="#app-shell-main" className="appSkipLink">
        Перейти к содержимому
      </a>
      <AppTopbar
        area={area}
        primaryItems={railPrimaryItems}
        activeRouteLabel={activeRouteLabel}
        isMoreActive={isMoreActive}
        moreOpen={moreOpen}
        moreSheetId={moreSheetId}
        onOpenMore={() => setMoreOpen(true)}
      />

      <div className="container appShellViewport">
        <AppNavRail
          area={area}
          primaryItems={railPrimaryItems}
          secondaryItems={secondaryItems}
          footerActions={footerActions}
        />
        <main id="app-shell-main" data-testid="app-shell-main" className="appShellMain">
          {children}
        </main>
      </div>

      <AppMoreSheet
        area={area}
        primaryItems={railPrimaryItems}
        secondaryItems={secondaryItems}
        footerActions={footerActions}
        open={moreOpen}
        contentId={moreSheetId}
        onOpenChange={setMoreOpen}
      />
    </div>
  );
}
