import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const getUserByIdMock = vi.hoisted(() => vi.fn());
const getUserPaymentHistoryMock = vi.hoisted(() => vi.fn());
const syncUserSubscriptionMock = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/services/auth", () => ({
  getUserById: getUserByIdMock
}));

vi.mock("@/lib/services/payments", () => ({
  getUserPaymentHistory: getUserPaymentHistoryMock
}));

vi.mock("@/lib/services/subscriptions", () => ({
  syncUserSubscription: syncUserSubscriptionMock
}));

import DashboardPage from "@/app/dashboard/page";

describe("dashboard overview page", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getUserByIdMock.mockReset();
    getUserPaymentHistoryMock.mockReset();
    syncUserSubscriptionMock.mockReset();
    redirectMock.mockReset();
  });

  it("renders the overview without the header buy CTA", async () => {
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      role: "USER"
    });
    getUserByIdMock.mockResolvedValue({
      referralCode: "ALLY42",
      remnawaveUuid: null,
      remnawaveShortUuid: null,
      subscription: null
    });
    syncUserSubscriptionMock.mockResolvedValue(null);
    getUserPaymentHistoryMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain("Обзор");
    expect(markup).toContain("Последние операции");
    expect(markup).not.toContain("КУПИТЬ ПОДПИСКУ");
    expect(markup).not.toContain('class="dashPageHeaderAction"');
  });
});
