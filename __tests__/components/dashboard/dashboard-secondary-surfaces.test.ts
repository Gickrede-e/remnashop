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
  it("renders checkout with semantic workspace and plan hooks", () => {
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

    expect(markup).toMatch(/class="[^"]*\bcheckoutWorkspace\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bcheckoutPlanOption\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bcheckoutSummaryPanel\b[^"]*"/);
    expect(markup).toContain("Оплатить через ЮKassa");
  });

  it("renders history, referral, and devices surfaces through the shared secondary vocabulary", () => {
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

    expect(historyMarkup).toMatch(/class="[^"]*\bhistoryWorkspace\b[^"]*"/);
    expect(historyMarkup).toMatch(/class="[^"]*\bdataPanel\b[^"]*"/);
    expect(referralsMarkup).toMatch(/class="[^"]*\breferralWorkspace\b[^"]*"/);
    expect(referralsMarkup).toMatch(/class="[^"]*\bdataPanel\b[^"]*"/);
    expect(devicesMarkup).toMatch(/class="[^"]*\bdeviceWorkspace\b[^"]*"/);
    expect(devicesMarkup).toMatch(/class="[^"]*\bdevicePanel\b[^"]*"/);
    expect(devicesMarkup).toMatch(/class="[^"]*\bcommandButtonDanger\b[^"]*"/);
  });
});
