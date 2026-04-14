export type AppShellArea = "dashboard" | "admin";
export type AppShellNavArea = AppShellArea | "public";

export type AppNavItem = {
  href: string;
  label: string;
  slot: "primary" | "other";
};

export type AppFooterAction = {
  label: string;
  kind: "link" | "summary" | "command";
  intent: "guest" | "system";
  href?: string;
  command?: "logout";
};

type OtherNavOptions = {
  canAccessAdmin?: boolean;
};

type PrimaryCtaOptions = {
  authenticated: boolean;
};

const publicPrimaryNavItems: AppNavItem[] = [
  { href: "/", label: "Главная", slot: "primary" },
  { href: "/pricing", label: "Тарифы", slot: "primary" },
  { href: "/faq", label: "FAQ", slot: "primary" },
  { href: "/terms", label: "Условия", slot: "primary" }
];

const dashboardPrimaryNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Обзор", slot: "primary" },
  { href: "/dashboard/buy", label: "Купить", slot: "primary" },
  { href: "/dashboard/devices", label: "Устройства", slot: "primary" },
  { href: "/dashboard/history", label: "История", slot: "primary" },
  { href: "/dashboard/referrals", label: "Рефералы", slot: "primary" }
];

const adminPrimaryNavItems: AppNavItem[] = [
  { href: "/admin", label: "Обзор", slot: "primary" },
  { href: "/admin/users", label: "Пользователи", slot: "primary" },
  { href: "/admin/payments", label: "Платежи", slot: "primary" },
  { href: "/admin/plans", label: "Тарифы", slot: "primary" },
  { href: "/admin/promos", label: "Промокоды", slot: "primary" }
];

const adminOtherNavItems: AppNavItem[] = [
  { href: "/admin/referrals", label: "Рефералы", slot: "other" },
  { href: "/admin/logs", label: "Логи", slot: "other" },
  { href: "/admin/export", label: "Экспорт", slot: "other" },
  { href: "/dashboard", label: "Личный кабинет", slot: "other" }
];

export function getPrimaryNavItems(area: AppShellNavArea): AppNavItem[] {
  if (area === "public") {
    return publicPrimaryNavItems;
  }

  return area === "dashboard" ? dashboardPrimaryNavItems : adminPrimaryNavItems;
}

export function getOtherNavItems(area: AppShellNavArea, options: OtherNavOptions = {}): AppNavItem[] {
  if (area === "public") {
    return [];
  }

  if (area === "dashboard") {
    return options.canAccessAdmin
      ? [
          { href: "/dashboard/profile", label: "Профиль", slot: "other" },
          { href: "/admin", label: "Админка", slot: "other" }
        ]
      : [{ href: "/dashboard/profile", label: "Профиль", slot: "other" }];
  }

  return adminOtherNavItems;
}

export function getPrimaryCta(area: AppShellNavArea, options: PrimaryCtaOptions) {
  if (!options.authenticated || area === "public") {
    return { label: "ВОЙТИ", href: "/login" };
  }

  if (area === "admin") {
    return { label: "В КАБИНЕТ", href: "/dashboard" };
  }

  return { label: "КУПИТЬ ПОДПИСКУ", href: "/dashboard/buy" };
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
