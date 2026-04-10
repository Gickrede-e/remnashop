import { describe, expect, it } from "vitest";

import * as navModule from "@/lib/ui/app-shell-nav";
import type { AppNavItem, AppShellNavArea } from "@/lib/ui/app-shell-nav";

type PrimaryCta = {
  label: string;
  href: string;
};

type FutureNavModule = typeof navModule & {
  getOtherNavItems: (area: AppShellNavArea, options?: { canAccessAdmin?: boolean }) => AppNavItem[];
  getPrimaryCta: (area: AppShellNavArea, options: { authenticated: boolean }) => PrimaryCta;
};

const futureNavModule = navModule as FutureNavModule;

describe("app shell nav", () => {
  it("describes dashboard primary nav items", () => {
    expect(navModule.getPrimaryNavItems("dashboard")).toEqual([
      { href: "/dashboard", label: "Обзор", slot: "primary" },
      { href: "/dashboard/buy", label: "Купить", slot: "primary" },
      { href: "/dashboard/devices", label: "Устройства", slot: "primary" },
      { href: "/dashboard/history", label: "История", slot: "primary" },
      { href: "/dashboard/referrals", label: "Рефералы", slot: "primary" }
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

  it("describes public primary nav items", () => {
    expect(navModule.getPrimaryNavItems("public")).toEqual([
      { href: "/", label: "Главная", slot: "primary" },
      { href: "/pricing", label: "Тарифы", slot: "primary" },
      { href: "/faq", label: "FAQ", slot: "primary" },
      { href: "/terms", label: "Условия", slot: "primary" }
    ]);
  });

  it("keeps dashboard other nav items aligned with admin access", () => {
    expect(navModule).toHaveProperty("getOtherNavItems");

    expect(futureNavModule.getOtherNavItems("dashboard", { canAccessAdmin: true })).toEqual([
      { href: "#profile", label: "Профиль", slot: "other" },
      { href: "/admin", label: "Админка", slot: "other" }
    ]);
    expect(futureNavModule.getOtherNavItems("dashboard", { canAccessAdmin: false })).toEqual([
      { href: "#profile", label: "Профиль", slot: "other" }
    ]);
  });

  it("describes admin other nav items", () => {
    expect(navModule).toHaveProperty("getOtherNavItems");

    expect(futureNavModule.getOtherNavItems("admin")).toEqual([
      { href: "/admin/referrals", label: "Рефералы", slot: "other" },
      { href: "/admin/logs", label: "Логи", slot: "other" },
      { href: "/admin/export", label: "Экспорт", slot: "other" },
      { href: "/dashboard", label: "Личный кабинет", slot: "other" }
    ]);
  });

  it("describes public other nav items", () => {
    expect(navModule).toHaveProperty("getOtherNavItems");

    expect(futureNavModule.getOtherNavItems("public")).toEqual([]);
  });

  it("describes primary CTA by shell and authentication", () => {
    expect(navModule).toHaveProperty("getPrimaryCta");

    expect(futureNavModule.getPrimaryCta("dashboard", { authenticated: true })).toEqual({
      label: "КУПИТЬ ПОДПИСКУ",
      href: "/dashboard/buy"
    });
    expect(futureNavModule.getPrimaryCta("admin", { authenticated: true })).toEqual({
      label: "В КАБИНЕТ",
      href: "/dashboard"
    });
    expect(futureNavModule.getPrimaryCta("public", { authenticated: false })).toEqual({
      label: "ВОЙТИ",
      href: "/login"
    });
  });

  it("does not expose footer actions anymore", () => {
    expect(navModule).not.toHaveProperty("getFooterActions");
  });
});
