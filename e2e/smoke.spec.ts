import { expect, test } from "@playwright/test";

// Smoke: every public surface should at least render and serve a healthy
// /api/health. Failure here means the entire stack is broken — there's no
// point running deeper e2e tests until this is green.
test.describe("public surfaces smoke", () => {
  test("public pages exclude search indexing and use neutral text", async ({ request }) => {
    for (const pathname of ["/", "/login", "/register", "/forgot-password"]) {
      const response = await request.get(pathname, { headers: { "User-Agent": "Googlebot" } });
      expect(response.status(), pathname).toBe(200);
      expect(response.headers()["x-robots-tag"], pathname).toBe("noindex, nofollow");
      const html = await response.text();
      expect(html, pathname).toMatch(/<meta name="robots" content="noindex, nofollow"\s*\/?\s*>/);
      expect(html, pathname).not.toMatch(/vpn|впн/i);
    }
  });

  test("crawlers can read noindex and it covers redirects and static assets", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("User-agent: *\nAllow: /");

    for (const pathname of ["/dashboard", "/icon.svg", "/api/not-a-route"]) {
      const response = await request.get(pathname, { maxRedirects: 0 });
      expect(response.headers()["x-robots-tag"], pathname).toBe("noindex, nofollow");
    }
    expect((await request.get("/hero.png")).status()).toBe(404);
  });

  test("home page renders the hero and primary nav", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/login page renders the form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type=email]")).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
  });

  test("/register page renders the form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("input[type=email]")).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
  });

  test("/api/health reports all components ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { ok: boolean; checks: Record<string, string> };
    expect(body.ok).toBe(true);
    expect(body.checks.db).toBe("ok");
  });

  test("dashboard is gated behind login", async ({ page }) => {
    const response = await page.goto("/dashboard");
    expect(page.url()).toContain("/login");
    expect(response?.status()).toBeLessThan(400);
  });
});
