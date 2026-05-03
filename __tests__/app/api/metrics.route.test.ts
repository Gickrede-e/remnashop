import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { CRON_SECRET: "test-secret-1234567890ab" }
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("server-only", () => ({}));

describe("GET /api/metrics", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects requests without CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/metrics/route");
    const response = await GET(new NextRequest("http://localhost/api/metrics"));
    expect(response.status).toBe(401);
  });

  it("rejects requests with the wrong secret", async () => {
    const { GET } = await import("@/app/api/metrics/route");
    const response = await GET(
      new NextRequest("http://localhost/api/metrics", {
        headers: { "x-cron-secret": "wrong" }
      })
    );
    expect(response.status).toBe(401);
  });

  it("returns Prometheus exposition text with the configured secret", async () => {
    const { GET } = await import("@/app/api/metrics/route");
    const response = await GET(
      new NextRequest("http://localhost/api/metrics", {
        headers: { "x-cron-secret": mockEnv.CRON_SECRET }
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/text\/plain/);
    const body = await response.text();
    // Default Node metrics + at least one of our app counters should be present.
    expect(body).toContain("gickshop_");
    expect(body).toMatch(/# HELP gickshop_webhook_received_total/);
  });
});
