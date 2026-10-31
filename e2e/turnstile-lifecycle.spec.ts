import { createServer } from "node:http";
import { once } from "node:events";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { createServer as createViteServer } from "vite";

const root = path.resolve(__dirname, "..");
let server: ReturnType<typeof createServer>;
let vite: Awaited<ReturnType<typeof createViteServer>>;
let origin: string;
const sdkScript = `
  window.__turnstile = { callbacks: [], renders: [], resets: [], removes: [], pending: new Set() };
  window.turnstile = {
    ready: (cb) => cb(),
    render: (el, options) => {
      const id = 'widget-' + window.__turnstile.renders.length;
      window.__turnstile.renders.push(id);
      window.__turnstile.pending.add(id);
      window.__turnstile.callbacks.push({
        id,
        callback: options.callback,
        expired: () => {
          window.__turnstile.pending.add(id);
          options['expired-callback']();
        }
      });
      el.dataset.turnstileWidget = id;
      return id;
    },
    reset: (id) => {
      window.__turnstile.resets.push(id);
      window.__turnstile.pending.add(id);
    },
    remove: (id) => {
      window.__turnstile.removes.push(id);
      window.__turnstile.pending.delete(id);
    }
  };
`;

declare global {
  interface Window {
    __turnstile: {
      callbacks: Array<{ id: string; callback: (token: string) => void; expired: () => void }>;
      renders: string[];
      resets: string[];
      removes: string[];
      pending: Set<string>;
    };
  }
}

test.beforeAll(async () => {
  vite = await createViteServer({
    root,
    cacheDir: "/tmp/remnashop-turnstile-vite",
    appType: "custom",
    configFile: false,
    envFile: false,
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "turnstile-browser-harness",
      resolveId(id) {
        if (id === "/virtual:turnstile-harness" || id === "virtual:turnstile-harness") return "\0turnstile-harness";
      },
      load(id) {
        if (id !== "\0turnstile-harness") return;
        return `
          import React from "react";
          import { createRoot } from "react-dom/client";
          import { RegisterForm } from "/components/auth/register-form.tsx";
          import { ForgotPasswordForm } from "/components/auth/forgot-password-form.tsx";
          const q = new URLSearchParams(location.search);
          const props = { emailEnabled: q.get("direct") !== "1", turnstileSiteKey: q.get("disabled") ? "" : "test-site-key" };
          createRoot(document.getElementById("root")).render(
            q.get("form") === "forgot"
              ? React.createElement(ForgotPasswordForm, props)
              : React.createElement(RegisterForm, props)
          );
        `;
      }
    }],
    resolve: {
      alias: {
        "@": root,
        "next/link": path.join(root, "e2e/fixtures/next-link.tsx"),
        "next/navigation": path.join(root, "e2e/fixtures/next-navigation.ts")
      }
    }
  });

  server = createServer((request, response) => {
    if (request.url?.startsWith("/form")) {
      response.writeHead(200, { "content-type": "text/html" });
      response.end('<div id="root"></div><script type="module" src="/virtual:turnstile-harness"></script>');
      return;
    }
    vite.middlewares(request, response);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("browser harness did not bind");
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await vite.close();
  server.close();
  await once(server, "close");
});

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", (route) =>
    route.fulfill({ contentType: "application/javascript", body: sdkScript })
  );
  await page.route("**/api/auth/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ok: true })
  }));
});

async function solve(page: Page, token: string) {
  await expect.poll(() => page.evaluate(() => window.__turnstile?.callbacks.length ?? 0)).toBeGreaterThan(0);
  await page.evaluate((nextToken) => {
    const challenge = window.__turnstile.callbacks.at(-1)!;
    if (!window.__turnstile.pending.delete(challenge.id)) {
      throw new Error("Turnstile must render or reset before issuing another token");
    }
    challenge.callback(nextToken);
  }, token);
}

test("register keeps one SDK widget through token and OTP, and uses a new token after 60 seconds", async ({ page }) => {
  await page.clock.install();
  const tokens: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/send-verification")) tokens.push(JSON.parse(request.postData() ?? "{}").cfTurnstileToken);
  });

  await page.goto(`${origin}/form`);
  await page.fill("#email", "person@example.test");
  await page.fill("#password", "password-123");
  await expect.poll(() => page.evaluate(() => window.__turnstile.renders.length)).toBe(1);
  await solve(page, "first-token");
  await expect.poll(() => page.evaluate(() => window.__turnstile.renders.length)).toBe(1);

  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByText("Код отправлен на")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__turnstile.renders.length)).toBe(1);
  await expect(page.locator("[data-turnstile-widget]")).toHaveCount(1);
  await expect.poll(() => tokens).toEqual(["first-token"]);
  await expect.poll(() => page.evaluate(() => window.__turnstile.resets)).toEqual(["widget-0"]);

  await page.clock.runFor(60_000);
  await expect(page.getByRole("button", { name: "Отправить повторно" })).toBeDisabled();
  await solve(page, "second-token");
  await expect(page.getByRole("button", { name: "Отправить повторно" })).toBeEnabled();
  await page.getByRole("button", { name: "Отправить повторно" }).click();
  await expect.poll(() => tokens).toEqual(["first-token", "second-token"]);
  await expect.poll(() => page.evaluate(() => window.__turnstile.resets)).toEqual(["widget-0", "widget-0"]);
});

test("forgot-password OTP resend requires a fresh token and keeps reset fields after an HTTP rejection", async ({ page }) => {
  await page.clock.install();
  const tokens: string[] = [];
  await page.unroute("**/api/auth/**");
  await page.route("**/api/auth/forgot-password", (route) => {
    tokens.push(JSON.parse(route.request().postData() ?? "{}").cfTurnstileToken);
    return tokens.length === 1
      ? route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) })
      : route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ ok: false, error: "Ошибка почты" }) });
  });
  await page.goto(`${origin}/form?form=forgot`);
  await page.fill("#fp-email", "person@example.test");
  await solve(page, "first-token");
  await page.getByRole("button", { name: "Отправить код" }).click();
  await expect(page.getByText("Код отправлен на")).toBeVisible();
  await expect.poll(() => tokens).toEqual(["first-token"]);
  await expect.poll(() => page.evaluate(() => window.__turnstile.resets)).toEqual(["widget-0"]);

  await solve(page, "expired-token");
  await page.evaluate(() => window.__turnstile.callbacks.at(-1)!.expired());
  await page.getByLabel("Цифра 1").fill("1");
  await page.getByLabel("Цифра 2").fill("2");
  await page.getByLabel("Цифра 3").fill("3");
  await page.getByLabel("Цифра 4").fill("4");
  await page.getByLabel("Цифра 5").fill("5");
  await page.getByLabel("Цифра 6").fill("6");
  await page.fill("#fp-newpw", "password-123");
  await page.fill("#fp-confirmpw", "password-123");
  await expect(page.getByRole("button", { name: "Сменить пароль" })).toBeEnabled();
  await page.clock.runFor(60_000);
  await expect(page.getByRole("button", { name: "Отправить повторно" })).toBeDisabled();
  await solve(page, "second-token");
  await page.getByRole("button", { name: "Отправить повторно" }).click();
  await expect.poll(() => tokens).toEqual(["first-token", "second-token"]);
  await expect(page.locator(".authStandaloneError")).toContainText("Ошибка почты");
  await expect(page.getByLabel("Цифра 1")).toHaveValue("1");
  await expect(page.locator("#fp-newpw")).toHaveValue("password-123");
  await expect.poll(() => page.evaluate(() => window.__turnstile.resets)).toEqual(["widget-0", "widget-0"]);
});

test("disabled Turnstile does not load the SDK and direct registration still submits", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(`${origin}/form?disabled=1&direct=1`);
  await page.fill("#email", "person@example.test");
  await page.fill("#password", "password-123");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect.poll(() => requests.some((url) => url.includes("challenges.cloudflare.com"))).toBe(false);
  await expect.poll(() => requests.some((url) => url.includes("/api/auth/register"))).toBe(true);
});

test("network and HTTP retries keep form input and synchronous double-click sends once", async ({ page }) => {
  let requests = 0;
  await page.unroute("**/api/auth/**");
  await page.route("**/api/auth/register", (route) => {
    requests += 1;
    if (requests === 1) return route.abort("failed");
    if (requests === 2) return route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "Ошибка почты" })
    });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto(`${origin}/form?direct=1`);
  await page.fill("#email", "person@example.test");
  await page.fill("#password", "password-123");
  await solve(page, "failed-token");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.locator(".authStandaloneError")).toContainText("Не удалось отправить запрос");
  await expect(page.locator("#email")).toHaveValue("person@example.test");
  await expect.poll(() => page.evaluate(() => window.__turnstile.resets)).toEqual(["widget-0"]);

  await solve(page, "http-error-token");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.locator(".authStandaloneError")).toContainText("Ошибка почты");
  await expect(page.locator("#email")).toHaveValue("person@example.test");
  await expect.poll(() => page.evaluate(() => window.__turnstile.resets)).toEqual(["widget-0", "widget-0"]);

  await solve(page, "retry-token");
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('button[type="submit"]');
    button?.click();
    button?.click();
  });
  await expect.poll(() => requests).toBe(3);
  await expect.poll(() => page.evaluate(() => window.__turnstile.resets)).toEqual(["widget-0", "widget-0", "widget-0"]);
});

test("resets only after the request completes and preparing an OTP token sends no email", async ({ page }) => {
  await page.clock.install();
  const tokens: string[] = [];
  let release!: () => void;
  const responseReady = new Promise<void>((resolve) => { release = resolve; });
  await page.unroute("**/api/auth/**");
  await page.route("**/api/auth/send-verification", async (route) => {
    tokens.push(JSON.parse(route.request().postData() ?? "{}").cfTurnstileToken);
    await responseReady;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto(`${origin}/form`);
  await page.fill("#email", "person@example.test");
  await page.fill("#password", "password-123");
  await solve(page, "first-token");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  try {
    await expect.poll(() => tokens).toEqual(["first-token"]);
    await expect(page.getByRole("button", { name: "Отправляем код..." })).toBeDisabled();
    expect(await page.evaluate(() => window.__turnstile.resets)).toEqual([]);
  } finally {
    release();
  }

  await expect(page.getByText("Код отправлен на")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__turnstile.resets)).toEqual(["widget-0"]);
  await solve(page, "prepared-token");
  await page.clock.runFor(60_000);
  await expect(page.getByRole("button", { name: "Отправить повторно" })).toBeEnabled();
  expect(tokens).toEqual(["first-token"]);
  await page.getByRole("button", { name: "Отправить повторно" }).click();
  await expect.poll(() => tokens).toEqual(["first-token", "prepared-token"]);
  await expect.poll(() => page.evaluate(() => window.__turnstile.resets)).toEqual(["widget-0", "widget-0"]);
});

test("a second registration send within the first second restarts the full countdown", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-09-19T12:00:01Z"));
  await page.goto(`${origin}/form?disabled=1`);
  await page.fill("#email", "person@example.test");
  await page.fill("#password", "password-123");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByText("Код отправлен на")).toBeVisible();
  await page.clock.runFor(500);
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByText("Код отправлен на")).toBeVisible();
  await page.clock.runFor(59_000);
  await expect(page.getByRole("button", { name: "Отправить повторно" })).toBeDisabled();
  await page.clock.runFor(1_000);
  await expect(page.getByRole("button", { name: "Отправить повторно" })).toBeEnabled();
});

test("script failure exposes retry and only the retry loads the SDK", async ({ page }) => {
  let loads = 0;
  await page.unroute("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", (route) => {
    loads += 1;
    return loads === 1
      ? route.abort("failed")
      : route.fulfill({ contentType: "application/javascript", body: sdkScript });
  });
  await page.goto(`${origin}/form`);
  await expect(page.getByRole("button", { name: "Повторить проверку" })).toBeVisible();
  await page.getByRole("button", { name: "Повторить проверку" }).click();
  await expect.poll(() => loads).toBe(2);
  await expect.poll(() => page.evaluate(() => window.__turnstile?.renders.length ?? 0)).toBe(1);
});
