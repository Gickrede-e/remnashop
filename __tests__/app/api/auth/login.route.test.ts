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

describe("POST /api/auth/login", () => {
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

  it("returns x-request-id when the route runs through withApiLogging", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10",
          "x-request-id": "req-login-1"
        },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req-login-1");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
          role: "USER"
        }
      }
    });
  });
});
