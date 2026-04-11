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

import { verifyYooKassaIp } from "@/lib/services/yookassa";

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
