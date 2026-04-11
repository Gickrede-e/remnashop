import "server-only";

import { z } from "zod";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProduction = NODE_ENV === "production";

const DEV_ENV_FALLBACKS = {
  DATABASE_URL: "postgresql://postgres:postgres@postgres:5432/gickvpn?schema=public",
  POSTGRES_DB: "gickvpn",
  POSTGRES_USER: "postgres",
  POSTGRES_PASSWORD: "postgres",
  JWT_SECRET: "development_only_change_me_to_a_long_secret",
  ADMIN_EMAILS: "",
  ADMIN_INITIAL_PASSWORD: "",
  NEXT_PUBLIC_SITE_URL: "https://vpn.example.com",
  NEXT_PUBLIC_SITE_NAME: "GickShop",
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: "",
  TELEGRAM_BOT_TOKEN: "",
  REMNAWAVE_BASE_URL: "https://your-panel.example.com",
  REMNAWAVE_API_TOKEN: "placeholder_token",
  YOOKASSA_SHOP_ID: "123456",
  YOOKASSA_SECRET_KEY: "test_secret_key",
  PLATEGA_API_KEY: "platega_placeholder_key",
  PLATEGA_MERCHANT_ID: "",
  PLATEGA_WEBHOOK_SECRET: "platega_placeholder_secret",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "notifications@example.com",
  SMTP_PASS: "change_me",
  EMAIL_FROM: "GickShop <notifications@example.com>",
  REFERRAL_REWARD_TYPE: "FREE_DAYS",
  REFERRAL_REWARD_VALUE: "3",
  CRON_SECRET: "change_me_internal_cron_secret"
} as const;

const EXAMPLE_ENV_PLACEHOLDERS = {
  JWT_SECRET: "REPLACE_WITH_OPENSSL_RAND_HEX_32",
  REMNAWAVE_API_TOKEN: "REPLACE_WITH_REMNAWAVE_API_TOKEN",
  YOOKASSA_SECRET_KEY: "REPLACE_WITH_YOOKASSA_SECRET_KEY",
  PLATEGA_API_KEY: "REPLACE_WITH_PLATEGA_API_KEY",
  PLATEGA_WEBHOOK_SECRET: "REPLACE_WITH_PLATEGA_WEBHOOK_SECRET",
  SMTP_PASS: "REPLACE_WITH_SMTP_PASSWORD",
  CRON_SECRET: "REPLACE_WITH_OPENSSL_RAND_HEX_16"
} as const;

const REQUIRED_SECRET_FIELDS = [
  "JWT_SECRET",
  "REMNAWAVE_API_TOKEN",
  "YOOKASSA_SECRET_KEY",
  "PLATEGA_API_KEY",
  "PLATEGA_WEBHOOK_SECRET",
  "SMTP_PASS",
  "CRON_SECRET"
] as const;

type RequiredSecretField = (typeof REQUIRED_SECRET_FIELDS)[number];

const requiredSecretFieldSet = new Set<RequiredSecretField>(REQUIRED_SECRET_FIELDS);

const KNOWN_PLACEHOLDERS = new Set<string>([
  DEV_ENV_FALLBACKS.JWT_SECRET,
  DEV_ENV_FALLBACKS.REMNAWAVE_API_TOKEN,
  DEV_ENV_FALLBACKS.YOOKASSA_SECRET_KEY,
  DEV_ENV_FALLBACKS.PLATEGA_API_KEY,
  DEV_ENV_FALLBACKS.PLATEGA_WEBHOOK_SECRET,
  DEV_ENV_FALLBACKS.SMTP_PASS,
  DEV_ENV_FALLBACKS.CRON_SECRET,
  EXAMPLE_ENV_PLACEHOLDERS.JWT_SECRET,
  EXAMPLE_ENV_PLACEHOLDERS.REMNAWAVE_API_TOKEN,
  EXAMPLE_ENV_PLACEHOLDERS.YOOKASSA_SECRET_KEY,
  EXAMPLE_ENV_PLACEHOLDERS.PLATEGA_API_KEY,
  EXAMPLE_ENV_PLACEHOLDERS.PLATEGA_WEBHOOK_SECRET,
  EXAMPLE_ENV_PLACEHOLDERS.SMTP_PASS,
  EXAMPLE_ENV_PLACEHOLDERS.CRON_SECRET
]);

function readEnvValue<K extends keyof typeof DEV_ENV_FALLBACKS>(key: K) {
  const value = process.env[key];

  if (isProduction && requiredSecretFieldSet.has(key as RequiredSecretField)) {
    return value ?? "";
  }

  return value ?? DEV_ENV_FALLBACKS[key];
}

function requiredSecret(field: RequiredSecretField, minLength = 1) {
  return z.string().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} is required in production`
      });
      return;
    }

    if (value.length < minLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} must be at least ${minLength} characters long`
      });
    }

    if (isProduction && KNOWN_PLACEHOLDERS.has(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} is set to a placeholder value — generate a real secret`
      });
    }
  });
}

const rawEnv = {
  NODE_ENV,
  DATABASE_URL: readEnvValue("DATABASE_URL"),
  POSTGRES_DB: readEnvValue("POSTGRES_DB"),
  POSTGRES_USER: readEnvValue("POSTGRES_USER"),
  POSTGRES_PASSWORD: readEnvValue("POSTGRES_PASSWORD"),
  JWT_SECRET: readEnvValue("JWT_SECRET"),
  ADMIN_EMAILS: readEnvValue("ADMIN_EMAILS"),
  ADMIN_INITIAL_PASSWORD: readEnvValue("ADMIN_INITIAL_PASSWORD"),
  NEXT_PUBLIC_SITE_URL: readEnvValue("NEXT_PUBLIC_SITE_URL"),
  NEXT_PUBLIC_SITE_NAME: readEnvValue("NEXT_PUBLIC_SITE_NAME"),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: readEnvValue("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME"),
  TELEGRAM_BOT_TOKEN: readEnvValue("TELEGRAM_BOT_TOKEN"),
  REMNAWAVE_BASE_URL: readEnvValue("REMNAWAVE_BASE_URL"),
  REMNAWAVE_API_TOKEN: readEnvValue("REMNAWAVE_API_TOKEN"),
  YOOKASSA_SHOP_ID: readEnvValue("YOOKASSA_SHOP_ID"),
  YOOKASSA_SECRET_KEY: readEnvValue("YOOKASSA_SECRET_KEY"),
  PLATEGA_API_KEY: readEnvValue("PLATEGA_API_KEY"),
  PLATEGA_MERCHANT_ID: readEnvValue("PLATEGA_MERCHANT_ID"),
  PLATEGA_WEBHOOK_SECRET: readEnvValue("PLATEGA_WEBHOOK_SECRET"),
  SMTP_HOST: readEnvValue("SMTP_HOST"),
  SMTP_PORT: readEnvValue("SMTP_PORT"),
  SMTP_SECURE: readEnvValue("SMTP_SECURE"),
  SMTP_USER: readEnvValue("SMTP_USER"),
  SMTP_PASS: readEnvValue("SMTP_PASS"),
  EMAIL_FROM: readEnvValue("EMAIL_FROM"),
  REFERRAL_REWARD_TYPE: readEnvValue("REFERRAL_REWARD_TYPE"),
  REFERRAL_REWARD_VALUE: readEnvValue("REFERRAL_REWARD_VALUE"),
  CRON_SECRET: readEnvValue("CRON_SECRET")
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  JWT_SECRET: requiredSecret("JWT_SECRET", 32),
  ADMIN_EMAILS: z.string().default(""),
  ADMIN_INITIAL_PASSWORD: z.string().default(""),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().default(""),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  REMNAWAVE_BASE_URL: z.string().url(),
  REMNAWAVE_API_TOKEN: requiredSecret("REMNAWAVE_API_TOKEN"),
  YOOKASSA_SHOP_ID: z.string().min(1),
  YOOKASSA_SECRET_KEY: requiredSecret("YOOKASSA_SECRET_KEY"),
  PLATEGA_API_KEY: requiredSecret("PLATEGA_API_KEY"),
  PLATEGA_MERCHANT_ID: z.string().default(""),
  PLATEGA_WEBHOOK_SECRET: requiredSecret("PLATEGA_WEBHOOK_SECRET"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: requiredSecret("SMTP_PASS"),
  EMAIL_FROM: z.string().min(1),
  REFERRAL_REWARD_TYPE: z.enum(["FREE_DAYS", "FREE_TRAFFIC_GB", "DISCOUNT_PERCENT"]).default("FREE_DAYS"),
  REFERRAL_REWARD_VALUE: z.coerce.number().int().positive().default(3),
  CRON_SECRET: requiredSecret("CRON_SECRET", 16)
});

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  const errorDetails = Object.entries(fieldErrors)
    .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`));

  console.error("Invalid environment configuration", fieldErrors);
  throw new Error(
    errorDetails.length > 0
      ? `Invalid environment configuration:\n${errorDetails.join("\n")}`
      : "Invalid environment configuration"
  );
}

const base = parsed.data;

export const env = {
  ...base,
  siteUrl: base.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ""),
  siteName: base.NEXT_PUBLIC_SITE_NAME,
  adminEmails: base.ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
};

export const publicEnv = {
  NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_NAME: env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
};

export function getAdminEmails() {
  return env.adminEmails;
}
