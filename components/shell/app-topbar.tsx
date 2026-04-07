"use client";

import Link from "next/link";
import { Menu, type LucideIcon } from "lucide-react";

import { LogoutButton } from "@/components/shared/logout-button";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

type AppTopbarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type AppTopbarProps = {
  homeHref: string;
  primaryItems: AppTopbarItem[];
  isMoreActive: boolean;
  moreOpen: boolean;
  moreSheetId?: string;
  onOpenMore: () => void;
  areaSwitchHref?: string;
  areaSwitchLabel?: string;
};

export function AppTopbar({
  homeHref,
  primaryItems,
  isMoreActive,
  moreOpen,
  moreSheetId,
  onOpenMore,
  areaSwitchHref,
  areaSwitchLabel
}: AppTopbarProps) {
  const consoleLabel = homeHref === "/admin" ? "Режим контроля" : "Режим оператора";

  return (
    <header className="appTopbar" data-testid="app-topbar">
      <div className="container appTopbarInner">
        <div className="appTopbarIdentity">
          <div className="appTopbarBrandLockup">
            <Logo compact href={homeHref} />
            {areaSwitchHref && areaSwitchLabel && (
              <Link href={areaSwitchHref} className="appTopbarAreaSwitch">
                {areaSwitchLabel}
              </Link>
            )}
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
              <item.icon className="h-4 w-4" />
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
            <Menu className="h-4 w-4" />
            <span>Ещё</span>
          </button>
        </nav>

        <div className="appTopbarActions">
          <div className="appTopbarActionSummary">
            <span className="appTopbarActionSummaryLabel">Маршрут</span>
            <span className="appTopbarActionSummaryValue">
              {primaryItems.find((item) => item.active)?.label ?? "Обзор"}
            </span>
          </div>
          <LogoutButton className="appTopbarLogout" />
          <button
            type="button"
            className="button buttonSecondary buttonSizeIcon appTopbarMenuButton moreTrigger"
            onClick={onOpenMore}
            aria-label="Открыть меню разделов"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls={moreSheetId}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
