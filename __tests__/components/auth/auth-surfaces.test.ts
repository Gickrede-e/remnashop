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
        { title: "Вход в кабинет", description: "Используйте email и пароль." },
        React.createElement("div", null, "Children")
      )
    );

    expect(markup).toContain("RemnaShop");
    expect(markup).toContain("Вход в кабинет");
    expect(markup).toContain("Используйте email и пароль.");
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneCard\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneBody\b[^"]*"/);
    expect(markup).not.toContain("Навигация авторизации");
    expect(markup).not.toMatch(/class="[^"]*\bauthCardTabs\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthEntryTabs\b[^"]*"/);
    expect(markup).not.toContain('aria-current="page"');
  });

  it("renders the login form with a register footer link and no telegram block", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LoginForm, {
        telegramUsername: "remnashop_bot",
        nextPath: "/dashboard/buy"
      })
    );

    expect(markup).toMatch(/class="[^"]*\bauthForm\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthFormGrid\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthTelegramSection\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthTelegram\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthHint\b[^"]*"/);
    expect(markup).toContain('href="/register?next=%2Fdashboard%2Fbuy"');
    expect(markup).toContain("Зарегистрироваться");
  });

  it("renders the register form with a login footer link and referral code", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RegisterForm, {
        referralCode: "ALLY42",
        nextPath: "/dashboard"
      })
    );

    expect(markup).toMatch(/class="[^"]*\bauthForm\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthFormGrid\b[^"]*"/);
    expect(markup).toContain('href="/login?next=%2Fdashboard"');
    expect(markup).toContain("Войти");
    expect(markup).toContain("ALLY42");
  });
});
