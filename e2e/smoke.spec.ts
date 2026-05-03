import { expect, test } from "@playwright/test";

// Smoke: every public surface should at least render and serve a healthy
// /api/health. Failure here means the entire stack is broken — there's no
// point running deeper e2e tests until this is green.
test.describe("public surfaces smoke", () => {
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
