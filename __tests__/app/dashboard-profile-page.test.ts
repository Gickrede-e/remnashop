import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const mockPublicEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_SUPPORT_TELEGRAM_URL: ""
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    redirect: redirectMock
  };
});

vi.mock("@/lib/auth/session", () => ({
  getSession: getSessionMock
}));

vi.mock("@/lib/public-env", () => ({
  publicEnv: mockPublicEnv
}));

import ProfilePage from "@/app/dashboard/profile/page";

describe("dashboard profile page", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    redirectMock.mockReset();
    mockPublicEnv.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL = "";
  });

  it("renders account info and password change fields for authenticated users", async () => {
    mockPublicEnv.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL = "https://t.me/gick_support";
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      role: "USER"
    });

    const markup = renderToStaticMarkup(await ProfilePage());

    expect(markup).toContain("Профиль");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("Учётная запись");
    expect(markup).toContain("Изменить пароль");
    expect(markup).toContain('href="https://t.me/gick_support"');
    expect(markup).toContain("Поддержка");
    expect(markup).toContain('href="/terms"');
    expect(markup).toContain('id="currentPassword"');
    expect(markup).toContain('id="newPassword"');
    expect(markup).toContain('id="confirmPassword"');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders a show-password toggle per field and the unmet password checklist", async () => {
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      role: "USER"
    });

    const markup = renderToStaticMarkup(await ProfilePage());

    expect(markup.match(/aria-label="Показать пароль" aria-pressed="false"/g) ?? []).toHaveLength(3);
    expect(markup).toContain("Минимум 8 символов");
    expect(markup).toContain("Пароли совпадают");
    expect(markup).not.toContain("profilePasswordCheck is-met");
  });

  it("redirects unauthenticated users to login", async () => {
    getSessionMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
