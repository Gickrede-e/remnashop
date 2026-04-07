import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard"
}));

vi.mock("@/components/shell/app-topbar", () => ({
  AppTopbar: () => React.createElement("div", { "data-slot": "topbar" })
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
  });
});
