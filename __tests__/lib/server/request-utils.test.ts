import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { getClientIp, getWebhookClientIp } from "@/lib/server/request-utils";

describe("getClientIp", () => {
  it("returns x-real-ip set by Caddy", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-real-ip": "203.0.113.7"
      }
    });

    expect(getClientIp(request)).toBe("203.0.113.7");
  });

  it("ignores x-forwarded-for from clients", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "198.51.100.1, 10.0.0.1"
      }
    });

    expect(getClientIp(request)).toBe("");
  });

  it("returns empty string when no x-real-ip header is present", () => {
    const request = new NextRequest("http://localhost/api/test");

    expect(getClientIp(request)).toBe("");
  });
});

describe("getWebhookClientIp", () => {
  it("returns x-real-ip from Caddy", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-real-ip": "203.0.113.7"
      }
    });

    expect(getWebhookClientIp(request)).toBe("203.0.113.7");
  });

  it("ignores attacker-supplied x-forwarded-for header", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "198.51.100.1, 10.0.0.1"
      }
    });

    expect(getWebhookClientIp(request)).toBe("");
  });
});
