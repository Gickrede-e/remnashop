import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoginUser, mockIssueSessionCookie } = vi.hoisted(() => ({
  mockLoginUser: vi.fn(),
  mockIssueSessionCookie: vi.fn()
}));

vi.mock("@/lib/services/auth", () => ({
  loginUser: mockLoginUser
}));

vi.mock("@/lib/auth/session", () => ({
  issueSessionCookie: mockIssueSessionCookie
}));

// The app trusts only X-Real-IP (X-Forwarded-For is deliberately ignored), so set
// that header for the per-IP bucket. Email varies per test to isolate the two caps.
function buildRequest(ip: string, email = "user@example.com") {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": ip
    },
    body: JSON.stringify({
      email,
      password: "password123"
    })
  });
}

describe("POST /api/auth/login rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockLoginUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      role: "USER",
      sessionVersion: 0
    });
    mockIssueSessionCookie.mockResolvedValue(undefined);
  });

  it("returns 429 on the 6th attempt against the same account (per-account cap)", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    // 5 allowed attempts against one email, then the per-account lockout trips —
    // independent of source IP, so a distributed brute-force can't spread past it.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await POST(buildRequest(`203.0.113.${attempt}`, "victim@example.com"));
      expect(response.status).toBe(200);
    }

    const response = await POST(buildRequest("203.0.113.99", "victim@example.com"));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Слишком много попыток, попробуйте позже"
    });
    expect(mockLoginUser).toHaveBeenCalledTimes(5);
  });

  it("returns 429 on the 11th request from the same ip (per-IP burst cap)", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    // Vary the email each request so the per-account cap doesn't trip first, leaving
    // the per-IP burst cap (10/min) as the limiter under test.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await POST(buildRequest("203.0.113.10", `user${attempt}@example.com`));
      expect(response.status).toBe(200);
    }

    const response = await POST(buildRequest("203.0.113.10", "user-final@example.com"));

    expect(response.status).toBe(429);
    expect(mockLoginUser).toHaveBeenCalledTimes(10);
  });
});
