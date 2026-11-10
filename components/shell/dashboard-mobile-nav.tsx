"use client";

import Link from "next/link";
import { MoreHorizontal, Power, type LucideIcon } from "lucide-react";

import type { DashboardSidebarItem } from "@/components/shell/dashboard-sidebar";
import { cn } from "@/lib/utils";

// Words too long for a ~56px phone nav button get a soft hyphen at a proper syllable break: browsers
// don't reliably hyphenate Russian on their own, and a break anywhere reads as "Устройств / а".
const MOBILE_LABEL_BREAKS: Record<string, string> = {
  Пользователи: "Пользо\u00ADватели",
  Устройства: "Устрой\u00ADства"
};

type DashboardMobileNavProps = {
  primaryItems: DashboardSidebarItem[];
  otherItems: DashboardSidebarItem[];
  accountSummary: { email: string } | null;
};

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active,
  tourId
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  tourId?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-tour={tourId}
      className={cn("dashMobileNavLink", active && "is-active")}
    >
      <Icon className="dashMobileNavIcon" aria-hidden="true" />
      <span className="dashMobileNavLabel">{MOBILE_LABEL_BREAKS[label] ?? label}</span>
    </Link>
  );
}

export function DashboardMobileNav({ primaryItems, otherItems, accountSummary }: DashboardMobileNavProps) {
  if (!accountSummary) {
    return null;
  }

  const visibleItems = primaryItems.slice(0, 4);
  const overflowItems = [...primaryItems.slice(4), ...otherItems].filter((item) => !item.href.startsWith("#"));
  const hasActiveOverflow = overflowItems.some((item) => item.active);

  return (
    <div className="dashMobileNav" data-testid="app-mobile-nav">
      <nav className="dashMobileNavBar" aria-label="Мобильная навигация кабинета">
        {visibleItems.map((item) => (
          <MobileNavItem key={item.href} {...item} />
        ))}
        <details className="dashMobileNavMore">
          <summary className={cn("dashMobileNavMoreSummary", hasActiveOverflow && "is-active")}>
            <MoreHorizontal className="dashMobileNavIcon" aria-hidden="true" />
            <span className="dashMobileNavLabel">Ещё</span>
          </summary>
          <div className="dashMobileNavMorePanel">
            <div className="dashMobileNavMoreList">
              {overflowItems.map((item) => (
                <MobileNavItem key={item.href} {...item} />
              ))}
            </div>
            <form action="/api/auth/logout" method="post" className="dashMobileNavLogoutForm">
              <button type="submit" className="dashMobileNavLogoutButton">
                <Power className="dashMobileNavIcon" aria-hidden="true" />
                <span className="dashMobileNavLabel">Выйти</span>
              </button>
            </form>
          </div>
        </details>
      </nav>
    </div>
  );
}
