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

vi.mock("@/lib/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SITE_NAME: "RemnaShop"
  }
}));

import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";

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
  });

  it("renders the register page inside the semantic auth scene", async () => {
    getSessionMock.mockResolvedValue(null);

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
  });

  it("redirects authenticated users from login to the dashboard", async () => {
    getSessionMock.mockResolvedValue({ role: "USER" });

    await LoginPage({
      searchParams: Promise.resolve({})
    });

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects admins from login to the admin workspace", async () => {
    getSessionMock.mockResolvedValue({ role: "ADMIN" });

    await LoginPage({
      searchParams: Promise.resolve({})
    });

    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });
});
