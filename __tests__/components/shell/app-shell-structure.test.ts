import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mockedPathname = vi.hoisted(() => ({ value: "/dashboard" }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname.value
}));

vi.mock("@/components/shell/app-topbar", () => ({
  AppTopbar: ({ area }: { area?: string }) =>
    React.createElement("div", {
      "data-slot": "topbar",
      "data-area": area
    })
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

    expect(markup).toContain('href="#app-shell-main"');
    expect(markup).toContain(">Перейти к содержимому<");
    expect(markup).toContain('data-testid="app-nav-rail"');
    expect(markup).toContain('<main id="app-shell-main"');
    expect(markup).toContain("Screen body");
    expect(markup).toContain('data-testid="app-shell-main"');
    expect(markup).toMatch(/class="[^"]*\bappShellMain\b[^"]*"/);
    expect(markup).not.toContain('data-slot="bottom-nav"');
  });

  it("keeps the topbar mounted without the legacy bottom navigation", () => {
    mockedPathname.value = "/dashboard/history";

    const markup = renderToStaticMarkup(
      React.createElement(
        TestableAppShell,
        { area: "dashboard" },
        React.createElement("div", null, "History body")
      )
    );

    expect(markup).toContain('data-slot="topbar"');
    expect(markup).toContain('data-area="dashboard"');
    expect(markup).not.toContain('data-slot="bottom-nav"');
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

    expect(markup).toContain('data-testid="app-nav-rail"');
    expect(markup).toContain('aria-label="Основная навигация"');
    expect(markup).toContain('aria-label="Действия аккаунта"');
    expect(markup).not.toContain('data-slot="bottom-nav"');
  });
});
