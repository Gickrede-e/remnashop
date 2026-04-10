import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClearSessionCookie } = vi.hoisted(() => ({
  mockClearSessionCookie: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  clearSessionCookie: mockClearSessionCookie
}));

import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects browser form submissions to login", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Content-Type": "application/x-www-form-urlencoded"
        }
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
    expect(mockClearSessionCookie).toHaveBeenCalledOnce();
  });

  it("keeps JSON responses for fetch-based logout buttons", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: {
          Accept: "*/*"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.success).toBe(true);
    expect(mockClearSessionCookie).toHaveBeenCalledOnce();
  });
});
