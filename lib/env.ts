import "server-only";

import { z } from "zod";

const rawEnv = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@postgres:5432/gickvpn?schema=public",
  POSTGRES_DB: process.env.POSTGRES_DB ?? "gickvpn",
  POSTGRES_USER: process.env.POSTGRES_USER ?? "postgres",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "postgres",
  JWT_SECRET: process.env.JWT_SECRET ?? "development_only_change_me_to_a_long_secret",
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "",
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://vpn.example.com",
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME ?? "GickVPN",
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "",
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? "",
  REMNAWAVE_BASE_URL: process.env.REMNAWAVE_BASE_URL ?? "https://your-panel.example.com",
  REMNAWAVE_API_TOKEN: process.env.REMNAWAVE_API_TOKEN ?? "placeholder_token",
  YOOKASSA_SHOP_ID: process.env.YOOKASSA_SHOP_ID ?? "123456",
  YOOKASSA_SECRET_KEY: process.env.YOOKASSA_SECRET_KEY ?? "test_secret_key",
  YOOKASSA_WEBHOOK_SECRET: process.env.YOOKASSA_WEBHOOK_SECRET ?? "change_me_query_secret",
  YOOKASSA_ALLOWED_IPS: process.env.YOOKASSA_ALLOWED_IPS ?? "",
  PLATEGA_API_KEY: process.env.PLATEGA_API_KEY ?? "platega_placeholder_key",
  PLATEGA_WEBHOOK_SECRET: process.env.PLATEGA_WEBHOOK_SECRET ?? "platega_placeholder_secret",
  SMTP_HOST: process.env.SMTP_HOST ?? "smtp.example.com",
  SMTP_PORT: process.env.SMTP_PORT ?? "587",
  SMTP_SECURE: process.env.SMTP_SECURE ?? "false",
  SMTP_USER: process.env.SMTP_USER ?? "notifications@example.com",
  SMTP_PASS: process.env.SMTP_PASS ?? "change_me",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "GickVPN <notifications@example.com>",
  REFERRAL_REWARD_TYPE: process.env.REFERRAL_REWARD_TYPE ?? "FREE_DAYS",
  REFERRAL_REWARD_VALUE: process.env.REFERRAL_REWARD_VALUE ?? "3",
  CRON_SECRET: process.env.CRON_SECRET ?? "change_me_internal_cron_secret"
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ADMIN_EMAILS: z.string().default(""),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().default(""),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  REMNAWAVE_BASE_URL: z.string().url(),
  REMNAWAVE_API_TOKEN: z.string().min(1),
  YOOKASSA_SHOP_ID: z.string().min(1),
  YOOKASSA_SECRET_KEY: z.string().min(1),
  YOOKASSA_WEBHOOK_SECRET: z.string().min(1),
  YOOKASSA_ALLOWED_IPS: z.string().default(""),
  PLATEGA_API_KEY: z.string().min(1),
  PLATEGA_WEBHOOK_SECRET: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  REFERRAL_REWARD_TYPE: z.enum(["FREE_DAYS", "FREE_TRAFFIC_GB", "DISCOUNT_PERCENT"]).default("FREE_DAYS"),
  REFERRAL_REWARD_VALUE: z.coerce.number().int().positive().default(3),
  CRON_SECRET: z.string().min(16)
});

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

const base = parsed.data;

export const env = {
  ...base,
  siteUrl: base.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ""),
  siteName: base.NEXT_PUBLIC_SITE_NAME,
  adminEmails: base.ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  yookassaAllowedIps: base.YOOKASSA_ALLOWED_IPS.split(",")
    .map((ip) => ip.trim())
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
