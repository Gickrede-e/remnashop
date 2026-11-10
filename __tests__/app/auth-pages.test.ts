import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as registerForm from "@/components/auth/register-form";
import * as forgotPasswordForm from "@/components/auth/forgot-password-form";

const getSessionMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      refresh: vi.fn()
    }),
    redirect: redirectMock
  };
});

vi.mock("@/lib/auth/session", () => ({
  getSession: getSessionMock
}));

vi.mock("@/lib/env", () => ({
  env: {
    EMAIL_ENABLED: true,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "runtime-site-key"
  }
}));

vi.mock("@/lib/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SITE_NAME: "RemnaShop"
  }
}));

import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import ForgotPasswordPage from "@/app/forgot-password/page";

describe("auth pages", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    redirectMock.mockReset();
  });

  it("renders the login page inside the semantic auth scene", async () => {
    getSessionMock.mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/dashboard/history" })
      })
    );

    expect(markup).toMatch(/<main[^>]*class="[^"]*\bauthScene\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthSceneViewport\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneCard\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneTitle\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneForm\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthEntryWorkspace\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthCardTabs\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthTelegram\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthHint\b[^"]*"/);
    expect(markup).toContain("Вход");
    expect(markup).toContain('href="/forgot-password"');
    expect(markup).toContain('href="/terms"');
  });

  it("renders the register page inside the semantic auth scene", async () => {
    getSessionMock.mockResolvedValue(null);
    const formSpy = vi.spyOn(registerForm, "RegisterForm");

    const markup = renderToStaticMarkup(
      await RegisterPage({
        searchParams: Promise.resolve({ ref: "ALLY42", next: "/dashboard/buy" })
      })
    );

    expect(markup).toMatch(/<main[^>]*class="[^"]*\bauthScene\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthSceneViewport\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneCard\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneTitle\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bauthStandaloneForm\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthEntryWorkspace\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthCardTabs\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthTelegram\b[^"]*"/);
    expect(markup).not.toMatch(/class="[^"]*\bauthHint\b[^"]*"/);
    expect(markup).toContain("Регистрация");
    expect(markup).toContain("ALLY42");
    expect(markup).toContain('href="/terms"');
    expect(formSpy).toHaveBeenCalledWith(
      expect.objectContaining({ turnstileSiteKey: "runtime-site-key" }),
      undefined
    );
  });

  it("passes the runtime Turnstile site key to password recovery", async () => {
    getSessionMock.mockResolvedValue(null);
    const formSpy = vi.spyOn(forgotPasswordForm, "ForgotPasswordForm");

    const markup = renderToStaticMarkup(await ForgotPasswordPage());

    expect(markup).toContain("Восстановление пароля");
    expect(formSpy).toHaveBeenCalledWith(
      expect.objectContaining({ turnstileSiteKey: "runtime-site-key" }),
      undefined
    );
  });
});
