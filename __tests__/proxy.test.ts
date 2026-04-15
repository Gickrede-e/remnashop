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

  it("allows public pages and operational endpoints without a session", async () => {
    const pricingResponse = await proxy(createRequest("/pricing?plan=pro"));
    const homeResponse = await proxy(createRequest("/"));
    const loginResponse = await proxy(createRequest("/login"));
    const registerResponse = await proxy(createRequest("/register?ref=ALLY42"));
    const authResponse = await proxy(createRequest("/api/auth/login"));
    const healthResponse = await proxy(createRequest("/api/health"));
    const webhookResponse = await proxy(createRequest("/api/webhook/yookassa"));

    expect(pricingResponse.headers.get("location")).toBeNull();
    expect(homeResponse.headers.get("location")).toBeNull();
    expect(loginResponse.headers.get("location")).toBeNull();
    expect(registerResponse.headers.get("location")).toBeNull();
    expect(authResponse.headers.get("location")).toBeNull();
    expect(healthResponse.headers.get("location")).toBeNull();
    expect(webhookResponse.headers.get("location")).toBeNull();
    expect(verifySessionMock).not.toHaveBeenCalled();
  });

  it("redirects guests from dashboard routes to login with next path", async () => {
    const response = await proxy(createRequest("/dashboard/history?filter=recent"));

    expect(response.headers.get("location")).toBe(
      "https://example.com/login?next=%2Fdashboard%2Fhistory%3Ffilter%3Drecent"
    );
  });

  it("allows authenticated users through dashboard routes", async () => {
    verifySessionMock.mockResolvedValue({
      role: "USER"
    });

    const response = await proxy(createRequest("/dashboard/history", "valid-token"));

    expect(response.headers.get("location")).toBeNull();
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

    const response = await proxy(createRequest("/dashboard/buy", "bad-token"));

    expect(response.headers.get("location")).toBe("https://example.com/login?next=%2Fdashboard%2Fbuy");
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("");
  });
});
