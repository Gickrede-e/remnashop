import { describe, expect, it } from "vitest";

import * as navModule from "@/lib/ui/app-shell-nav";

describe("app shell nav", () => {
  it("describes dashboard primary nav items", () => {
    const items = navModule.getPrimaryNavItems("dashboard");

    expect(items.map((item) => item.label)).toEqual([
      "Обзор",
      "Купить",
      "Устройства",
      "История",
      "Рефералы"
    ]);
    expect(items.map((item) => item.href)).not.toContain("#more");
  });

  it("describes admin primary nav items", () => {
    expect(navModule.getPrimaryNavItems("admin").map((item) => item.label)).toEqual([
      "Обзор",
      "Пользователи",
      "Платежи",
      "Тарифы",
      "Промокоды"
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
    const withAdmin = (navModule as any).getOtherNavItems("dashboard", { canAccessAdmin: true });
    const withoutAdmin = (navModule as any).getOtherNavItems("dashboard", { canAccessAdmin: false });

    expect(withAdmin.find((item: { href: string }) => item.href === "/admin")).toMatchObject({
      href: "/admin",
      slot: "other"
    });
    expect(withoutAdmin.find((item: { href: string }) => item.href === "/admin")).toBeUndefined();
  });

  it("describes admin other nav items", () => {
    const items = (navModule as any).getOtherNavItems("admin");
    const hrefs = items.map((item: { href: string }) => item.href);

    expect(hrefs).toContain("/admin/referrals");
    expect(hrefs).toContain("/admin/logs");
    expect(hrefs).toContain("/admin/export");
    expect(hrefs).toContain("/dashboard");
    expect(items.find((item: { href: string }) => item.href === "/dashboard")).toMatchObject({
      href: "/dashboard",
      slot: "other"
    });
  });

  it("describes public other nav items", () => {
    expect((navModule as any).getOtherNavItems("public")).toEqual([]);
  });

  it("describes primary CTA by shell and authentication", () => {
    expect((navModule as any).getPrimaryCta("dashboard", { authenticated: true })).toEqual({
      label: "КУПИТЬ ПОДПИСКУ",
      href: "/dashboard/buy"
    });
    expect((navModule as any).getPrimaryCta("admin", { authenticated: true })).toEqual({
      label: "В КАБИНЕТ",
      href: "/dashboard"
    });
    expect((navModule as any).getPrimaryCta("public", { authenticated: false })).toEqual({
      label: "ВОЙТИ",
      href: "/login"
    });
  });

  it("does not expose footer actions anymore", () => {
    expect(navModule).not.toHaveProperty("getFooterActions");
  });
});
