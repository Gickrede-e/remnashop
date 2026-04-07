import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { topbarProps, bottomNavProps, moreSheetProps } = vi.hoisted(() => ({
  topbarProps: { current: null as any },
  bottomNavProps: { current: null as any },
  moreSheetProps: { current: null as any }
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard"
}));

vi.mock("@/components/shell/app-topbar", () => ({
  AppTopbar: (props: any) => {
    topbarProps.current = props;
    return React.createElement("div", { "data-slot": "topbar" });
  }
}));

vi.mock("@/components/shell/app-bottom-nav", () => ({
  AppBottomNav: (props: any) => {
    bottomNavProps.current = props;
    return React.createElement("div", { "data-slot": "bottom-nav" });
  }
}));

vi.mock("@/components/shell/app-more-sheet", () => ({
  AppMoreSheet: (props: any) => {
    moreSheetProps.current = props;
    return React.createElement("div", { "data-slot": "more-sheet" });
  }
}));

import { AppShell } from "@/components/shell/app-shell";

const TestableAppShell = AppShell as React.ComponentType<React.PropsWithChildren<{ area: "dashboard" | "admin" }>>;

describe("app shell structure", () => {
  it("renders shell content with the new semantic shell hooks", () => {
    topbarProps.current = null;
    bottomNavProps.current = null;
    moreSheetProps.current = null;

    const markup = renderToStaticMarkup(
      React.createElement(
        TestableAppShell,
        { area: "dashboard" },
        React.createElement("div", null, "Screen body")
      )
    );

    expect(markup).not.toContain("<main");
    expect(markup).toContain("Screen body");
    expect(markup).toContain('data-testid="app-shell-main"');
    expect(markup).toMatch(/\bappShellMain\b/);
    expect(markup).toContain('data-slot="topbar"');
    expect(markup).toContain('data-slot="bottom-nav"');
    expect(markup).toContain('data-slot="more-sheet"');

    expect(topbarProps.current?.homeHref).toBe("/dashboard");
    expect(topbarProps.current?.moreSheetId).toBe("dashboard-more-sheet");
    expect(bottomNavProps.current?.moreSheetId).toBe("dashboard-more-sheet");
    expect(moreSheetProps.current?.area).toBe("dashboard");
    expect(moreSheetProps.current?.contentId).toBe("dashboard-more-sheet");
  });
});
