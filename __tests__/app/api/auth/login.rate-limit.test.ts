import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoginUser, mockSetSessionCookie, mockSignSession } = vi.hoisted(() => ({
  mockLoginUser: vi.fn(),
  mockSignSession: vi.fn(),
  mockSetSessionCookie: vi.fn()
}));

vi.mock("@/lib/services/auth", () => ({
  loginUser: mockLoginUser
}));

vi.mock("@/lib/auth/session", () => ({
  signSession: mockSignSession,
  setSessionCookie: mockSetSessionCookie
}));

function buildRequest(ip: string) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip
    },
    body: JSON.stringify({
      email: "user@example.com",
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
      role: "USER"
    });
    mockSignSession.mockResolvedValue("session-token");
    mockSetSessionCookie.mockResolvedValue(undefined);
  });

  it("returns 429 on the 11th request from the same ip", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await POST(buildRequest("203.0.113.10"));

      expect(response.status).toBe(200);
    }

    const response = await POST(buildRequest("203.0.113.10"));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Слишком много попыток, попробуйте позже"
    });
    expect(mockLoginUser).toHaveBeenCalledTimes(10);
  });
});
