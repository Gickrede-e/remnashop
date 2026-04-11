import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  verifySession: verifySessionMock
}));

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { proxy } from "@/proxy";

function createRequest(pathname: string, cookieValue?: string) {
  return new NextRequest(`https://example.com${pathname}`, {
    headers: cookieValue
      ? {
          cookie: `${SESSION_COOKIE_NAME}=${cookieValue}`
        }
      : undefined
  });
}

describe("proxy", () => {
  beforeEach(() => {
    verifySessionMock.mockReset();
  });

  it("redirects guests from public pages to login with next path", async () => {
    const response = await proxy(createRequest("/pricing?plan=pro"));

    expect(response.headers.get("location")).toBe("https://example.com/login?next=%2Fpricing%3Fplan%3Dpro");
  });

  it("redirects guests from the home page to login", async () => {
    const response = await proxy(createRequest("/"));

    expect(response.headers.get("location")).toBe("https://example.com/login?next=%2F");
  });

  it("allows auth pages and operational endpoints without a session", async () => {
    const loginResponse = await proxy(createRequest("/login"));
    const registerResponse = await proxy(createRequest("/register?ref=ALLY42"));
    const authResponse = await proxy(createRequest("/api/auth/login"));
    const healthResponse = await proxy(createRequest("/api/health"));
    const webhookResponse = await proxy(createRequest("/api/webhook/yookassa"));

    expect(loginResponse.headers.get("location")).toBeNull();
    expect(registerResponse.headers.get("location")).toBeNull();
    expect(authResponse.headers.get("location")).toBeNull();
    expect(healthResponse.headers.get("location")).toBeNull();
    expect(webhookResponse.headers.get("location")).toBeNull();
  });

  it("redirects non-admin users away from admin routes", async () => {
    verifySessionMock.mockResolvedValue({
      role: "USER"
    });

    const response = await proxy(createRequest("/admin", "valid-token"));

    expect(response.headers.get("location")).toBe("https://example.com/dashboard");
  });

  it("clears invalid session cookies and redirects to login", async () => {
    verifySessionMock.mockRejectedValue(new Error("bad token"));

    const response = await proxy(createRequest("/faq", "bad-token"));

    expect(response.headers.get("location")).toBe("https://example.com/login?next=%2Ffaq");
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("");
  });
});
