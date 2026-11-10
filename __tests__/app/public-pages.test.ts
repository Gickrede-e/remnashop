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

import HomePage from "@/app/page";
import { TERMS_SECTIONS } from "@/app/terms/content";
import TermsPage from "@/app/terms/page";
import { LEGAL_ENTITY } from "@/lib/constants";

describe("public pages", () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });

  it("renders the landing hero instead of redirecting", () => {
    const markup = renderToStaticMarkup(HomePage());

    expect(markup).toContain("Ваш трафик —");
    expect(markup).toContain("не наше дело.");
    expect(markup).toMatch(/<a href="\/register"[^>]*>СОЗДАТЬ АККАУНТ/);
    expect(markup).toMatch(/<a href="\/login"[^>]*>ВОЙТИ<\/a>/);
    expect(markup).toContain("gickshop");
    expect(markup).not.toMatch(/vpn|впн/i);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("links the agreement from the landing footer", () => {
    const markup = renderToStaticMarkup(HomePage());

    expect(markup).toMatch(/<a href="\/terms"[^>]*>СОГЛАШЕНИЕ<\/a>/);
  });

  it("renders every agreement section and the requisites on the terms page", () => {
    const markup = renderToStaticMarkup(TermsPage());

    for (const section of TERMS_SECTIONS) {
      expect(markup).toContain(section.title);
    }
    expect(markup).toContain("15. Реквизиты и контакты");
    expect(markup).toContain(LEGAL_ENTITY.inn);
    expect(markup).toContain(LEGAL_ENTITY.ogrnip);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
