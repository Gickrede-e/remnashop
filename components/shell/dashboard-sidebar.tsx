import Link from "next/link";
import { Power, type LucideIcon } from "lucide-react";

import { DashboardSidebarOtherGroup } from "@/components/shell/dashboard-sidebar-other-group";
import { publicEnv } from "@/lib/public-env";
import type { AppShellNavArea } from "@/lib/ui/app-shell-nav";
import { cn } from "@/lib/utils";

const areaTagline: Record<AppShellNavArea, string> = {
  dashboard: "VPN КАБИНЕТ",
  admin: "ПАНЕЛЬ АДМИНА",
  public: "ГОСТЕВОЙ КОНТУР"
};

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type DashboardSidebarProps = {
  area: AppShellNavArea;
  primaryItems: SidebarItem[];
  otherItems: SidebarItem[];
  primaryCta: { label: string; href: string };
  accountSummary: { email: string } | null;
};

export function DashboardSidebar({
  area,
  primaryItems,
  otherItems,
  primaryCta,
  accountSummary
}: DashboardSidebarProps) {
  return (
    <aside className="dashSidebar" data-testid="app-nav-rail" aria-label="Навигация кабинета">
      <div className="dashSidebarBrand">
        <p className="dashSidebarBrandWordmark">
          {publicEnv.NEXT_PUBLIC_SITE_NAME?.toUpperCase() ?? "GICKSHOP"}
        </p>
        <p className="dashSidebarBrandTagline">{areaTagline[area]}</p>
      </div>

      <nav className="dashSidebarNav" aria-label="Основная навигация">
        {primaryItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn("dashSidebarLink", item.active && "is-active")}
          >
            <item.icon className="dashSidebarLinkIcon" aria-hidden="true" />
            <span className="dashSidebarLinkLabel">{item.label}</span>
          </Link>
        ))}
      </nav>

      {otherItems.length > 0 ? (
        <DashboardSidebarOtherGroup>
          {otherItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn("dashSidebarLink dashSidebarLinkOther", item.active && "is-active")}
            >
              <item.icon className="dashSidebarLinkIcon" aria-hidden="true" />
              <span className="dashSidebarLinkLabel">{item.label}</span>
            </Link>
          ))}
        </DashboardSidebarOtherGroup>
      ) : null}

      <div className="dashSidebarFooter">
        <Link href={primaryCta.href} className="dashSidebarCta">
          {primaryCta.label}
        </Link>
        {accountSummary ? (
          <form action="/api/auth/logout" method="post" className="dashSidebarLogoutRow">
            <button type="submit" className="dashSidebarLogoutBtn">
              <Power className="dashSidebarLogoutIcon" aria-hidden="true" />
              <span>LOG OUT</span>
            </button>
            <p className="dashSidebarLogoutEmail">{accountSummary.email}</p>
          </form>
        ) : null}
      </div>
    </aside>
  );
}
