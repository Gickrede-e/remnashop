import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mockedPathname = vi.hoisted(() => ({ value: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname.value
}));

vi.mock("@/components/shell/app-topbar", () => ({
  AppTopbar: ({ activeRouteLabel }: { activeRouteLabel?: string }) =>
    React.createElement("div", { "data-slot": "topbar", "data-active-route-label": activeRouteLabel })
}));

vi.mock("@/components/shell/app-bottom-nav", () => ({
  AppBottomNav: () => React.createElement("div", { "data-slot": "bottom-nav" })
}));

vi.mock("@/components/shell/app-more-sheet", () => ({
  AppMoreSheet: () => React.createElement("div", { "data-slot": "more-sheet" })
}));

import { AppShell } from "@/components/shell/app-shell";

const TestableAppShell = AppShell as React.ComponentType<React.PropsWithChildren<{ area: "dashboard" | "admin" }>>;

describe("app shell structure", () => {
  it("renders shell content with the new semantic shell hooks", () => {
    mockedPathname.value = "/dashboard";

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
    expect(markup).toMatch(/class="[^"]*\bappShellMain\b[^"]*"/);
  });

  it("passes the active secondary route label to the topbar summary", () => {
    mockedPathname.value = "/dashboard/history";

    const markup = renderToStaticMarkup(
      React.createElement(
        TestableAppShell,
        { area: "dashboard" },
        React.createElement("div", null, "History body")
      )
    );

    expect(markup).toContain('data-active-route-label="История"');
  });

  it("labels the desktop rail navigation landmarks", () => {
    mockedPathname.value = "/dashboard";

    const markup = renderToStaticMarkup(
      React.createElement(
        TestableAppShell,
        { area: "dashboard" },
        React.createElement("div", null, "Screen body")
      )
    );

    expect(markup).toContain('aria-label="Основные разделы"');
    expect(markup).toContain('aria-label="Дополнительные разделы"');
  });
});
