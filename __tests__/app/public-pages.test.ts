import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    redirect: redirectMock,
    usePathname: () => "/"
  };
});

vi.mock("@/lib/auth/session", () => ({
  getSession: getSessionMock
}));

vi.mock("@/components/shell/app-topbar", () => ({
  AppTopbar: () => React.createElement("div", { "data-slot": "topbar" })
}));

vi.mock("@/components/shell/app-more-sheet", () => ({
  AppMoreSheet: () => React.createElement("div", { "data-slot": "more-sheet" })
}));

import FaqPage from "@/app/faq/page";
import HomePage from "@/app/page";
import PricingPage from "@/app/pricing/page";
import TermsPage from "@/app/terms/page";

describe("public pages", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    redirectMock.mockReset();
  });

  it("renders the home page inside the public shell for guests", async () => {
    getSessionMock.mockResolvedValue(null);

    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain('data-testid="app-nav-rail"');
    expect(markup).toContain("Войти");
    expect(markup).toContain("Регистрация");
    expect(markup).not.toContain('data-slot="topbar"');
    expect(markup).not.toContain('data-slot="more-sheet"');
  });

  it("redirects authenticated users on the home page to their workspace", async () => {
    getSessionMock.mockResolvedValue({ role: "USER" });

    await HomePage();

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects admins on the home page to the admin workspace", async () => {
    getSessionMock.mockResolvedValue({ role: "ADMIN" });

    await HomePage();

    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("renders FAQ as a compact public document page", () => {
    const markup = renderToStaticMarkup(FaqPage());

    expect(markup).toContain('data-testid="app-nav-rail"');
    expect(markup).toContain("FAQ");
  });

  it("renders pricing as a compact public document page", () => {
    const markup = renderToStaticMarkup(PricingPage());

    expect(markup).toContain('data-testid="app-nav-rail"');
    expect(markup).toContain("Тарифы");
  });

  it("renders terms as a compact public document page", async () => {
    const markup = renderToStaticMarkup(React.createElement(TermsPage));

    expect(markup).toContain('data-testid="app-nav-rail"');
    expect(markup).toContain("Условия");
  });
});
