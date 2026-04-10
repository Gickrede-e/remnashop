"use client";

import Link from "next/link";
import { Menu, type LucideIcon } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

type AppTopbarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type AppTopbarProps = {
  area: "dashboard" | "admin";
  primaryItems: AppTopbarItem[];
  activeRouteLabel?: string;
  isMoreActive: boolean;
  moreOpen: boolean;
  moreSheetId?: string;
  onOpenMore: () => void;
};

export function AppTopbar({
  area,
  primaryItems,
  activeRouteLabel,
  isMoreActive,
  moreOpen,
  moreSheetId,
  onOpenMore
}: AppTopbarProps) {
  const homeHref = area === "admin" ? "/admin" : "/dashboard";
  const consoleLabel = homeHref === "/admin" ? "Режим контроля" : "Режим оператора";

  return (
    <header className="appTopbar" data-testid="app-topbar">
      <div className="container appTopbarInner">
        <div className="appTopbarIdentity">
          <div className="appTopbarBrandLockup">
            <Logo compact href={homeHref} />
          </div>
          <span className="appTopbarConsoleBadge">{consoleLabel}</span>
        </div>

        <nav className="appTopbarQuickNav" aria-label="Основная навигация">
          {primaryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn("appTopbarNavLink", item.active && "is-active")}
            >
              <item.icon className="iconSm" />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            className={cn("button buttonGhost appTopbarNavLink appTopbarMoreButton moreTrigger", isMoreActive && "is-active")}
            onClick={onOpenMore}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls={moreSheetId}
          >
            <Menu className="iconSm" />
            <span>Ещё</span>
          </button>
        </nav>

        <div className="appTopbarActions">
          <div className="appTopbarActionSummary">
            <span className="appTopbarActionSummaryLabel">Маршрут</span>
            <span className="appTopbarActionSummaryValue">
              {activeRouteLabel ?? primaryItems.find((item) => item.active)?.label ?? "Обзор"}
            </span>
          </div>
          <button
            type="button"
            className="button buttonSecondary buttonSizeIcon appTopbarMenuButton moreTrigger"
            onClick={onOpenMore}
            aria-label="Открыть меню разделов"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls={moreSheetId}
          >
            <Menu className="iconMd" />
          </button>
        </div>
      </div>
    </header>
  );
}
