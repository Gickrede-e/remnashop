import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };
const validProductionEnv = {
  NODE_ENV: "production",
  NEXT_PHASE: "",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/gickvpn?schema=public",
  POSTGRES_DB: "gickvpn",
  POSTGRES_USER: "postgres",
  POSTGRES_PASSWORD: "postgres",
  JWT_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  ADMIN_EMAILS: "admin@example.com",
  NEXT_PUBLIC_SITE_URL: "https://vpn.example.com",
  NEXT_PUBLIC_SITE_NAME: "GickShop",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  TURNSTILE_SECRET_KEY: "",
  TELEGRAM_BOT_TOKEN: "",
  REMNAWAVE_BASE_URL: "https://panel.example.com",
  REMNAWAVE_API_TOKEN: "live-remnawave-token",
  YOOKASSA_ENABLED: "true",
  YOOKASSA_SHOP_ID: "shop-id",
  YOOKASSA_SECRET_KEY: "live-yookassa-secret",
  SMTP_HOST: "smtp",
  SMTP_PORT: "2525",
  SMTP_SECURE: "false",
  SMTP_USER: "",
  SMTP_PASS: "",
  EMAIL_FROM: "GickShop <notifications@mailer.example.net>",
  MAIL_DOMAIN: "mailer.example.net",
  MAIL_HOSTNAME: "mail.mailer.example.net",
  MAIL_DKIM_SELECTOR: "mail",
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

  it("normalizes siteUrl by trimming a trailing slash", async () => {
    setProcessEnv({
      NEXT_PUBLIC_SITE_URL: "https://vpn.example.com/"
    });

    const envModule = await import("@/lib/env");

    expect(envModule.env.NEXT_PUBLIC_SITE_URL).toBe("https://vpn.example.com/");
    expect(envModule.env.siteUrl).toBe("https://vpn.example.com");
  });

  it.each(["production", "development"])("rejects either missing Turnstile key in %s", async (nodeEnv) => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    for (const overrides of [
      { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET_KEY: " " },
      { NEXT_PUBLIC_TURNSTILE_SITE_KEY: " ", TURNSTILE_SECRET_KEY: "secret-key" }
    ]) {
      vi.resetModules();
      setProcessEnv({ NODE_ENV: nodeEnv, ...overrides });

      await expect(import("@/lib/env")).rejects.toThrow(
        "NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY must be set together"
      );
    }
  });

  it("allows both Turnstile keys to be empty", async () => {
    setProcessEnv({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: " ", TURNSTILE_SECRET_KEY: " " });

    const { env } = await import("@/lib/env");

    expect(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBe("");
    expect(env.TURNSTILE_SECRET_KEY).toBe("");
  });

  it("normalizes the Turnstile key pair", async () => {
    setProcessEnv({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: " site-key ", TURNSTILE_SECRET_KEY: " secret-key " });

    const { env } = await import("@/lib/env");

    expect(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBe("site-key");
    expect(env.TURNSTILE_SECRET_KEY).toBe("secret-key");
  });

  it("allows a public Turnstile key without the stripped secret during next build", async () => {
    setProcessEnv({ NEXT_PHASE: "phase-production-build", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key" });

    const { env } = await import("@/lib/env");

    expect(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBe("site-key");
    expect(env.TURNSTILE_SECRET_KEY).toBe("");
  });

  it("rejects partial SMTP auth settings", async () => {
    setProcessEnv({
      SMTP_USER: "notifications@example.com"
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("@/lib/env")).rejects.toThrow("Invalid environment configuration");
    expect(errorSpy).toHaveBeenCalledWith(
      "Invalid environment configuration",
      expect.objectContaining({
        SMTP_PASS: [expect.stringContaining("must be set together")]
      })
    );
  });

  it("rejects placeholder self-hosted mail domains in production", async () => {
    setProcessEnv({
      MAIL_DOMAIN: "example.com",
      MAIL_HOSTNAME: "mail.example.com",
      EMAIL_FROM: "GickShop <notifications@example.com>"
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("@/lib/env")).rejects.toThrow("Invalid environment configuration");
    expect(errorSpy).toHaveBeenCalledWith(
      "Invalid environment configuration",
      expect.objectContaining({
        MAIL_DOMAIN: [expect.stringContaining("replace it with your real mail domain")],
        MAIL_HOSTNAME: [expect.stringContaining("replace it with your real mail domain")]
      })
    );
  });

  it("allows disabled payment providers in production without their secrets", async () => {
    setProcessEnv({
      YOOKASSA_ENABLED: "false",
      YOOKASSA_SHOP_ID: "",
      YOOKASSA_SECRET_KEY: ""
    });

    const envModule = await import("@/lib/env");

    expect(envModule.env.YOOKASSA_ENABLED).toBe(false);
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
