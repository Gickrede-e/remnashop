import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };
const validProductionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/gickvpn?schema=public",
  POSTGRES_DB: "gickvpn",
  POSTGRES_USER: "postgres",
  POSTGRES_PASSWORD: "postgres",
  JWT_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  ADMIN_EMAILS: "admin@example.com",
  NEXT_PUBLIC_SITE_URL: "https://vpn.example.com",
  NEXT_PUBLIC_SITE_NAME: "GickShop",
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: "",
  TELEGRAM_BOT_TOKEN: "",
  REMNAWAVE_BASE_URL: "https://panel.example.com",
  REMNAWAVE_API_TOKEN: "live-remnawave-token",
  YOOKASSA_ENABLED: "true",
  YOOKASSA_SHOP_ID: "shop-id",
  YOOKASSA_SECRET_KEY: "live-yookassa-secret",
  PLATEGA_ENABLED: "true",
  PLATEGA_API_KEY: "live-platega-api-key",
  PLATEGA_MERCHANT_ID: "merchant-id",
  PLATEGA_WEBHOOK_SECRET: "live-platega-webhook-secret",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "notifications@example.com",
  SMTP_PASS: "live-smtp-password",
  EMAIL_FROM: "GickShop <notifications@example.com>",
  REFERRAL_REWARD_TYPE: "FREE_DAYS",
  REFERRAL_REWARD_VALUE: "3",
  CRON_SECRET: "live-cron-secret-12345"
};

function setProcessEnv(overrides: Partial<typeof validProductionEnv> = {}) {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }

  Object.assign(process.env, validProductionEnv, overrides);
}

describe("lib/env", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }

    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("rejects placeholder secrets in production", async () => {
    setProcessEnv({
      JWT_SECRET: "REPLACE_WITH_OPENSSL_RAND_HEX_32"
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("@/lib/env")).rejects.toThrow("Invalid environment configuration");
    expect(errorSpy).toHaveBeenCalledWith(
      "Invalid environment configuration",
      expect.objectContaining({
        JWT_SECRET: [expect.stringContaining("placeholder")]
      })
    );
  });

  it("accepts real production secrets", async () => {
    setProcessEnv();

    const envModule = await import("@/lib/env");

    expect(envModule.env.JWT_SECRET).toBe(validProductionEnv.JWT_SECRET);
    expect(envModule.env.CRON_SECRET).toBe(validProductionEnv.CRON_SECRET);
  });

  it("requires a non-empty Platega merchant id in production", async () => {
    setProcessEnv({
      PLATEGA_MERCHANT_ID: ""
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("@/lib/env")).rejects.toThrow("Invalid environment configuration");
    expect(errorSpy).toHaveBeenCalledWith(
      "Invalid environment configuration",
      expect.objectContaining({
        PLATEGA_MERCHANT_ID: [expect.stringContaining("required in production")]
      })
    );
  });

  it("allows disabled payment providers in production without their secrets", async () => {
    setProcessEnv({
      YOOKASSA_ENABLED: "false",
      YOOKASSA_SHOP_ID: "",
      YOOKASSA_SECRET_KEY: "",
      PLATEGA_ENABLED: "false",
      PLATEGA_API_KEY: "",
      PLATEGA_MERCHANT_ID: "",
      PLATEGA_WEBHOOK_SECRET: ""
    });

    const envModule = await import("@/lib/env");

    expect(envModule.env.YOOKASSA_ENABLED).toBe(false);
    expect(envModule.env.PLATEGA_ENABLED).toBe(false);
  });

  it("still requires YooKassa secrets when YooKassa is enabled", async () => {
    setProcessEnv({
      YOOKASSA_ENABLED: "true",
      YOOKASSA_SECRET_KEY: ""
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("@/lib/env")).rejects.toThrow("Invalid environment configuration");
    expect(errorSpy).toHaveBeenCalledWith(
      "Invalid environment configuration",
      expect.objectContaining({
        YOOKASSA_SECRET_KEY: [expect.stringContaining("required in production")]
      })
    );
  });
});
