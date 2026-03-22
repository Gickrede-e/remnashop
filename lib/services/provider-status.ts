import { env } from "@/lib/env";

export type ProviderStatus = "available" | "timeout" | "unavailable" | "not_configured";

export type ProviderStatusRow = {
  label: string;
  status: ProviderStatus;
  summary: string;
  detail: string;
  checkedAt: string;
};

const placeholderConfig = {
  remnawaveBaseUrl: "https://your-panel.example.com",
  remnawaveApiToken: "placeholder_token",
  yookassaShopId: "123456",
  yookassaSecretKey: "test_secret_key",
  plategaApiKey: "platega_placeholder_key",
  plategaWebhookSecret: "platega_placeholder_secret",
  plategaMerchantId: ""
} as const;

function buildNotConfiguredRow(label: string, checkedAt: string): ProviderStatusRow {
  return {
    label,
    status: "not_configured",
    summary: "Не настроен",
    detail: "placeholder config",
    checkedAt
  };
}

function isPlaceholderConfig() {
  const remnawaveBaseUrl = env.REMNAWAVE_BASE_URL;
  const remnawaveApiToken = env.REMNAWAVE_API_TOKEN;
  const yookassaShopId = env.YOOKASSA_SHOP_ID;
  const yookassaSecretKey = env.YOOKASSA_SECRET_KEY;
  const plategaApiKey = env.PLATEGA_API_KEY;
  const plategaWebhookSecret = env.PLATEGA_WEBHOOK_SECRET;
  const plategaMerchantId = env.PLATEGA_MERCHANT_ID;

  return {
    remnawave:
      remnawaveBaseUrl === placeholderConfig.remnawaveBaseUrl ||
      remnawaveApiToken === placeholderConfig.remnawaveApiToken,
    yookassa:
      yookassaShopId === placeholderConfig.yookassaShopId ||
      yookassaSecretKey === placeholderConfig.yookassaSecretKey,
    platega:
      plategaApiKey === placeholderConfig.plategaApiKey ||
      plategaWebhookSecret === placeholderConfig.plategaWebhookSecret ||
      plategaMerchantId === placeholderConfig.plategaMerchantId
  } as const;
}

export async function getProviderStatuses(): Promise<ProviderStatusRow[]> {
  const checkedAt = new Date().toISOString();
  const placeholderFlags = isPlaceholderConfig();

  return [
    { label: "Remnawave", placeholder: placeholderFlags.remnawave },
    { label: "YooKassa", placeholder: placeholderFlags.yookassa },
    { label: "Platega", placeholder: placeholderFlags.platega }
  ].map(({ label }) => buildNotConfiguredRow(label, checkedAt));
}
