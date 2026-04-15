import { Buffer } from "node:buffer";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, envReads } = vi.hoisted(() => {
  const state = {
    REMNAWAVE_BASE_URL: "https://your-panel.example.com",
    REMNAWAVE_API_TOKEN: "placeholder_token",
    YOOKASSA_ENABLED: true,
    YOOKASSA_SHOP_ID: "123456",
    YOOKASSA_SECRET_KEY: "test_secret_key",
    PLATEGA_ENABLED: true,
    PLATEGA_API_KEY: "platega_placeholder_key",
    PLATEGA_WEBHOOK_SECRET: "platega_placeholder_secret",
    PLATEGA_MERCHANT_ID: ""
  };
  const reads: string[] = [];

  return {
    envReads: reads,
    mockEnv: new Proxy(state, {
      get(target, property, receiver) {
        if (typeof property === "string") {
          reads.push(property);
        }

        return Reflect.get(target, property, receiver);
      }
    })
  };
});

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { getProviderStatuses } from "@/lib/services/provider-status";

function configureAllProviders() {
  mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
  mockEnv.REMNAWAVE_API_TOKEN = "real-token";
  mockEnv.YOOKASSA_ENABLED = true;
  mockEnv.YOOKASSA_SHOP_ID = "shop-id";
  mockEnv.YOOKASSA_SECRET_KEY = "secret";
  mockEnv.PLATEGA_ENABLED = true;
  mockEnv.PLATEGA_API_KEY = "platega-real-key";
  mockEnv.PLATEGA_WEBHOOK_SECRET = "platega-real-secret";
  mockEnv.PLATEGA_MERCHANT_ID = "merchant-1";
}

describe("getProviderStatuses", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    envReads.length = 0;
    mockEnv.REMNAWAVE_BASE_URL = "https://your-panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "placeholder_token";
    mockEnv.YOOKASSA_ENABLED = true;
    mockEnv.YOOKASSA_SHOP_ID = "123456";
    mockEnv.YOOKASSA_SECRET_KEY = "test_secret_key";
    mockEnv.PLATEGA_ENABLED = true;
    mockEnv.PLATEGA_API_KEY = "platega_placeholder_key";
    mockEnv.PLATEGA_WEBHOOK_SECRET = "platega_placeholder_secret";
    mockEnv.PLATEGA_MERCHANT_ID = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks placeholder providers as not_configured without calling fetch", async () => {
    mockEnv.PLATEGA_API_KEY = "your_platega_api_key";
    mockEnv.PLATEGA_WEBHOOK_SECRET = "your_platega_webhook_secret";

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getProviderStatuses();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(envReads).toEqual(
      expect.arrayContaining([
        "REMNAWAVE_BASE_URL",
        "REMNAWAVE_API_TOKEN",
        "YOOKASSA_ENABLED",
        "YOOKASSA_SHOP_ID",
        "YOOKASSA_SECRET_KEY",
        "PLATEGA_ENABLED",
        "PLATEGA_API_KEY",
        "PLATEGA_WEBHOOK_SECRET",
        "PLATEGA_MERCHANT_ID"
      ])
    );
    expect(result).toEqual([
      {
        label: "Remnawave",
        status: "not_configured",
        summary: "Не настроен",
        detail: "placeholder config",
        checkedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
        )
      },
      {
        label: "YooKassa",
        status: "not_configured",
        summary: "Не настроен",
        detail: "placeholder config",
        checkedAt: expect.any(String)
      },
      {
        label: "Platega",
        status: "not_configured",
        summary: "Не настроен",
        detail: "placeholder config",
        checkedAt: expect.any(String)
      }
    ]);
  });

  it("treats the documented Remnawave example token as not_configured", async () => {
    mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "your_remnawave_api_token";
    mockEnv.YOOKASSA_SHOP_ID = "shop-id";
    mockEnv.YOOKASSA_SECRET_KEY = "";
    mockEnv.PLATEGA_API_KEY = "";
    mockEnv.PLATEGA_WEBHOOK_SECRET = "";
    mockEnv.PLATEGA_MERCHANT_ID = "";

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getProviderStatuses();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.find((item) => item.label === "Remnawave")).toMatchObject({
      status: "not_configured",
      summary: "Не настроен",
      detail: "placeholder config"
    });
  });

  it("marks disabled payment providers as disabled without probing them", async () => {
    mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "real-token";
    mockEnv.YOOKASSA_ENABLED = false;
    mockEnv.YOOKASSA_SHOP_ID = "";
    mockEnv.YOOKASSA_SECRET_KEY = "";
    mockEnv.PLATEGA_ENABLED = false;
    mockEnv.PLATEGA_API_KEY = "";
    mockEnv.PLATEGA_WEBHOOK_SECRET = "";
    mockEnv.PLATEGA_MERCHANT_ID = "";

    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProviderStatuses();

    expect(result.find((item) => item.label === "YooKassa")).toMatchObject({
      status: "disabled",
      summary: "Выключен",
      detail: "module disabled by env flag"
    });
    expect(result.find((item) => item.label === "Platega")).toMatchObject({
      status: "disabled",
      summary: "Выключен",
      detail: "module disabled by env flag"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("marks providers as not_configured without probing when required values are empty", async () => {
    mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "";
    mockEnv.YOOKASSA_SHOP_ID = "shop-id";
    mockEnv.YOOKASSA_SECRET_KEY = "";
    mockEnv.PLATEGA_API_KEY = "";
    mockEnv.PLATEGA_WEBHOOK_SECRET = "platega-real-secret";
    mockEnv.PLATEGA_MERCHANT_ID = "merchant-1";

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getProviderStatuses();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.map((item) => item.status)).toEqual([
      "not_configured",
      "not_configured",
      "not_configured"
    ]);
  });

  it("marks a provider as available when the probe returns ok", async () => {
    mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "real-token";

    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProviderStatuses();

    expect(result.find((item) => item.label === "Remnawave")).toMatchObject({
      status: "available",
      summary: "Доступен",
      detail: "auth ok"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://panel.example.com/api/users",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer real-token"
        },
        cache: "no-store"
      })
    );
  });

  it("maps a timed out probe to timeout", async () => {
    mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "real-token";

    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    const result = await getProviderStatuses({ timeoutMs: 1 });

    expect(result.find((item) => item.label === "Remnawave")).toMatchObject({
      status: "timeout",
      summary: "Таймаут",
      detail: "request timed out after 1ms"
    });
  });

  it("keeps timeout classification when fetch rejects with AbortError after internal timeout abort", async () => {
    mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "real-token";

    vi.stubGlobal(
      "fetch",
      vi.fn((_, init?: RequestInit) => {
        const signal = init?.signal;

        return new Promise((_, reject) => {
          signal?.addEventListener(
            "abort",
            () => {
              const error = new Error("The operation was aborted.");
              error.name = "AbortError";
              reject(error);
            },
            { once: true }
          );
        });
      })
    );

    const result = await getProviderStatuses({ timeoutMs: 1 });

    expect(result.find((item) => item.label === "Remnawave")).toMatchObject({
      status: "timeout",
      summary: "Таймаут",
      detail: "request timed out after 1ms"
    });
  });

  it("records checkedAt when each probe finishes instead of reusing one batch timestamp", async () => {
    configureAllProviders();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T10:00:00.000Z"));

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        const delay = url.includes("panel.example.com")
          ? 10
          : url.includes("yookassa.ru")
            ? 20
            : 30;

        return new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(new Response("{}", { status: 200 }));
          }, delay);
        });
      })
    );

    const resultPromise = getProviderStatuses();

    await vi.advanceTimersByTimeAsync(30);

    const result = await resultPromise;
    const remnawave = result.find((item) => item.label === "Remnawave");
    const yookassa = result.find((item) => item.label === "YooKassa");
    const platega = result.find((item) => item.label === "Platega");

    expect(remnawave?.checkedAt).not.toBe(yookassa?.checkedAt);
    expect(yookassa?.checkedAt).not.toBe(platega?.checkedAt);
    expect(Date.parse(remnawave?.checkedAt ?? "")).toBeLessThan(
      Date.parse(yookassa?.checkedAt ?? "")
    );
    expect(Date.parse(yookassa?.checkedAt ?? "")).toBeLessThan(
      Date.parse(platega?.checkedAt ?? "")
    );
  });

  it("maps auth and transport failures to unavailable without crashing the aggregate", async () => {
    configureAllProviders();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401, statusText: "Unauthorized" }))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await getProviderStatuses();

    expect(result).toHaveLength(3);
    expect(result.find((item) => item.label === "Remnawave")).toMatchObject({
      status: "unavailable",
      summary: "Недоступен",
      detail: "401 Unauthorized"
    });
    expect(result.find((item) => item.label === "YooKassa")).toMatchObject({
      status: "unavailable",
      summary: "Недоступен",
      detail: "fetch failed"
    });
    expect(result.find((item) => item.label === "Platega")).toMatchObject({
      status: "available",
      summary: "Доступен",
      detail: "auth ok"
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://panel.example.com/api/users",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer real-token"
        },
        cache: "no-store"
      })
    );

    // YooKassa docs expose GET /v3/payments as a read-only authenticated listing endpoint.
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.yookassa.ru/v3/payments?limit=1",
      expect.objectContaining({
        headers: {
          Authorization: `Basic ${Buffer.from("shop-id:secret", "utf8").toString("base64")}`
        },
        cache: "no-store"
      })
    );

    const plategaCall = fetchMock.mock.calls[2];
    const plategaUrl = new URL(String(plategaCall?.[0]));
    const plategaInit = plategaCall?.[1] as RequestInit | undefined;

    // Platega docs expose GET /transaction/balance-unlock-operations with X-MerchantId/X-Secret.
    expect(plategaUrl.origin).toBe("https://app.platega.io");
    expect(plategaUrl.pathname).toBe("/transaction/balance-unlock-operations");
    expect(plategaUrl.searchParams.get("page")).toBe("1");
    expect(plategaUrl.searchParams.get("size")).toBe("1");
    expect(plategaUrl.searchParams.get("from")).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
    );
    expect(plategaUrl.searchParams.get("to")).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
    );
    expect(plategaInit).toEqual(
      expect.objectContaining({
      headers: {
        Accept: "text/plain",
        "X-MerchantId": "merchant-1",
        "X-Secret": "platega-real-key"
      },
      cache: "no-store"
      })
    );
  });
});
