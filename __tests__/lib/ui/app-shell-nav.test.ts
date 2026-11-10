import { describe, expect, it } from "vitest";

import * as navModule from "@/lib/ui/app-shell-nav";
import type { AppNavItem, AppShellArea } from "@/lib/ui/app-shell-nav";

type FutureNavModule = typeof navModule & {
  getOtherNavItems: (area: AppShellArea, options?: { canAccessAdmin?: boolean }) => AppNavItem[];
};

const futureNavModule = navModule as FutureNavModule;

describe("app shell nav", () => {
  it("describes dashboard primary nav items", () => {
    expect(navModule.getPrimaryNavItems("dashboard")).toEqual([
      { href: "/dashboard", label: "Подписка", slot: "primary" },
      { href: "/dashboard/buy", label: "Купить", slot: "primary", tourId: "buy" },
      { href: "/dashboard/devices", label: "Устройства", slot: "primary" },
      { href: "/dashboard/history", label: "История", slot: "primary" },
      { href: "/dashboard/referrals", label: "Рефералы", slot: "primary" },
      { href: "/dashboard/help", label: "Помощь", slot: "primary" }
    ]);
  });

  it("describes admin primary nav items", () => {
    expect(navModule.getPrimaryNavItems("admin")).toEqual([
      { href: "/admin", label: "Обзор", slot: "primary" },
      { href: "/admin/users", label: "Пользователи", slot: "primary" },
      { href: "/admin/payments", label: "Платежи", slot: "primary" },
      { href: "/admin/plans", label: "Тарифы", slot: "primary" },
      { href: "/admin/promos", label: "Промокоды", slot: "primary" }
    ]);
  });

  it("keeps dashboard other nav items aligned with admin access", () => {
    expect(navModule).toHaveProperty("getOtherNavItems");

    expect(futureNavModule.getOtherNavItems("dashboard", { canAccessAdmin: true })).toEqual([
      { href: "/dashboard/profile", label: "Профиль", slot: "other" },
      { href: "/admin", label: "Админка", slot: "other" }
    ]);
    expect(futureNavModule.getOtherNavItems("dashboard", { canAccessAdmin: false })).toEqual([
      { href: "/dashboard/profile", label: "Профиль", slot: "other" }
    ]);
  });

  it("describes admin other nav items", () => {
    expect(navModule).toHaveProperty("getOtherNavItems");

    expect(futureNavModule.getOtherNavItems("admin")).toEqual([
      { href: "/admin/referrals", label: "Рефералы", slot: "other" },
      { href: "/admin/broadcasts", label: "Рассылка", slot: "other" },
      { href: "/admin/logs", label: "Логи", slot: "other" },
      { href: "/admin/export", label: "Экспорт", slot: "other" },
      { href: "/dashboard", label: "Личный кабинет", slot: "other" }
    ]);
  });

  it("does not expose footer actions anymore", () => {
    expect(navModule).not.toHaveProperty("getFooterActions");
  });
});
