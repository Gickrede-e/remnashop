import { describe, expect, it } from "vitest";

import {
  getPrimaryNavItems,
  getSecondaryNavItems,
  isNavItemActive
} from "@/lib/ui/app-shell-nav";

describe("app shell nav", () => {
  it("keeps dashboard primary nav limited to four mobile destinations", () => {
    expect(getPrimaryNavItems("dashboard").map((item) => item.href)).toEqual([
      "/dashboard",
      "/dashboard/buy",
      "/dashboard/history",
      "#more"
    ]);
  });

  it("moves referrals into dashboard secondary nav", () => {
    expect(getSecondaryNavItems("dashboard").map((item) => item.href)).toContain("/dashboard/referrals");
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
    expect(getSecondaryNavItems("admin").map((item) => item.href)).toEqual([
      "/admin/plans",
      "/admin/promos",
      "/admin/referrals",
      "/admin/logs",
      "/admin/export",
      "/dashboard"
    ]);
    expect(isNavItemActive("/admin/plans", "/admin")).toBe(false);
    expect(isNavItemActive("/dashboard/buy", "/dashboard")).toBe(false);
  });
});
