import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ getSession: getSessionMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

describe("dashboard help page", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockResolvedValue({ userId: "user-1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["https://t.me/example_support", " https://support.example.com/contact "])(
    "links directly to the configured support URL: %s",
    async (supportUrl) => {
      vi.stubEnv("NEXT_PUBLIC_SUPPORT_TELEGRAM_URL", supportUrl);
      const { default: HelpPage } = await import("@/app/dashboard/help/page");
      const markup = renderToStaticMarkup(await HelpPage());

      const supportLink = markup.match(/<a\b[^>]*>Поддержка<\/a>/)?.[0];
      expect(supportLink).toContain(`href="${supportUrl.trim()}"`);
      expect(supportLink).toContain('target="_blank"');
      expect(supportLink).toContain('rel="noreferrer"');
      expect(markup).toContain("Не работает подключение?");
      expect(markup).not.toMatch(/vpn|впн/i);
      expect(markup).toContain('href="/dashboard?tour=1"');
      expect(markup).not.toMatch(/<input|<textarea|help-chat-input|Чат с поддержкой|в чат/);
    }
  );

  it.each(["", "   "])("omits the support button when the URL is blank: %j", async (supportUrl) => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_TELEGRAM_URL", supportUrl);
    const { default: HelpPage } = await import("@/app/dashboard/help/page");
    const markup = renderToStaticMarkup(await HelpPage());

    expect(markup).not.toContain("dashSupportCta");
    expect(markup).not.toContain('href=""');
    expect(markup).toContain("Не работает подключение?");
    expect(markup).not.toMatch(/vpn|впн/i);
  });

  it("shows only the Android steps until the reader picks iPhone", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_TELEGRAM_URL", "");
    const { default: HelpPage } = await import("@/app/dashboard/help/page");
    const markup = renderToStaticMarkup(await HelpPage());

    expect(markup).toMatch(/aria-pressed="true"[^>]*>Android</);
    expect(markup).toContain("Отключите частный DNS");
    expect(markup).toContain("Сбросить настройки</strong>");
    expect(markup).not.toContain("Удалите старые профили");
  });

  it("ends with a support card linking to the configured URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_TELEGRAM_URL", "https://t.me/example_support");
    const { default: HelpPage } = await import("@/app/dashboard/help/page");
    const markup = renderToStaticMarkup(await HelpPage());

    const supportCardLink = markup.match(/<a\b[^>]*helpSupportAction[^>]*>/)?.[0];
    expect(markup).toContain("Всё ещё не работает?");
    expect(supportCardLink).toContain('href="https://t.me/example_support"');
    expect(markup).toContain("Написать в поддержку</a>");
  });

  it("redirects unauthenticated users to login", async () => {
    getSessionMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const { default: HelpPage } = await import("@/app/dashboard/help/page");

    await expect(HelpPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
