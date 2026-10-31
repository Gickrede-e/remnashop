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
});
