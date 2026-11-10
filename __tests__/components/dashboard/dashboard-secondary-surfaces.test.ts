import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PaymentProvider } from "@prisma/client";

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
import { formatPrice } from "@/lib/utils";

describe("dashboard secondary surfaces", () => {
  it("renders checkout with the shared dashboard checkout shell", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PaymentCheckout, {
        enabledProviders: [PaymentProvider.YOOKASSA],
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
    expect(markup).toContain('data-step="plan"');
    expect(markup).toContain("Тариф");
    expect(markup).toContain("Срок");
    expect(markup).toContain("Оплата");
    expect(markup.match(/class="[^"]*\bdashCard\b[^"]*"/g) ?? []).toHaveLength(4);
    expect(markup).toContain("Выберите тариф");
    expect(markup).toContain("Выберите срок");
    expect(markup).toContain("Starter");
    expect(markup).toContain("в месяц");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup.match(/>Далее</g) ?? []).toHaveLength(2);
    expect(markup).toContain(`Оплатить ${formatPrice(99000)}`);
    expect(markup).not.toContain("Оплата через");
    expect(markup).not.toContain("Платежи временно недоступны");
    expect(markup).not.toContain("СБП");
    expect(markup).not.toContain("Карты РФ");
    expect(markup).not.toContain("Крипта");
    expect(markup).not.toMatch(/\btelemetryHero\b/);
    expect(markup).not.toMatch(/\bcommandPanel\b/);
    expect(markup).not.toMatch(/\bcheckoutWorkspace\b/);
  });

  it("disables payment and says why when no provider is enabled", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PaymentCheckout, {
        enabledProviders: [],
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

    expect(markup).toContain("Выберите тариф");
    expect(markup).toContain("Starter");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Платежи недоступны<\/button>/);
    expect(markup).toContain("Платежи временно недоступны");
    expect(markup).not.toContain("ЮKassa");
  });

  it("renders payment history with dashboard stats and a table card", () => {
    const historyMarkup = renderToStaticMarkup(
      React.createElement(PaymentHistoryList, {
        payments: [
          {
            id: "payment-1",
            amount: 199000,
            originalAmount: null,
            months: 1,
            status: "SUCCEEDED",
            confirmationUrl: null,
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            paidAt: new Date("2026-04-01T00:05:00.000Z"),
            plan: { name: "Pro 90" },
            promoCode: { code: "ALLY42" }
          }
        ]
      })
    );

    expect(historyMarkup).toMatch(/class="[^"]*\bdashWorkspace\b[^"]*\bdashHistory\b[^"]*"/);
    expect(historyMarkup).toContain("История платежей");
    expect(historyMarkup).toMatch(/class="[^"]*\bdashCard\b[^"]*"/);
    expect(historyMarkup).toContain('class="dashTable historyTable"');
    expect(historyMarkup).not.toContain("dashPagerBtn");
    expect(historyMarkup).not.toMatch(/\btelemetryHero\b/);
    expect(historyMarkup).not.toMatch(/\bcommandPanel\b/);
    expect(historyMarkup).not.toMatch(/\bhistoryWorkspace\b/);
  });

  it("shows each purchase with its period, the promo saving and a way to finish a pending payment", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PaymentHistoryList, {
        payments: [
          {
            id: "payment-pending",
            amount: 89700,
            originalAmount: 89700,
            months: 3,
            status: "PENDING",
            confirmationUrl: "https://yoomoney.ru/checkout/payments/v2/contract?orderId=pending-1",
            createdAt: new Date("2026-10-31T07:42:00.000Z"),
            paidAt: null,
            plan: { name: "Geek+" },
            promoCode: null
          },
          {
            // 299 ₽ × 3 = 897 ₽, minus 5% for the period = 852.15 ₽, minus a 10% promo = 766.94 ₽.
            id: "payment-promo",
            amount: 76694,
            originalAmount: 89700,
            months: 3,
            status: "SUCCEEDED",
            confirmationUrl: "https://yoomoney.ru/checkout/payments/v2/contract?orderId=paid-1",
            createdAt: new Date("2026-08-24T15:05:00.000Z"),
            paidAt: new Date("2026-08-24T15:06:00.000Z"),
            plan: { name: "Geek+" },
            promoCode: { code: "WELCOME10" }
          }
        ]
      })
    );

    expect(markup).toContain("Geek+ · 3 месяца");
    expect(markup).toContain(`Промокод WELCOME10 · сэкономлено ${formatPrice(8521)}`);
    expect(markup.match(/Завершить оплату/g) ?? []).toHaveLength(1);
    expect(markup).toContain('href="https://yoomoney.ru/checkout/payments/v2/contract?orderId=pending-1"');
    expect(markup).not.toContain("orderId=paid-1");
  });

  it("points an empty device list at the connection instructions", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DeviceList, {
        devices: [],
        total: 0,
        deviceLimit: 5,
        subscriptionUrl: "https://sub.example.com/client-access"
      })
    );

    expect(markup).toContain("Устройств пока нет");
    expect(markup).toMatch(/<a href="https:\/\/sub\.example\.com\/client-access"[^>]*>Как подключить устройство/);
    expect(markup).toContain("Добавить устройство");
    expect(markup).toContain("до 5 одновременно");
  });

  it("shows a scannable QR code of the subscription link in the add-device card", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DeviceList, {
        devices: [],
        total: 0,
        deviceLimit: 5,
        subscriptionUrl: "https://sub.example.com/client-access"
      })
    );

    expect(markup).toMatch(/<svg[^>]*role="img"[^>]*><title>QR-код ссылки подписки<\/title>/);
    expect(markup).toContain("Отсканируйте код в Happ на телефоне.");
  });

  it("sends a user without a subscription to buy one instead of adding devices", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DeviceList, { devices: [], total: 0, deviceLimit: null, subscriptionUrl: null })
    );

    expect(markup).toMatch(/<a href="\/dashboard\/buy"[^>]*>Купить подписку/);
    expect(markup).not.toContain("Добавить устройство");
  });

  it("lists each referral reward with its status, explains the program and offers sharing", () => {
    const referralLink = "https://example.com/register?ref=ALLY42";
    const markup = renderToStaticMarkup(
      React.createElement(ReferralSummaryBlocks, {
        referralLink,
        referredUsers: [],
        rewards: [
          {
            id: "reward-waiting",
            rewardType: "FREE_DAYS",
            rewardValue: 3,
            applied: false,
            createdAt: new Date("2026-10-27T00:00:00.000Z"),
            referredUser: { email: "friend@example.com" }
          },
          {
            id: "reward-added",
            rewardType: "FREE_DAYS",
            rewardValue: 3,
            applied: true,
            createdAt: new Date("2026-09-14T00:00:00.000Z"),
            referredUser: { email: "buddy@example.com" }
          }
        ],
        friendReward: { type: "FREE_DAYS", value: 3 }
      })
    );

    expect(markup).toContain("+3 дня за друга");
    expect(markup).toContain("Вы получаете +3 дня");
    expect(markup).toContain('class="dashStatusPill is-pending">Ожидает');
    expect(markup).toContain('class="dashStatusPill is-completed">Начислено');
    expect(markup).toContain("Ожидающие бонусы начисляются при вашей следующей оплате.");
    expect(markup).toContain(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}`);
    expect(markup).not.toContain("Поделиться</button>");
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
            rewardType: "FREE_DAYS",
            rewardValue: 7,
            applied: true,
            createdAt: new Date("2026-04-02T00:00:00.000Z"),
            referredUser: {
              email: "friend@example.com"
            }
          }
        ],
        friendReward: { type: "FREE_DAYS", value: 7 }
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
        deviceLimit: 3,
        subscriptionUrl: "https://sub.example.com/client-access"
      })
    );

    expect(referralsMarkup).toMatch(/class="[^"]*\bdashWorkspace\b[^"]*\bdashReferrals\b[^"]*"/);
    expect(referralsMarkup).toContain("Ваша ссылка");
    expect(referralsMarkup).toContain('class="dashStatusPill is-completed"');
    expect(referralsMarkup).toMatch(/class="[^"]*\bdashCardGrid\b[^"]*"/);
    expect(referralsMarkup.match(/class="[^"]*\bdashCard\b[^"]*"/g) ?? []).toHaveLength(4);
    expect(referralsMarkup).not.toMatch(/\btelemetryHero\b/);
    expect(referralsMarkup).not.toMatch(/\breferralLinkLabel\b/);
    expect(referralsMarkup).not.toMatch(/\breferralWorkspace\b/);

    expect(devicesMarkup).toMatch(/class="[^"]*\bdashWorkspace\b[^"]*\bdashDevices\b[^"]*"/);
    expect(devicesMarkup).toContain("Подключено 1 из 3");
    expect(devicesMarkup).toMatch(/class="[^"]*\bdashCard\b[^"]*"/);
    expect(devicesMarkup).not.toMatch(/\btelemetryHero\b/);
    expect(devicesMarkup).not.toMatch(/\bdevicePanel\b/);
    expect(devicesMarkup).not.toMatch(/\bcommandPanel\b/);
  });
});
