import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    CRON_SECRET: "cron-secret-value"
  }
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

import { apiError, apiOk, assertCronSecret, getPagination } from "@/lib/http";

describe("lib/http", () => {
  beforeEach(() => {
    mockEnv.CRON_SECRET = "cron-secret-value";
  });

  it("returns default pagination values", () => {
    expect(getPagination(new URLSearchParams())).toEqual({
      page: 1,
      limit: 20,
      skip: 0
    });
  });

  it("clamps pagination values into the supported range", () => {
    expect(getPagination(new URLSearchParams("page=0&limit=999"))).toEqual({
      page: 1,
      limit: 100,
      skip: 0
    });
  });

  it("accepts cron secrets from the dedicated header", () => {
    const request = new NextRequest("https://example.com/api/cron", {
      headers: {
        "x-cron-secret": "cron-secret-value"
      }
    });

    expect(assertCronSecret(request)).toBe(true);
  });

  it("accepts cron secrets from bearer auth", () => {
    const request = new NextRequest("https://example.com/api/cron", {
      headers: {
        authorization: "Bearer cron-secret-value"
      }
    });

    expect(assertCronSecret(request)).toBe(true);
  });

  it("rejects invalid cron secrets", () => {
    const request = new NextRequest("https://example.com/api/cron", {
      headers: {
        authorization: "Bearer wrong-secret"
      }
    });

    expect(assertCronSecret(request)).toBe(false);
  });

  it("wraps successful responses", async () => {
    const response = apiOk({ hello: "world" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        hello: "world"
      }
    });
  });

  it("wraps error responses with a custom status", async () => {
    const response = apiError("boom", 418);

    expect(response.status).toBe(418);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "boom",
      details: undefined
    });
  });
});
