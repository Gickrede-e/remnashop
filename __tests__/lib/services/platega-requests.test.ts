import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, mockFetch } = vi.hoisted(() => ({
  mockEnv: {
    PLATEGA_WEBHOOK_SECRET: "platega-webhook-secret",
    PLATEGA_API_KEY: "platega-api-key",
    PLATEGA_MERCHANT_ID: "merchant-1"
  },
  mockFetch: vi.fn()
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

import { createPlategaPayment, getPlategaPaymentStatus } from "@/lib/services/platega";

describe("lib/services/platega request helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockEnv.PLATEGA_WEBHOOK_SECRET = "platega-webhook-secret";
    mockEnv.PLATEGA_API_KEY = "platega-api-key";
    mockEnv.PLATEGA_MERCHANT_ID = "merchant-1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a payment via the Platega API", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ payment_url: "https://pay.example.com/checkout" }), {
        status: 200
      })
    );

    await expect(
      createPlategaPayment({
        amount: 19900,
        description: "VPN Pro",
        paymentId: "payment-1",
        successUrl: "https://vpn.example.com/success",
        failUrl: "https://vpn.example.com/fail",
        webhookUrl: "https://vpn.example.com/webhook"
      })
    ).resolves.toEqual({
      payment_url: "https://pay.example.com/checkout"
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://platega.io/api/v1/payments",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer platega-api-key",
          "Content-Type": "application/json"
        })
      })
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1]?.body as string)).toEqual({
      amount: 199,
      currency: "RUB",
      order_id: "payment-1",
      payload: "payment-1",
      description: "VPN Pro",
      success_url: "https://vpn.example.com/success",
      fail_url: "https://vpn.example.com/fail",
      webhook_url: "https://vpn.example.com/webhook"
    });
  });

  it("treats empty successful responses as empty objects", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      createPlategaPayment({
        amount: 10000,
        description: "VPN",
        paymentId: "payment-2",
        successUrl: "https://vpn.example.com/success",
        failUrl: "https://vpn.example.com/fail",
        webhookUrl: "https://vpn.example.com/webhook"
      })
    ).resolves.toEqual({});
  });

  it("throws a detailed error when payment creation fails", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "denied" }), {
        status: 401
      })
    );

    await expect(
      createPlategaPayment({
        amount: 10000,
        description: "VPN",
        paymentId: "payment-1",
        successUrl: "https://vpn.example.com/success",
        failUrl: "https://vpn.example.com/fail",
        webhookUrl: "https://vpn.example.com/webhook"
      })
    ).rejects.toThrow('Platega request failed: 401 {"error":"denied"}');
  });

  it("throws a dedicated error when a success response contains invalid JSON", async () => {
    mockFetch.mockResolvedValue(new Response("not-json", { status: 200 }));

    await expect(
      createPlategaPayment({
        amount: 10000,
        description: "VPN",
        paymentId: "payment-3",
        successUrl: "https://vpn.example.com/success",
        failUrl: "https://vpn.example.com/fail",
        webhookUrl: "https://vpn.example.com/webhook"
      })
    ).rejects.toThrow("Platega request returned invalid JSON");
  });

  it("loads payment status with an explicit merchant id", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: "tx-1", status: "confirmed", merchantId: "merchant-2" }), {
        status: 200
      })
    );

    await expect(
      getPlategaPaymentStatus({
        transactionId: "tx-1",
        merchantId: "merchant-2"
      })
    ).resolves.toEqual({
      id: "tx-1",
      status: "confirmed",
      merchantId: "merchant-2"
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://app.platega.io/api/transaction/tx-1",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-MerchantId": "merchant-2",
          "X-Secret": "platega-api-key"
        }
      })
    );
  });

  it("requires a merchant id for manual status checks", async () => {
    mockEnv.PLATEGA_MERCHANT_ID = "";

    await expect(
      getPlategaPaymentStatus({
        transactionId: "tx-1",
        merchantId: null
      })
    ).rejects.toThrow("Для ручной проверки Platega нужен merchant id");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws a detailed error when status polling fails", async () => {
    mockFetch.mockResolvedValue(new Response("denied", { status: 502 }));

    await expect(
      getPlategaPaymentStatus({
        transactionId: "tx-1"
      })
    ).rejects.toThrow("Platega status request failed: 502 denied");
  });

  it("throws a dedicated error when status polling returns invalid JSON", async () => {
    mockFetch.mockResolvedValue(new Response("not-json", { status: 200 }));

    await expect(
      getPlategaPaymentStatus({
        transactionId: "tx-1"
      })
    ).rejects.toThrow("Platega status request returned invalid JSON");
  });
});
