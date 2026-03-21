import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "development",
    yookassaAllowedIps: [] as string[]
  }
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

import { verifyYooKassaIp } from "@/lib/services/yookassa";

describe("verifyYooKassaIp", () => {
  beforeEach(() => {
    mockEnv.NODE_ENV = "development";
    mockEnv.yookassaAllowedIps = [];
  });

  it("allows requests in development when the allowlist is empty", () => {
    expect(verifyYooKassaIp("1.2.3.4")).toBe(true);
  });

  it("rejects requests in production when the allowlist is empty", () => {
    mockEnv.NODE_ENV = "production";
    expect(verifyYooKassaIp("1.2.3.4")).toBe(false);
  });

  it("matches exact IPv4 addresses", () => {
    mockEnv.yookassaAllowedIps = ["1.2.3.4"];
    expect(verifyYooKassaIp("1.2.3.4")).toBe(true);
  });

  it("matches IPv4 CIDR ranges", () => {
    mockEnv.yookassaAllowedIps = ["10.0.0.0/24"];
    expect(verifyYooKassaIp("10.0.0.55")).toBe(true);
  });

  it("matches IPv6 addresses", () => {
    mockEnv.yookassaAllowedIps = ["2001:db8::1"];
    expect(verifyYooKassaIp("2001:db8::1")).toBe(true);
  });

  it("matches IPv4-mapped IPv6 addresses", () => {
    mockEnv.yookassaAllowedIps = ["192.168.1.0/24"];
    expect(verifyYooKassaIp("::ffff:192.168.1.99")).toBe(true);
  });

  it("rejects invalid IP addresses", () => {
    mockEnv.yookassaAllowedIps = ["1.2.3.4"];
    expect(verifyYooKassaIp("not-an-ip")).toBe(false);
  });

  it("rejects non-matching IP addresses", () => {
    mockEnv.yookassaAllowedIps = ["10.0.0.0/24"];
    expect(verifyYooKassaIp("10.0.1.1")).toBe(false);
  });
});
