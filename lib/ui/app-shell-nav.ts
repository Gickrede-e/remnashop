export type AppShellArea = "dashboard" | "admin";

export type AppNavItem = {
  href: string;
  label: string;
  slot: "primary" | "other";
  /** Якорь для обучения по кабинету: рендерится как data-tour на ссылке. */
  tourId?: string;
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

const dashboardPrimaryNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Подписка", slot: "primary" },
  { href: "/dashboard/buy", label: "Купить", slot: "primary", tourId: "buy" },
  { href: "/dashboard/devices", label: "Устройства", slot: "primary" },
  { href: "/dashboard/history", label: "История", slot: "primary" },
  { href: "/dashboard/referrals", label: "Рефералы", slot: "primary" },
  { href: "/dashboard/help", label: "Помощь", slot: "primary" }
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

export function getPrimaryNavItems(area: AppShellArea): AppNavItem[] {
  return area === "dashboard" ? dashboardPrimaryNavItems : adminPrimaryNavItems;
}

export function getOtherNavItems(area: AppShellArea, options: OtherNavOptions = {}): AppNavItem[] {
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

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
