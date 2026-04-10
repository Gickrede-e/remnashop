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

import { PaymentCheckout } from "@/components/dashboard/payment-checkout";
import { PaymentHistoryList } from "@/components/blocks/dashboard/payment-history-list";
import { ReferralSummaryBlocks } from "@/components/blocks/dashboard/referral-summary-blocks";
import { DeviceList } from "@/components/blocks/dashboard/device-list";

describe("dashboard secondary surfaces", () => {
  it("renders checkout with the shared dashboard checkout shell", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PaymentCheckout, {
        plans: [
          {
            id: "plan-1",
            slug: "starter",
            name: "Starter",
            description: "Базовый доступ",
            price: 99000,
            durationDays: 30,
            trafficGB: 100,
            highlight: "Hot",
            isActive: true,
            sortOrder: 1,
            remnawaveExternalSquadUuid: null,
            remnawaveInternalSquadUuids: [],
            remnawaveHwidDeviceLimit: 3,
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-01T00:00:00.000Z")
          }
        ]
      })
    );

    expect(markup).toMatch(/class="[^"]*\bdashWorkspace\b[^"]*\bdashCheckout\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bdashCardGrid\b[^"]*"/);
    expect(markup.match(/class="[^"]*\bdashCard\b[^"]*"/g) ?? []).toHaveLength(2);
    expect(markup).toContain("WELCOME10");
    expect(markup).not.toMatch(/\btelemetryHero\b/);
    expect(markup).not.toMatch(/\bcommandPanel\b/);
    expect(markup).not.toMatch(/\bcheckoutWorkspace\b/);
  });

  it("renders payment history with dashboard stats and a table card", () => {
    const historyMarkup = renderToStaticMarkup(
      React.createElement(PaymentHistoryList, {
        payments: [
          {
            id: "payment-1",
            amount: 199000,
            status: "SUCCEEDED",
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            paidAt: new Date("2026-04-01T00:05:00.000Z"),
            plan: { name: "Pro 90" },
            promoCode: { code: "ALLY42" }
          }
        ]
      })
    );

    expect(historyMarkup).toMatch(/class="[^"]*\bdashWorkspace\b[^"]*\bdashHistory\b[^"]*"/);
    expect(historyMarkup).toContain('class="dashStatGrid"');
    expect(historyMarkup.match(/class="dashStatTile"/g) ?? []).toHaveLength(3);
    expect(historyMarkup).toMatch(/class="[^"]*\bdashCard\b[^"]*"/);
    expect(historyMarkup).toContain('class="dashTable"');
    expect(historyMarkup).not.toMatch(/\btelemetryHero\b/);
    expect(historyMarkup).not.toMatch(/\bcommandPanel\b/);
    expect(historyMarkup).not.toMatch(/\bhistoryWorkspace\b/);
  });

  it("renders devices and referrals through the shared secondary vocabulary", () => {
    const referralsMarkup = renderToStaticMarkup(
      React.createElement(ReferralSummaryBlocks, {
        referralLink: "https://example.com/register?ref=ALLY42",
        referredUsers: [
          {
            id: "user-1",
            email: "friend@example.com",
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            payments: [{ paidAt: new Date("2026-04-02T00:00:00.000Z") }]
          }
        ],
        rewards: [
          {
            id: "reward-1",
            rewardType: "DAYS",
            rewardValue: 7,
            createdAt: new Date("2026-04-02T00:00:00.000Z"),
            referredUser: {
              email: "friend@example.com"
            }
          }
        ]
      })
    );

    const devicesMarkup = renderToStaticMarkup(
      React.createElement(DeviceList, {
        devices: [
          {
            hwid: "hwid-1",
            platform: "iOS",
            osVersion: "18.0",
            deviceModel: "iPhone",
            createdAt: "2026-04-01T00:00:00.000Z"
          }
        ],
        total: 1,
        deviceLimit: 3
      })
    );

    expect(referralsMarkup).toMatch(/class="[^"]*\bdashWorkspace\b[^"]*\bdashReferrals\b[^"]*"/);
    expect(referralsMarkup).toContain('class="dashStatGrid"');
    expect(referralsMarkup).toMatch(/class="[^"]*\bdashCardGrid\b[^"]*"/);
    expect(referralsMarkup.match(/class="[^"]*\bdashCard\b[^"]*"/g) ?? []).toHaveLength(2);
    expect(referralsMarkup).not.toMatch(/\btelemetryHero\b/);
    expect(referralsMarkup).not.toMatch(/\breferralLinkLabel\b/);
    expect(referralsMarkup).not.toMatch(/\breferralWorkspace\b/);

    expect(devicesMarkup).toMatch(/class="[^"]*\bdashWorkspace\b[^"]*\bdashDevices\b[^"]*"/);
    expect(devicesMarkup).toContain('class="dashStatGrid"');
    expect(devicesMarkup).toMatch(/class="[^"]*\bdashCard\b[^"]*"/);
    expect(devicesMarkup).not.toMatch(/\btelemetryHero\b/);
    expect(devicesMarkup).not.toMatch(/\bdevicePanel\b/);
    expect(devicesMarkup).not.toMatch(/\bcommandPanel\b/);
  });
});
