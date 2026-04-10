import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard"
}));

vi.mock("@/lib/public-env", () => ({
  publicEnv: { NEXT_PUBLIC_SITE_NAME: "GickShop" }
}));

import { AppShell } from "@/components/shell/app-shell";

const TestableAppShell = AppShell as React.ComponentType<
  React.PropsWithChildren<{
    area: "dashboard" | "admin" | "public";
    canAccessAdmin?: boolean;
    accountSummary?: { email: string } | null;
  }>
>;

function renderShell(
  props: React.ComponentProps<typeof TestableAppShell> = {
    area: "dashboard",
    canAccessAdmin: true,
    accountSummary: { email: "user@example.com" }
  }
) {
  return renderToStaticMarkup(
    React.createElement(TestableAppShell, props, React.createElement("div", null, "Screen body"))
  );
}

function expectTextInOrder(markup: string, labels: string[]) {
  let cursor = -1;

  for (const label of labels) {
    const next = markup.indexOf(label, cursor + 1);
    expect(next).toBeGreaterThan(cursor);
    cursor = next;
  }
}

describe("app shell structure", () => {
  it("renders a single dashboard sidebar with brand and ordered primary nav labels", () => {
    const markup = renderShell();

    expect(markup.match(/<aside class="[^"]*\bdashSidebar\b[^"]*"/g) ?? []).toHaveLength(1);
    expect(markup).toContain('data-testid="app-nav-rail"');
    expect(markup).toContain("GICKSHOP");
    expectTextInOrder(markup, ["Обзор", "Купить", "Устройства", "История", "Рефералы"]);
    expect(markup).not.toContain(">Ещё<");
  });

  it("shows OTHER STUFF only when other nav items exist", () => {
    const dashboardMarkup = renderShell();
    const publicMarkup = renderShell({ area: "public" });

    expect(dashboardMarkup).toContain("OTHER STUFF");
    expect(publicMarkup).not.toContain("OTHER STUFF");
  });

  it("renders the footer CTA pill and logout form only when account summary exists", () => {
    const withAccountMarkup = renderShell();
    const withoutAccountMarkup = renderShell({ area: "dashboard", canAccessAdmin: true, accountSummary: null });

    expect(withAccountMarkup).toContain("КУПИТЬ ПОДПИСКУ");
    expect(withAccountMarkup).toContain('action="/api/auth/logout"');
    expect(withAccountMarkup).toContain('method="post"');
    expect(withAccountMarkup).toContain("user@example.com");
    expect(withoutAccountMarkup).not.toContain('action="/api/auth/logout"');
    expect(withoutAccountMarkup).not.toContain("user@example.com");
  });

  it("renders the new main anchor and excludes legacy shell affordances", () => {
    const markup = renderShell();

    expect(markup).toContain('href="#dash-shell-main"');
    expect(markup).toContain('<main id="dash-shell-main"');
    expect(markup).toContain('data-testid="app-shell-main"');
    expect(markup).not.toContain('data-testid="app-topbar"');
    expect(markup).not.toContain('data-testid="app-more-sheet"');
    expect(markup).not.toMatch(/\bappNavRail[A-Za-z-]*\b/);
    expect(markup).not.toMatch(/\bappTopbar[A-Za-z-]*\b/);
    expect(markup).not.toMatch(/\bappMoreSheet[A-Za-z-]*\b/);
    expect(markup).not.toMatch(/\bappBottomNav[A-Za-z-]*\b/);
  });
});
