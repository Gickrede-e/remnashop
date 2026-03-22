import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    REMNAWAVE_BASE_URL: "https://your-panel.example.com",
    REMNAWAVE_API_TOKEN: "placeholder_token",
    YOOKASSA_SHOP_ID: "123456",
    YOOKASSA_SECRET_KEY: "test_secret_key",
    PLATEGA_API_KEY: "platega_placeholder_key",
    PLATEGA_WEBHOOK_SECRET: "platega_placeholder_secret",
    PLATEGA_MERCHANT_ID: ""
  }
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { getProviderStatuses } from "@/lib/services/provider-status";

describe("getProviderStatuses", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    expect(result.map((item) => item.status)).toEqual([
      "not_configured",
      "not_configured",
      "not_configured"
    ]);
  });
});
