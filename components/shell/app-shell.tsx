"use client";

import { usePathname } from "next/navigation";

import { DashboardSidebar } from "@/components/shell/dashboard-sidebar";
import {
  getOtherNavItems,
  getPrimaryCta,
  getPrimaryNavItems,
  isNavItemActive,
  type AppNavItem,
  type AppShellNavArea
} from "@/lib/ui/app-shell-nav";
import { resolveNavIcon } from "@/lib/ui/nav-icons";

type AppShellProps = {
  area: AppShellNavArea;
  canAccessAdmin?: boolean;
  accountSummary?: { email: string } | null;
  children: React.ReactNode;
};

function decorate(area: AppShellNavArea, items: AppNavItem[], pathname: string) {
  return items.map((item) => ({
    ...item,
    icon: resolveNavIcon(area, item.href),
    active: isNavItemActive(pathname, item.href)
  }));
}

export function AppShell({ area, canAccessAdmin = false, accountSummary = null, children }: AppShellProps) {
  const pathname = usePathname();
  const authenticated = Boolean(accountSummary);
  const primaryItems = decorate(area, getPrimaryNavItems(area), pathname);
  const otherItems = decorate(area, getOtherNavItems(area, { canAccessAdmin }), pathname);
  const primaryCta = getPrimaryCta(area, { authenticated });

  return (
    <div className="dashShell" data-area={area}>
      <a href="#dash-shell-main" className="dashSkipLink">
        Перейти к содержимому
      </a>
      <DashboardSidebar
        area={area}
        primaryItems={primaryItems}
        otherItems={otherItems}
        primaryCta={primaryCta}
        accountSummary={accountSummary}
      />
      <main id="dash-shell-main" data-testid="app-shell-main" className="dashShellMain" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
