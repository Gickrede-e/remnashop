import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const routerPush = vi.hoisted(() => vi.fn());
const routerRefresh = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh
  })
}));

vi.mock("@/lib/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SITE_NAME: "RemnaShop"
  }
}));

import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";

describe("auth surfaces", () => {
  it("renders the standalone auth card with semantic shell hooks", async () => {
    const { AuthStandaloneCard } = await import("@/components/blocks/auth/auth-standalone-card");

    const markup = renderToStaticMarkup(
      React.createElement(
        AuthStandaloneCard,
        { title: "Вход" },
        React.createElement("div", { className: "authStandaloneForm" }, "Children")
      )
    );

    expect(markup).toMatch(/class="[^"]*\bauthStandaloneCard\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneHeader\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneTitle\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneBody\b[^"]*"/);
    expect(markup).toContain("RemnaShop");
    expect(markup).toContain("Вход");
    expect(markup).not.toMatch(/class="[^"]*\bauthCardTabs\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthEntryWorkspace\b[^"]*"/);
  });

  it("renders the login form with a register footer link and no telegram block", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LoginForm, {
        nextPath: "/dashboard/buy"
      })
    );

    expect(markup).toMatch(/class="[^"]*\bauthStandaloneForm\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneInput\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneSubmit\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneFooterLink\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthHint\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthTelegram(Section)?\b[^"]*"/);
    expect(markup).toContain('href="/register?next=%2Fdashboard%2Fbuy"');
    expect(markup).toContain('placeholder="Email"');
    expect(markup).toContain('placeholder="Пароль"');
  });

  it("renders the register form with a login footer link and referral code", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RegisterForm, {
        referralCode: "ALLY42",
        nextPath: "/dashboard"
      })
    );

    expect(markup).toMatch(/class="[^"]*\bauthStandaloneForm\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneInput\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneSubmit\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneFooterLink\b[^"]*"/);
    expect(markup).toContain('href="/login?next=%2Fdashboard"');
    expect(markup).toContain('value="ALLY42"');
    expect(markup).not.toMatch(/class="[^"]*\bauthHint\b[^"]*"/);
    expect(markup).toContain('placeholder="Реферальный код"');
  });
});
