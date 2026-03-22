import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, envReads } = vi.hoisted(() => {
  const state = {
    REMNAWAVE_BASE_URL: "https://your-panel.example.com",
    REMNAWAVE_API_TOKEN: "placeholder_token",
    YOOKASSA_SHOP_ID: "123456",
    YOOKASSA_SECRET_KEY: "test_secret_key",
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

describe("getProviderStatuses", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    envReads.length = 0;
    mockEnv.REMNAWAVE_BASE_URL = "https://your-panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "placeholder_token";
    mockEnv.YOOKASSA_SHOP_ID = "123456";
    mockEnv.YOOKASSA_SECRET_KEY = "test_secret_key";
    mockEnv.PLATEGA_API_KEY = "platega_placeholder_key";
    mockEnv.PLATEGA_WEBHOOK_SECRET = "platega_placeholder_secret";
    mockEnv.PLATEGA_MERCHANT_ID = "";
  });

  it("marks placeholder providers as not_configured without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getProviderStatuses();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(envReads).toEqual(
      expect.arrayContaining([
        "REMNAWAVE_BASE_URL",
        "REMNAWAVE_API_TOKEN",
        "YOOKASSA_SHOP_ID",
        "YOOKASSA_SECRET_KEY",
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
    expect(result[0]?.checkedAt).toBe(result[1]?.checkedAt);
    expect(result[1]?.checkedAt).toBe(result[2]?.checkedAt);
  });

  it("marks configured providers as unavailable until probe logic exists", async () => {
    mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "real-token";

    const result = await getProviderStatuses();

    expect(result).toEqual([
      {
        label: "Remnawave",
        status: "unavailable",
        summary: "Недоступен",
        detail: "probe pending",
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
    expect(result[0]?.status).not.toBe("not_configured");
  });
});
