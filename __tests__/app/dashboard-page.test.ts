import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const getUserByIdMock = vi.hoisted(() => vi.fn());
const getUserPaymentHistoryMock = vi.hoisted(() => vi.fn());
const syncUserSubscriptionForDashboardMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const mockPublicEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_SUPPORT_TELEGRAM_URL: ""
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    redirect: redirectMock,
    useRouter: () => ({
      push: vi.fn(),
      refresh: vi.fn()
    })
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
  syncUserSubscriptionForDashboard: syncUserSubscriptionForDashboardMock
}));

vi.mock("@/lib/public-env", () => ({
  publicEnv: mockPublicEnv
}));

import DashboardPage from "@/app/dashboard/page";

describe("dashboard overview page", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getUserByIdMock.mockReset();
    getUserPaymentHistoryMock.mockReset();
    syncUserSubscriptionForDashboardMock.mockReset();
    redirectMock.mockReset();
    mockPublicEnv.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL = "";
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
    syncUserSubscriptionForDashboardMock.mockResolvedValue({
      user: null,
      externalSubscriptionUrl: null
    });
    getUserPaymentHistoryMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain("Подписка");
    expect(markup).not.toContain("Последние операции");
    expect(markup).not.toContain("КУПИТЬ ПОДПИСКУ");
    expect(markup).not.toContain('class="dashPageHeaderAction"');
    expect(getUserPaymentHistoryMock).not.toHaveBeenCalled();
  });

  it("renders the live Remnawave subscriptionUrl instead of rebuilding /api/sub locally", async () => {
    mockPublicEnv.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL = "https://t.me/gick_support";
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      role: "USER"
    });
    getUserByIdMock.mockResolvedValue({
      referralCode: "ALLY42",
      remnawaveUuid: "rw-1",
      remnawaveShortUuid: "short-1",
      subscription: {
        status: "ACTIVE",
        expiresAt: new Date("2026-05-01T00:00:00.000Z"),
        trafficLimitBytes: 161061273600n,
        trafficUsedBytes: 0n,
        plan: {
          name: "Про"
        }
      }
    });
    syncUserSubscriptionForDashboardMock.mockResolvedValue({
      user: {
        remnawaveUuid: "rw-1",
        remnawaveShortUuid: "short-1",
        subscription: {
          status: "ACTIVE",
          expiresAt: new Date("2026-05-01T00:00:00.000Z"),
          trafficLimitBytes: 161061273600n,
          trafficUsedBytes: 0n,
          plan: {
            name: "Про"
          }
        }
      },
      externalSubscriptionUrl: "https://sub.example.com/client-access"
    });
    getUserPaymentHistoryMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain('href="https://sub.example.com/client-access"');
    expect(markup).toContain('href="https://t.me/gick_support"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
    expect(markup).toContain("Поддержка");
    expect(markup).not.toContain("/api/sub/short-1");
  });
});
