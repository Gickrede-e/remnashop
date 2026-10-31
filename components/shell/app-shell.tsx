"use client";

import { usePathname } from "next/navigation";

import { DashboardMobileNav } from "@/components/shell/dashboard-mobile-nav";
import { DashboardSidebar } from "@/components/shell/dashboard-sidebar";
import {
  getOtherNavItems,
  getPrimaryNavItems,
  isNavItemActive,
  type AppNavItem,
  type AppShellArea
} from "@/lib/ui/app-shell-nav";
import { resolveNavIcon } from "@/lib/ui/nav-icons";

type AppShellProps = {
  area: AppShellArea;
  canAccessAdmin?: boolean;
  accountSummary?: { email: string } | null;
  children: React.ReactNode;
};

function decorate(area: AppShellArea, items: AppNavItem[], pathname: string) {
  return items.map((item) => ({
    ...item,
    icon: resolveNavIcon(area, item.href),
    active: isNavItemActive(pathname, item.href)
  }));
}

export function AppShell({ area, canAccessAdmin = false, accountSummary = null, children }: AppShellProps) {
  const pathname = usePathname();
  const primaryItems = decorate(area, getPrimaryNavItems(area), pathname);
  const otherItems = decorate(area, getOtherNavItems(area, { canAccessAdmin }), pathname);

  return (
    <div className="dashShell" data-area={area}>
      <a href="#dash-shell-main" className="dashSkipLink">
        Перейти к содержимому
      </a>
      <DashboardSidebar
        area={area}
        primaryItems={primaryItems}
        otherItems={otherItems}
        accountSummary={accountSummary}
      />
      <main id="dash-shell-main" data-testid="app-shell-main" className="dashShellMain" tabIndex={-1}>
        {children}
      </main>
      <DashboardMobileNav
        primaryItems={primaryItems}
        otherItems={otherItems}
        accountSummary={accountSummary}
      />
    </div>
  );
}
