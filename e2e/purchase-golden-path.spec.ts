import { expect, test } from "@playwright/test";

// Golden-path purchase flow. Prerequisites for the test environment:
//   - EMAIL_ENABLED=false (so /register completes in one step without OTP)
//   - YOOKASSA_ENABLED=true (so /api/payments/create accepts YOOKASSA provider)
//   - A seeded Plan (the default "WELCOME10" promo + at least one plan from prisma/seed.mjs)
//   - NEXT_PUBLIC_TURNSTILE_SITE_KEY="" (so the register form skips captcha)
//
// The external YooKassa create-payment call is intercepted via page.route(); the
// webhook activation step is simulated by hitting /api/webhook/yookassa directly
// from the test runner with a synthesized payload. The handler will then re-fetch
// payment status from YooKassa, which is also intercepted to return SUCCEEDED.
//
// NOTE: this is the scaffold. The actual Plan id and route patterns may need
// adjusting for the live UI. Run `npx playwright test --headed --debug` to step
// through interactively.

const TEST_USER_EMAIL = `e2e-${Date.now()}@example.test`;
const TEST_USER_PASSWORD = "e2e-password-1234";

test.describe.skip("purchase golden path (requires test-mode env)", () => {
  test("register → buy plan → webhook activates subscription", async ({ page, context }) => {
    // 1. Mock outbound YooKassa create-payment so we don't hit the real API.
    await context.route("https://api.yookassa.ru/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/v3/payments")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "remote-test-payment-1",
            status: "pending",
            confirmation: { confirmation_url: "https://example.test/checkout" }
          })
        });
      }
      if (url.includes("/v3/payments/")) {
        // The webhook handler re-fetches payment status — return SUCCEEDED.
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "remote-test-payment-1",
            status: "succeeded",
            paid: true,
            amount: { value: "199.00", currency: "RUB" },
            metadata: { paymentId: "<replaced-at-runtime>" }
          })
        });
      }
      return route.continue();
    });

    // 2. Register a fresh user.
    await page.goto("/register");
    await page.fill("input[type=email]", TEST_USER_EMAIL);
    await page.fill("input[type=password]", TEST_USER_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/dashboard/);

    // 3. Buy a plan. The exact selectors depend on your /dashboard/buy UI; adjust
    // these to match the rendered DOM.
    await page.goto("/dashboard/buy");
    await page.locator("[data-testid='plan-card']").first().click();
    await page.locator("[data-testid='checkout-yookassa']").click();

    // 4. The app navigates to YooKassa's checkout (mocked above). Capture the
    // newly-created payment id from the dashboard so we can fire the webhook.
    const paymentId = await page.evaluate(() => sessionStorage.getItem("lastPaymentId"));
    expect(paymentId).toBeTruthy();

    // 5. Simulate YooKassa webhook callback. In a real deploy this comes from
    // YooKassa's IPs; for the test we bypass with X-Real-IP set to an allowlisted
    // address (see yookassa allowlist in lib/services/yookassa.ts).
    const webhookResponse = await page.request.post("/api/webhook/yookassa", {
      headers: {
        "Content-Type": "application/json",
        "X-Real-IP": "185.71.76.1"
      },
      data: {
        event: "payment.succeeded",
        object: {
          id: "remote-test-payment-1",
          status: "succeeded",
          paid: true,
          amount: { value: "199.00", currency: "RUB" },
          metadata: { paymentId }
        }
      }
    });
    expect(webhookResponse.status()).toBe(200);

    // 6. Subscription is now active.
    await page.goto("/dashboard");
    await expect(page.locator("[data-testid='subscription-status']")).toHaveText(/ACTIVE/i);
  });
});
