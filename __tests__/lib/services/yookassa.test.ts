import { describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    YOOKASSA_SHOP_ID: "shop-id",
    YOOKASSA_SECRET_KEY: "secret-key"
  }
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

import { createYooKassaPayment, verifyYooKassaIp } from "@/lib/services/yookassa";

describe("createYooKassaPayment", () => {
  it("sends a 54-ФЗ receipt whose single line matches the payment amount", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "remote-1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createYooKassaPayment({
      amount: 28215,
      description: "GickShop — Тариф Start",
      paymentId: "payment-1",
      customerEmail: "buyer@example.com",
      returnUrl: "https://vpn.example.com/dashboard"
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.amount).toEqual({ value: "282.15", currency: "RUB" });
    expect(body.receipt).toEqual({
      customer: { email: "buyer@example.com" },
      items: [
        {
          description: "GickShop — Тариф Start",
          quantity: 1,
          amount: { value: "282.15", currency: "RUB" },
          vat_code: 1,
          payment_subject: "service",
          payment_mode: "full_payment",
          measure: "piece"
        }
      ]
    });
    vi.unstubAllGlobals();
  });
});

describe("verifyYooKassaIp", () => {
  it("matches exact IPv4 addresses", () => {
    expect(verifyYooKassaIp("77.75.156.11")).toBe(true);
  });

  it("matches IPv4 CIDR ranges", () => {
    expect(verifyYooKassaIp("185.71.76.10")).toBe(true);
  });

  it("matches IPv6 addresses", () => {
    expect(verifyYooKassaIp("2a02:5180::1234")).toBe(true);
  });

  it("matches IPv4-mapped IPv6 addresses", () => {
    expect(verifyYooKassaIp("::ffff:77.75.156.35")).toBe(true);
  });

  it("rejects invalid IP addresses", () => {
    expect(verifyYooKassaIp("not-an-ip")).toBe(false);
  });

  it("rejects non-matching IP addresses", () => {
    expect(verifyYooKassaIp("203.0.113.10")).toBe(false);
  });
});
