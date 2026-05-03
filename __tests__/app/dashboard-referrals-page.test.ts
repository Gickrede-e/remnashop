import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const getUserByIdMock = vi.hoisted(() => vi.fn());
const getMyReferralSummaryMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    redirect: redirectMock
  };
});

vi.mock("@/lib/auth/session", () => ({
  getSession: getSessionMock
}));

vi.mock("@/lib/env", () => ({
  env: {
    siteUrl: "https://vpn.example.com"
  }
}));

vi.mock("@/lib/services/auth", () => ({
  getUserById: getUserByIdMock
}));

vi.mock("@/lib/services/referrals", () => ({
  getMyReferralSummary: getMyReferralSummaryMock
}));

import DashboardReferralsPage from "@/app/dashboard/referrals/page";

describe("dashboard referrals page", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getUserByIdMock.mockReset();
    getMyReferralSummaryMock.mockReset();
    redirectMock.mockReset();
  });

  it("renders the referral link using the canonical site url", async () => {
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      role: "USER"
    });
    getUserByIdMock.mockResolvedValue({
      referralCode: "ALLY42"
    });
    getMyReferralSummaryMock.mockResolvedValue({
      referredUsers: [],
      rewards: []
    });

    const markup = renderToStaticMarkup(await DashboardReferralsPage());

    expect(markup).toContain("Рефералы");
    expect(markup).toContain("https://vpn.example.com/register?ref=ALLY42");
    expect(markup).not.toContain("https://vpn.example.com//register");
    expect(getMyReferralSummaryMock).toHaveBeenCalledWith("user-1");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login", async () => {
    getSessionMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(DashboardReferralsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
