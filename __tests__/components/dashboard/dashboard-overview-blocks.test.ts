import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

import { DashboardOverviewBlocks } from "@/components/blocks/dashboard/dashboard-overview-blocks";
import { formatBytes, formatDateTime } from "@/lib/utils";

const TestableDashboardOverviewBlocks = DashboardOverviewBlocks as React.ComponentType<{
  subscription: {
    status: "ACTIVE" | "PENDING" | "EXPIRED" | "DISABLED";
    planName: string | null;
    expiresAt: Date | null;
    trafficLimitBytes: bigint | null;
    trafficUsedBytes: bigint | null;
  } | null;
  recentPayments: Array<{
    id: string;
    userInitial: string;
    userLabel: string;
    createdAt: Date;
    status: "completed" | "pending" | "process" | "failed";
  }>;
  referralLink: string;
  externalSubscriptionUrl: string | null;
  remnawaveUuid: string | null;
}>;

describe("dashboard overview blocks", () => {
  it("renders the AdminHub-style overview shell", () => {
    const subscription = {
      status: "ACTIVE" as const,
      planName: "Pro 90",
      expiresAt: new Date("2026-05-01T00:00:00.000Z"),
      trafficLimitBytes: 120n * 1024n * 1024n * 1024n,
      trafficUsedBytes: 48n * 1024n * 1024n * 1024n
    };

    const markup = renderToStaticMarkup(
      React.createElement(TestableDashboardOverviewBlocks, {
        subscription,
        recentPayments: [
          {
            id: "payment-1",
            userInitial: "U",
            userLabel: "user@example.com",
            createdAt: new Date("2026-04-10T09:30:00.000Z"),
            status: "completed"
          }
        ],
        referralLink: "https://example.com/register?ref=ALLY42",
        externalSubscriptionUrl: "https://example.com/subscription",
        remnawaveUuid: "uuid-1"
      })
    );

    expect(markup).toMatch(/class="[^"]*\bdashWorkspace\b[^"]*\bdashOverview\b[^"]*"/);
    expect(markup).toContain('class="dashStatGrid"');
    expect(markup.match(/class="dashStatTile"/g) ?? []).toHaveLength(3);
    expect(markup).toContain("СТАТУС");
    expect(markup).toContain("Активна");
    expect(markup).toContain("ДОСТУП ДО");
    expect(markup).toContain(formatDateTime(subscription.expiresAt));
    expect(markup).toContain("ТРАФИК");
    expect(markup).toContain(
      `${formatBytes(subscription.trafficUsedBytes)} / ${formatBytes(subscription.trafficLimitBytes)}`
    );
    expect(markup).toMatch(/class="[^"]*\bdashCardGrid\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bdashCard\b[^"]*\bdashCardWide\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bdashCard\b[^"]*\bdashCardNarrow\b[^"]*"/);
    expect(markup).toContain("Последние операции");
    expect(markup).toContain("Быстрые действия");
    expect(markup).toContain("Купить подписку");
    expect(markup).toContain("Управлять устройствами");
    expect(markup).toContain("Пригласить друга");
    expect(markup).not.toMatch(/\btelemetry[A-Za-z-]*\b/);
    expect(markup).not.toMatch(/\bcommandPanel[A-Za-z-]*\b/);
    expect(markup).not.toMatch(/\breferralPanel[A-Za-z-]*\b/);
  });
});
