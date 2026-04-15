import Link from "next/link";
import { MoreHorizontal, Power, type LucideIcon } from "lucide-react";

import type { DashboardSidebarItem } from "@/components/shell/dashboard-sidebar";
import type { AppShellNavArea } from "@/lib/ui/app-shell-nav";
import { cn } from "@/lib/utils";

type DashboardMobileNavProps = {
  area: AppShellNavArea;
  primaryItems: DashboardSidebarItem[];
  otherItems: DashboardSidebarItem[];
  accountSummary: { email: string } | null;
};

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("dashMobileNavLink", active && "is-active")}>
      <Icon className="dashMobileNavIcon" aria-hidden="true" />
      <span className="dashMobileNavLabel">{label}</span>
    </Link>
  );
}

export function DashboardMobileNav({ area, primaryItems, otherItems, accountSummary }: DashboardMobileNavProps) {
  if (area === "public" || !accountSummary) {
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
                <span className="dashMobileNavLabel">LOG OUT</span>
              </button>
            </form>
          </div>
        </details>
      </nav>
    </div>
  );
}
