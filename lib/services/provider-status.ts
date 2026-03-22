import { Buffer } from "node:buffer";

import { env } from "@/lib/env";

export type ProviderStatus = "available" | "timeout" | "unavailable" | "not_configured";

export type ProviderStatusRow = {
  label: string;
  status: ProviderStatus;
  summary: string;
  detail: string;
  checkedAt: string;
};

type GetProviderStatusesOptions = {
  timeoutMs?: number;
};

type ProviderProbe = {
  label: ProviderStatusRow["label"];
  isConfigured: boolean;
  run: (signal: AbortSignal) => Promise<Response>;
};

const DEFAULT_TIMEOUT_MS = 2500;

const placeholderConfig = {
  remnawaveBaseUrls: ["https://your-panel.example.com"],
  remnawaveApiTokens: ["placeholder_token"],
  yookassaShopIds: ["123456"],
  yookassaSecretKeys: ["test_secret_key"],
  plategaApiKeys: ["platega_placeholder_key", "your_platega_api_key"],
  plategaWebhookSecrets: ["platega_placeholder_secret", "your_platega_webhook_secret"]
} as const;

class ProbeTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`request timed out after ${timeoutMs}ms`);
    this.name = "ProbeTimeoutError";
  }
}

function getCheckedAt() {
  return new Date().toISOString();
}

function buildStatus(
  label: string,
  status: ProviderStatus,
  summary: string,
  detail: string,
  checkedAt = getCheckedAt()
): ProviderStatusRow {
  return {
    label,
    status,
    summary,
    detail,
    checkedAt
  };
}

function buildNotConfiguredRow(label: string) {
  return buildStatus(label, "not_configured", "Не настроен", "placeholder config");
}

function buildUnavailableRow(label: string, detail: string, checkedAt?: string) {
  return buildStatus(label, "unavailable", "Недоступен", detail, checkedAt);
}

function hasPlaceholderValue(value: string, placeholders: readonly string[]) {
  return placeholders.includes(value);
}

function isMissingValue(value: string) {
  return value.trim().length === 0;
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getYooKassaAuthHeader() {
  const token = Buffer.from(
    `${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`,
    "utf8"
  ).toString("base64");
  return `Basic ${token}`;
}

function getPlaceholderFlags() {
  const remnawaveBaseUrl = env.REMNAWAVE_BASE_URL;
  const remnawaveApiToken = env.REMNAWAVE_API_TOKEN;
  const yookassaShopId = env.YOOKASSA_SHOP_ID;
  const yookassaSecretKey = env.YOOKASSA_SECRET_KEY;
  const plategaApiKey = env.PLATEGA_API_KEY;
  const plategaWebhookSecret = env.PLATEGA_WEBHOOK_SECRET;
  const plategaMerchantId = env.PLATEGA_MERCHANT_ID;

  return {
    remnawave:
      isMissingValue(remnawaveBaseUrl) ||
      isMissingValue(remnawaveApiToken) ||
      hasPlaceholderValue(remnawaveBaseUrl, placeholderConfig.remnawaveBaseUrls) ||
      hasPlaceholderValue(remnawaveApiToken, placeholderConfig.remnawaveApiTokens),
    yookassa:
      isMissingValue(yookassaShopId) ||
      isMissingValue(yookassaSecretKey) ||
      hasPlaceholderValue(yookassaShopId, placeholderConfig.yookassaShopIds) ||
      hasPlaceholderValue(yookassaSecretKey, placeholderConfig.yookassaSecretKeys),
    platega:
      isMissingValue(plategaApiKey) ||
      isMissingValue(plategaWebhookSecret) ||
      isMissingValue(plategaMerchantId) ||
      hasPlaceholderValue(plategaApiKey, placeholderConfig.plategaApiKeys) ||
      hasPlaceholderValue(plategaWebhookSecret, placeholderConfig.plategaWebhookSecrets) ||
      !plategaMerchantId
  } as const;
}

function createProviderProbes() {
  const placeholderFlags = getPlaceholderFlags();

  return [
    {
      label: "Remnawave",
      isConfigured: !placeholderFlags.remnawave,
      run: (signal) =>
        fetch(`${stripTrailingSlash(env.REMNAWAVE_BASE_URL)}/api/users`, {
          headers: {
            Authorization: `Bearer ${env.REMNAWAVE_API_TOKEN}`
          },
          cache: "no-store",
          signal
        })
    },
    {
      label: "YooKassa",
      isConfigured: !placeholderFlags.yookassa,
      // YooKassa docs expose GET /v3/payments as a read-only listing endpoint with HTTP Basic auth.
      run: (signal) =>
        fetch("https://api.yookassa.ru/v3/payments?limit=1", {
          headers: {
            Authorization: getYooKassaAuthHeader()
          },
          cache: "no-store",
          signal
        })
    },
    {
      label: "Platega",
      isConfigured: !placeholderFlags.platega,
      // Platega docs expose GET /transaction/balance-unlock-operations with X-MerchantId/X-Secret.
      run: (signal) => {
        const to = new Date().toISOString();
        const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const query = new URLSearchParams({
          from,
          to,
          page: "1",
          size: "1"
        });

        return fetch(`https://app.platega.io/transaction/balance-unlock-operations?${query}`, {
          headers: {
            "X-MerchantId": env.PLATEGA_MERCHANT_ID,
            "X-Secret": env.PLATEGA_API_KEY,
            Accept: "text/plain"
          },
          cache: "no-store",
          signal
        });
      }
    }
  ] satisfies ProviderProbe[];
}

async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let didTimeout = false;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      reject(new ProbeTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([run(controller.signal), timeoutPromise]);
  } catch (error) {
    if (didTimeout && isAbortError(error)) {
      throw new ProbeTimeoutError(timeoutMs);
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function normalizeProbeError(label: string, error: unknown): ProviderStatusRow {
  if (error instanceof ProbeTimeoutError) {
    return buildStatus(label, "timeout", "Таймаут", error.message);
  }

  if (error instanceof Error) {
    return buildUnavailableRow(label, error.message);
  }

  return buildUnavailableRow(label, String(error));
}

async function probeWithTimeout(
  label: string,
  run: (signal: AbortSignal) => Promise<Response>,
  timeoutMs: number
): Promise<ProviderStatusRow> {
  try {
    const response = await withTimeout(run, timeoutMs);

    return response.ok
      ? buildStatus(label, "available", "Доступен", "auth ok")
      : buildUnavailableRow(label, `${response.status} ${response.statusText}`.trim());
  } catch (error) {
    return normalizeProbeError(label, error);
  }
}

export async function getProviderStatuses(
  options: GetProviderStatusesOptions = {}
): Promise<ProviderStatusRow[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const probes = createProviderProbes();
  const settled = await Promise.allSettled(
    probes.map((probe) =>
      probe.isConfigured
        ? probeWithTimeout(probe.label, probe.run, timeoutMs)
        : Promise.resolve(buildNotConfiguredRow(probe.label))
    )
  );

  return settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const label = probes[index]?.label ?? "Unknown";
    const detail = result.reason instanceof Error ? result.reason.message : String(result.reason);
    return buildUnavailableRow(label, detail);
  });
}
