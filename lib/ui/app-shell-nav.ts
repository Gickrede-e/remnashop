export type AppShellArea = "dashboard" | "admin";

export type AppNavItem = {
  href: string;
  label: string;
  slot: "primary" | "secondary";
};

const dashboardPrimaryNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Overview", slot: "primary" },
  { href: "/dashboard/buy", label: "Buy", slot: "primary" },
  { href: "/dashboard/history", label: "History", slot: "primary" },
  { href: "#more", label: "More", slot: "primary" }
];

const dashboardSecondaryNavItems: AppNavItem[] = [
  { href: "/dashboard/referrals", label: "Referrals", slot: "secondary" }
];

const adminPrimaryNavItems: AppNavItem[] = [
  { href: "/admin", label: "Overview", slot: "primary" },
  { href: "/admin/users", label: "Users", slot: "primary" },
  { href: "/admin/payments", label: "Payments", slot: "primary" },
  { href: "#more", label: "More", slot: "primary" }
];

const adminSecondaryNavItems: AppNavItem[] = [
  { href: "/admin/plans", label: "Plans", slot: "secondary" },
  { href: "/admin/promos", label: "Promos", slot: "secondary" },
  { href: "/admin/referrals", label: "Referrals", slot: "secondary" },
  { href: "/admin/logs", label: "Logs", slot: "secondary" },
  { href: "/admin/export", label: "Export", slot: "secondary" },
  { href: "/dashboard", label: "Dashboard", slot: "secondary" }
];

export function getPrimaryNavItems(area: AppShellArea): AppNavItem[] {
  return area === "dashboard" ? dashboardPrimaryNavItems : adminPrimaryNavItems;
}

export function getSecondaryNavItems(area: AppShellArea): AppNavItem[] {
  return area === "dashboard" ? dashboardSecondaryNavItems : adminSecondaryNavItems;
}

export function isNavItemActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
