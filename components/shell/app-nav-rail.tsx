"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { AppShellFooterActions } from "@/components/shell/app-shell-footer-actions";
import { Logo } from "@/components/shared/logo";
import type { AppFooterAction, AppShellNavArea } from "@/lib/ui/app-shell-nav";
import { cn } from "@/lib/utils";

type AppNavRailItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type AppNavRailProps = {
  area: AppShellNavArea;
  primaryItems: AppNavRailItem[];
  secondaryItems: AppNavRailItem[];
  footerActions: AppFooterAction[];
};

const areaCopy = {
  public: {
    title: "Документы доступа",
    description: "Короткий гостевой контур с тарифами, FAQ и условиями до входа в кабинет.",
    homeHref: "/"
  },
  dashboard: {
    title: "Пульт оператора",
    description: "Доступ, покупки, устройства и реферальные сценарии.",
    homeHref: "/dashboard"
  },
  admin: {
    title: "Контур управления",
    description: "Метрики, пользователи, биллинг и надзорные действия.",
    homeHref: "/admin"
  }
} satisfies Record<AppShellNavArea, { title: string; description: string; homeHref: string }>;

export function AppNavRail({ area, primaryItems, secondaryItems, footerActions }: AppNavRailProps) {
  const copy = areaCopy[area];

  return (
    <aside className="appNavRail" data-testid="app-nav-rail" aria-label="Навигация разделов">
      <div className="appNavRailSurface surface-soft">
        <div className="appNavRailIntro">
          <Logo href={copy.homeHref} variant="rail" />
          <div className="appNavRailHeading">
            <p className="appNavRailEyebrow">Контур</p>
            <p className="appNavRailTitle">{copy.title}</p>
            <p className="appNavRailDescription">{copy.description}</p>
          </div>
        </div>

        <nav aria-label="Основная навигация">
          <div className="appNavRailSection">
            <p className="appNavRailSectionLabel">Основное</p>
            <div className="appNavRailNav">
              {primaryItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={cn("appNavRailLink", item.active && "is-active")}
                >
                  <span className="appNavRailLinkIcon">
                    <item.icon className="iconSm" />
                  </span>
                  <span className="appNavRailLinkText">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {secondaryItems.length > 0 ? (
            <div className="appNavRailSection">
              <p className="appNavRailSectionLabel">Дополнительно</p>
              <div className="appNavRailNav">
                {secondaryItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={cn("appNavRailLink appNavRailLinkSecondary", item.active && "is-active")}
                  >
                    <span className="appNavRailLinkIcon">
                      <item.icon className="iconSm" />
                    </span>
                    <span className="appNavRailLinkText">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </nav>

        <AppShellFooterActions actions={footerActions} />
      </div>
    </aside>
  );
}
