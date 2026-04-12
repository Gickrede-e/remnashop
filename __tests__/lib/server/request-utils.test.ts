import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { getClientIp } from "@/lib/server/request-utils";

describe("getClientIp", () => {
  it("returns first IP from x-forwarded-for", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "198.51.100.1, 10.0.0.1"
      }
    });

    expect(getClientIp(request)).toBe("198.51.100.1");
  });

  it("falls back to x-real-ip", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-real-ip": "203.0.113.7"
      }
    });

    expect(getClientIp(request)).toBe("203.0.113.7");
  });

  it("returns empty string when no IP headers are present", () => {
    const request = new NextRequest("http://localhost/api/test");

    expect(getClientIp(request)).toBe("");
  });
});
