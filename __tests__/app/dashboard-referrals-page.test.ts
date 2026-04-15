import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const getUserByIdMock = vi.hoisted(() => vi.fn());
const getMyReferralSummaryMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const mockEnv = vi.hoisted(() => ({
  siteUrl: "https://vpn.example.com"
}));

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

vi.mock("@/lib/services/auth", () => ({
  getUserById: getUserByIdMock
}));

vi.mock("@/lib/services/referrals", () => ({
  getMyReferralSummary: getMyReferralSummaryMock
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

import DashboardReferralsPage from "@/app/dashboard/referrals/page";

describe("dashboard referrals page", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getUserByIdMock.mockReset();
    getMyReferralSummaryMock.mockReset();
    redirectMock.mockReset();
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  it("renders the referral link from the canonical site url instead of localhost", async () => {
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

    expect(markup).toContain("https://vpn.example.com/register?ref=ALLY42");
    expect(markup).not.toContain("http://localhost:3000/register?ref=ALLY42");
  });
});
