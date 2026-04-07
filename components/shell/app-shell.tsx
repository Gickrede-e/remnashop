"use client";

import Link from "next/link";
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
import { cn } from "@/lib/utils";

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

type DecoratedNavItem = ReturnType<typeof decorateItems>[number];

function AppShellNavRail({
  area,
  primaryItems,
  secondaryItems
}: {
  area: AppShellArea;
  primaryItems: DecoratedNavItem[];
  secondaryItems: DecoratedNavItem[];
}) {
  const areaTitle = area === "admin" ? "Контур управления" : "Пульт оператора";
  const areaDescription =
    area === "admin"
      ? "Метрики, пользователи, биллинг и надзорные действия."
      : "Доступ, покупки, устройства и реферальные сценарии.";

  return (
    <aside className="appNavRail" data-testid="app-nav-rail" aria-label="Навигация разделов">
      <div className="appNavRailSurface surface-soft">
        <div className="appNavRailIntro">
          <p className="appNavRailEyebrow">Контур</p>
          <div className="appNavRailHeading">
            <p className="appNavRailTitle">{areaTitle}</p>
            <p className="appNavRailDescription">{areaDescription}</p>
          </div>
        </div>

        <div className="appNavRailSection">
          <p className="appNavRailSectionLabel">Основное</p>
          <nav className="appNavRailNav" aria-label="Основные разделы">
            {primaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn("appNavRailLink", item.active && "is-active")}
              >
                <span className="appNavRailLinkIcon">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="appNavRailLinkText">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="appNavRailSection">
          <p className="appNavRailSectionLabel">Дополнительно</p>
          <nav className="appNavRailNav" aria-label="Дополнительные разделы">
            {secondaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn("appNavRailLink appNavRailLinkSecondary", item.active && "is-active")}
              >
                <span className="appNavRailLinkIcon">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="appNavRailLinkText">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ area, canAccessAdmin = false, children }: AppShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreSheetId = `${area}-more-sheet`;

  const secondaryItems = decorateItems(area, getSecondaryNavItems(area, { canAccessAdmin }), pathname, false);

  const isMoreActive = secondaryItems.some((item) => item.active);

  const primaryItems = decorateItems(area, getPrimaryNavItems(area), pathname, isMoreActive);

  const topbarPrimaryItems = primaryItems.filter((item) => item.href !== "#more");
  const activeRouteLabel =
    [...topbarPrimaryItems, ...secondaryItems].find((item) => item.active)?.label ?? topbarPrimaryItems[0]?.label ?? "Обзор";
  const homeHref = area === "admin" ? "/admin" : "/dashboard";

  const areaSwitchHref = area === "admin" ? "/dashboard" : canAccessAdmin ? "/admin" : undefined;
  const areaSwitchLabel = area === "admin" ? "Кабинет" : canAccessAdmin ? "Админка" : undefined;

  return (
    <div className="app-shell appShell">
      <AppTopbar
        homeHref={homeHref}
        primaryItems={topbarPrimaryItems}
        activeRouteLabel={activeRouteLabel}
        isMoreActive={isMoreActive}
        moreOpen={moreOpen}
        moreSheetId={moreSheetId}
        onOpenMore={() => setMoreOpen(true)}
        areaSwitchHref={areaSwitchHref}
        areaSwitchLabel={areaSwitchLabel}
      />

      <div className="container appShellViewport">
        <AppShellNavRail area={area} primaryItems={topbarPrimaryItems} secondaryItems={secondaryItems} />

        <div className="appShellWorkspace">
          <div className="appShellMainWrap">
            <div data-testid="app-shell-main" className="appShellMain">
              {children}
            </div>
          </div>
        </div>
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
