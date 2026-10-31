import Link from "next/link";
import { Power, type LucideIcon } from "lucide-react";

import { DashboardSidebarOtherGroup } from "@/components/shell/dashboard-sidebar-other-group";
import { AsciiCat } from "@/components/effects/ascii-cat";
import { CubeField } from "@/components/effects/cube-field";
import { Logo } from "@/components/shared/logo";
import type { AppShellArea } from "@/lib/ui/app-shell-nav";
import { cn } from "@/lib/utils";

const areaTagline: Record<AppShellArea, string> = {
  dashboard: "ЛИЧНЫЙ КАБИНЕТ",
  admin: "ПАНЕЛЬ АДМИНА"
};

export type DashboardSidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  tourId?: string;
};

type DashboardSidebarProps = {
  area: AppShellArea;
  primaryItems: DashboardSidebarItem[];
  otherItems: DashboardSidebarItem[];
  accountSummary: { email: string } | null;
};

export function DashboardSidebar({ area, primaryItems, otherItems, accountSummary }: DashboardSidebarProps) {
  return (
    <aside className="dashSidebar" data-area={area} data-testid="app-nav-rail" aria-label="Навигация кабинета">
      {/* position задаём инлайном: <cube-field> при подключении сам ставит
          inline position:relative, если позиция не пришла инлайном, — и
          перебивает класс (канвас тогда встаёт в поток и сталкивает бренд). */}
      <CubeField
        className="dashSidebarCubes"
        count={6}
        scale={0.34}
        dust={12}
        style={{ position: "absolute", inset: 0 }}
      />
      <div className="dashSidebarBrand" data-logo="true">
        <Logo href="/" variant="rail" />
        <p className="dashSidebarBrandTagline">{areaTagline[area]}</p>
        <AsciiCat placement="sidebar" />
      </div>

      <nav className="dashSidebarNav" aria-label="Основная навигация">
        {primaryItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            data-tour={item.tourId}
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
        {accountSummary ? (
          <form action="/api/auth/logout" method="post" className="dashSidebarLogoutRow">
            <button type="submit" className="dashSidebarLogoutBtn">
              <Power className="dashSidebarLogoutIcon" aria-hidden="true" />
              <span>Выйти</span>
            </button>
            <p className="dashSidebarLogoutEmail">{accountSummary.email}</p>
          </form>
        ) : null}
      </div>
    </aside>
  );
}
