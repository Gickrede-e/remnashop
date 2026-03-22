export type AppShellArea = "dashboard" | "admin";

export type AppNavItem = {
  href: string;
  label: string;
  slot: "primary" | "secondary";
};

type SecondaryNavOptions = {
  canAccessAdmin?: boolean;
};

const dashboardPrimaryNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Обзор", slot: "primary" },
  { href: "/dashboard/buy", label: "Купить", slot: "primary" },
  { href: "/dashboard/history", label: "История", slot: "primary" },
  { href: "#more", label: "Ещё", slot: "primary" }
];

const dashboardSecondaryNavItems: AppNavItem[] = [
  { href: "/dashboard/referrals", label: "Рефералы", slot: "secondary" }
];

const adminPrimaryNavItems: AppNavItem[] = [
  { href: "/admin", label: "Обзор", slot: "primary" },
  { href: "/admin/users", label: "Пользователи", slot: "primary" },
  { href: "/admin/payments", label: "Платежи", slot: "primary" },
  { href: "#more", label: "Ещё", slot: "primary" }
];

const adminSecondaryNavItems: AppNavItem[] = [
  { href: "/admin/plans", label: "Тарифы", slot: "secondary" },
  { href: "/admin/promos", label: "Промокоды", slot: "secondary" },
  { href: "/admin/referrals", label: "Рефералы", slot: "secondary" },
  { href: "/admin/logs", label: "Логи", slot: "secondary" },
  { href: "/admin/export", label: "Экспорт", slot: "secondary" },
  { href: "/dashboard", label: "Личный кабинет", slot: "secondary" }
];

export function getPrimaryNavItems(area: AppShellArea): AppNavItem[] {
  return area === "dashboard" ? dashboardPrimaryNavItems : adminPrimaryNavItems;
}

export function getSecondaryNavItems(area: AppShellArea, options: SecondaryNavOptions = {}): AppNavItem[] {
  if (area === "dashboard") {
    return options.canAccessAdmin
      ? [...dashboardSecondaryNavItems, { href: "/admin", label: "Админка", slot: "secondary" }]
      : dashboardSecondaryNavItems;
  }

  return adminSecondaryNavItems;
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
