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
import { AuthEntryPanel } from "@/components/blocks/auth/auth-entry-panel";

describe("auth surfaces", () => {
  it("renders the auth entry panel with semantic shell hooks and active tabs", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AuthEntryPanel,
        {
          title: "Вход в кабинет",
          description: "Используйте email и пароль.",
          activeView: "login",
          nextPath: "/dashboard/history"
        },
        React.createElement("div", null, "Children")
      )
    );

    expect(markup).toMatch(/class="[^"]*\bauthCard\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthCardHeader\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthCardTabs\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthCardTab\b[^"]*\bauthCardTabCurrent\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthCardBody\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthEntryWorkspace\b[^"]*"/);
    expect(markup).toContain('aria-current="page"');
  });

  it("renders the login form with compact auth form hooks and telegram zone", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LoginForm, {
        telegramUsername: "remnashop_bot",
        nextPath: "/dashboard/buy"
      })
    );

    expect(markup).toMatch(/class="[^"]*\bauthForm\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthFormGrid\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthTelegramSection\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthTelegram\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthHint\b[^"]*"/);
  });

  it("renders the register form with semantic auth form hooks and footer hint", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RegisterForm, {
        referralCode: "ALLY42",
        nextPath: "/dashboard"
      })
    );

    expect(markup).toMatch(/class="[^"]*\bauthForm\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthFormGrid\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthHint\b[^"]*"/);
    expect(markup).toContain("ALLY42");
  });
});
