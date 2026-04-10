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
import { SubscriptionStatusBadge } from "@/components/shared/status-badge";

describe("dashboard overview blocks", () => {
  it("renders the overview with telemetry-first semantic sections", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DashboardOverviewBlocks, {
        subscription: {
          status: "ACTIVE",
          planName: "Pro 90",
          expiresAt: new Date("2026-05-01T00:00:00.000Z"),
          trafficLimitBytes: 120n * 1024n * 1024n * 1024n,
          trafficUsedBytes: 48n * 1024n * 1024n * 1024n
        },
        referralLink: "https://example.com/register?ref=ALLY42",
        externalSubscriptionUrl: "https://example.com/subscription",
        remnawaveUuid: "uuid-1"
      })
    );

    expect(markup).toMatch(/class="[^"]*\bdashboardWorkspace\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bdashboardOverview\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bdashboardHero\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bdashboardSection\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\btelemetryGrid\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bcommandPanel\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bcommandRow\b[^"]*"/);
    expect(markup).toContain("Текущий доступ");
    expect(markup).toContain("Перевыпустить подписку");
  });

  it("renders subscription statuses through semantic status badge classes", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SubscriptionStatusBadge, {
        status: "ACTIVE"
      })
    );

    expect(markup).toMatch(/class="[^"]*\bstatusBadge\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bstatusBadgeActive\b[^"]*"/);
  });
});
