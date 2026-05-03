import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import FaqPage from "@/app/faq/page";
import HomePage from "@/app/page";
import PricingPage from "@/app/pricing/page";
import TermsPage from "@/app/terms/page";

describe("public pages", () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });

  it("redirects the home page to login", async () => {
    await HomePage();

    expect(redirectMock).toHaveBeenCalledWith("/login");
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
