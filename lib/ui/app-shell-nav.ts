export type AppShellArea = "dashboard" | "admin";
export type AppShellNavArea = AppShellArea | "public";

export type AppNavItem = {
  href: string;
  label: string;
  slot: "primary" | "secondary";
};

export type AppFooterAction = {
  label: string;
  kind: "link" | "summary" | "command";
  intent: "guest" | "system";
  href?: string;
  command?: "logout";
};

type SecondaryNavOptions = {
  canAccessAdmin?: boolean;
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
  { href: "#more", label: "Ещё", slot: "primary" }
];

const dashboardSecondaryNavItems: AppNavItem[] = [
  { href: "/dashboard/history", label: "История", slot: "secondary" },
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

const guestFooterActions: AppFooterAction[] = [
  { href: "/login", label: "Войти", kind: "link", intent: "guest" },
  { href: "/register", label: "Регистрация", kind: "link", intent: "guest" }
];

const profileFooterAction: AppFooterAction = { label: "Профиль", kind: "summary", intent: "system" };
const dashboardSwitchFooterAction: AppFooterAction = {
  href: "/admin",
  label: "Админка",
  kind: "link",
  intent: "system"
};
const adminSwitchFooterAction: AppFooterAction = {
  href: "/dashboard",
  label: "Кабинет",
  kind: "link",
  intent: "system"
};
const logoutFooterAction: AppFooterAction = {
  label: "Выйти",
  kind: "command",
  command: "logout",
  intent: "system"
};

export function getPrimaryNavItems(area: AppShellNavArea): AppNavItem[] {
  if (area === "public") {
    return publicPrimaryNavItems;
  }

  return area === "dashboard" ? dashboardPrimaryNavItems : adminPrimaryNavItems;
}

export function getSecondaryNavItems(area: AppShellNavArea, options: SecondaryNavOptions = {}): AppNavItem[] {
  if (area === "public") {
    return [];
  }

  if (area === "dashboard") {
    return options.canAccessAdmin
      ? [...dashboardSecondaryNavItems, { href: "/admin", label: "Админка", slot: "secondary" }]
      : dashboardSecondaryNavItems;
  }

  return adminSecondaryNavItems;
}

export function getFooterActions(
  area: AppShellNavArea,
  options: { authenticated: boolean; canAccessAdmin?: boolean }
): AppFooterAction[] {
  if (!options.authenticated) {
    return guestFooterActions;
  }

  const actions: AppFooterAction[] = [profileFooterAction];

  if (area === "dashboard" && options.canAccessAdmin) {
    actions.push(dashboardSwitchFooterAction);
  } else if (area === "admin") {
    actions.push(adminSwitchFooterAction);
  }

  actions.push(logoutFooterAction);

  return actions;
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
