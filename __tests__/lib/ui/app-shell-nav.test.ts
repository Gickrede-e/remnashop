import { describe, expect, it } from "vitest";

import {
  getFooterActions,
  getPrimaryNavItems,
  getSecondaryNavItems,
  isNavItemActive
} from "@/lib/ui/app-shell-nav";

describe("app shell nav", () => {
  it("defines the public, dashboard, and admin navigation contract", () => {
    expect(getPrimaryNavItems("public").map((item) => item.href)).toEqual([
      "/",
      "/pricing",
      "/faq",
      "/terms"
    ]);
    expect(getFooterActions("public", { authenticated: false }).map((item) => item.label)).toEqual([
      "Login",
      "Register"
    ]);
    expect(getFooterActions("public", { authenticated: false }).map((item) => item.kind)).toEqual([
      "link",
      "link"
    ]);
    expect(getFooterActions("dashboard", { authenticated: true, canAccessAdmin: true }).map((item) => item.label)).toEqual([
      "Profile",
      "Switch role",
      "Logout"
    ]);
    expect(getFooterActions("dashboard", { authenticated: true, canAccessAdmin: true }).map((item) => item.kind)).toEqual([
      "summary",
      "link",
      "command"
    ]);
    expect(getFooterActions("public", { authenticated: true }).map((item) => item.label)).toEqual([
      "Profile",
      "Logout"
    ]);
    expect(getFooterActions("public", { authenticated: false }).flatMap((item) => item.href ?? [])).toEqual([
      "/login",
      "/register"
    ]);
  });

  it("keeps footer role switching scoped to the current shell area and access level", () => {
    expect(getFooterActions("admin", { authenticated: true }).flatMap((item) => item.href ?? [])).toContain("/dashboard");
    expect(getFooterActions("dashboard", { authenticated: true, canAccessAdmin: false }).map((item) => item.label)).not.toContain(
      "Switch role"
    );
  });

  it("keeps dashboard primary nav limited to four mobile destinations", () => {
    expect(getPrimaryNavItems("dashboard").map((item) => item.href)).toEqual([
      "/dashboard",
      "/dashboard/buy",
      "/dashboard/devices",
      "#more"
    ]);
    expect(getPrimaryNavItems("dashboard").map((item) => item.label)).toEqual([
      "Обзор",
      "Купить",
      "Устройства",
      "Ещё"
    ]);
  });

  it("moves referrals and history into dashboard secondary nav", () => {
    const hrefs = getSecondaryNavItems("dashboard").map((item) => item.href);
    expect(hrefs).toContain("/dashboard/referrals");
    expect(hrefs).toContain("/dashboard/history");
    expect(hrefs).not.toContain("/admin");
  });

  it("adds an admin shortcut to dashboard secondary nav only for admin sessions", () => {
    expect(getSecondaryNavItems("dashboard", { canAccessAdmin: true }).map((item) => item.href)).toContain("/admin");
    expect(getSecondaryNavItems("dashboard", { canAccessAdmin: true }).map((item) => item.label)).toContain("Админка");
    expect(getSecondaryNavItems("dashboard", { canAccessAdmin: false }).map((item) => item.href)).not.toContain("/admin");
  });

  it("marks nested admin edit routes active under their parent section", () => {
    expect(isNavItemActive("/admin/plans/[id]/edit", "/admin/plans")).toBe(true);
    expect(isNavItemActive("/admin/promos/[id]/edit", "/admin/promos")).toBe(true);
  });

  it("keeps admin nav inventory complete and root paths exact", () => {
    expect(getPrimaryNavItems("admin").map((item) => item.href)).toEqual([
      "/admin",
      "/admin/users",
      "/admin/payments",
      "#more"
    ]);
    expect(getPrimaryNavItems("admin").map((item) => item.label)).toEqual([
      "Обзор",
      "Пользователи",
      "Платежи",
      "Ещё"
    ]);
    expect(getSecondaryNavItems("admin").map((item) => item.href)).toEqual([
      "/admin/plans",
      "/admin/promos",
      "/admin/referrals",
      "/admin/logs",
      "/admin/export",
      "/dashboard"
    ]);
    expect(getSecondaryNavItems("admin").map((item) => item.label)).toEqual([
      "Тарифы",
      "Промокоды",
      "Рефералы",
      "Логи",
      "Экспорт",
      "Личный кабинет"
    ]);
    expect(isNavItemActive("/admin/plans", "/admin")).toBe(false);
    expect(isNavItemActive("/dashboard/buy", "/dashboard")).toBe(false);
  });
});
