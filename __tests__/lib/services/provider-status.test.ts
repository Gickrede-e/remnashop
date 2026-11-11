import { Buffer } from "node:buffer";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, envReads } = vi.hoisted(() => {
  const state = {
    REMNAWAVE_BASE_URL: "https://your-panel.example.com",
    REMNAWAVE_API_TOKEN: "placeholder_token",
    YOOKASSA_ENABLED: true,
    YOOKASSA_SHOP_ID: "123456",
    YOOKASSA_SECRET_KEY: "test_secret_key",
    PLATEGA_ENABLED: false,
    PLATEGA_MERCHANT_ID: "",
    PLATEGA_API_KEY: ""
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks placeholder providers as not_configured without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getProviderStatuses();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(envReads).toEqual(
      expect.arrayContaining([
        "REMNAWAVE_BASE_URL",
        "REMNAWAVE_API_TOKEN",
        "YOOKASSA_ENABLED",
        "YOOKASSA_SHOP_ID",
        "YOOKASSA_SECRET_KEY"
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
        status: "disabled",
        summary: "Выключен",
        detail: "module disabled by env flag",
        checkedAt: expect.any(String)
      }
    ]);
  });

  it("treats the documented Remnawave example token as not_configured", async () => {
    mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "your_remnawave_api_token";
    mockEnv.YOOKASSA_SHOP_ID = "shop-id";
    mockEnv.YOOKASSA_SECRET_KEY = "";

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

    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProviderStatuses();

    expect(result.find((item) => item.label === "YooKassa")).toMatchObject({
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

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getProviderStatuses();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.map((item) => item.status)).toEqual([
      "not_configured",
      "not_configured",
      "disabled"
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
        const delay = url.includes("panel.example.com") ? 10 : 20;

        return new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(new Response("{}", { status: 200 }));
          }, delay);
        });
      })
    );

    const resultPromise = getProviderStatuses();

    await vi.advanceTimersByTimeAsync(20);

    const result = await resultPromise;
    const remnawave = result.find((item) => item.label === "Remnawave");
    const yookassa = result.find((item) => item.label === "YooKassa");

    expect(remnawave?.checkedAt).not.toBe(yookassa?.checkedAt);
    expect(Date.parse(remnawave?.checkedAt ?? "")).toBeLessThan(
      Date.parse(yookassa?.checkedAt ?? "")
    );
  });

  it("maps auth and transport failures to unavailable without crashing the aggregate", async () => {
    configureAllProviders();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401, statusText: "Unauthorized" }))
      .mockRejectedValueOnce(new TypeError("fetch failed"));

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

    expect(fetchMock).toHaveBeenCalledTimes(2);

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
  });
});
