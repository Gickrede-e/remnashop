import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

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
import { formatBytes } from "@/lib/utils";

const GB = 1024n * 1024n * 1024n;

function formatDateOnly(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
}

function renderOverview(
  subscription: React.ComponentProps<typeof DashboardOverviewBlocks>["subscription"],
  externalSubscriptionUrl: string | null = "https://example.com/subscription"
) {
  return renderToStaticMarkup(
    React.createElement(DashboardOverviewBlocks, {
      subscription,
      externalSubscriptionUrl,
      remnawaveUuid: subscription ? "uuid-1" : null,
      referralBonusDays: null
    })
  );
}

describe("dashboard overview blocks", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("leads with the days left, then status, traffic and actions in one grid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"));
    const expiresAt = new Date("2026-05-01T00:00:00.000Z");

    const markup = renderOverview({
      status: "ACTIVE",
      planName: "Pro 90",
      expiresAt,
      trafficLimitBytes: 120n * GB,
      trafficUsedBytes: 48n * GB
    });

    expect(markup).toContain('class="dashDaysLeft is-active"');
    expect(markup).toContain('<span class="dashDaysLeftNumber">30</span>');
    expect(markup).toContain("дней осталось");
    expect(markup).toContain(`До ${formatDateOnly(expiresAt)} · Pro 90`);
    expect(markup).toMatch(/<a class="button buttonPrimary[^"]*" href="https:\/\/example\.com\/subscription"/);
    expect(markup).toContain(">Продлить</a>");
    expect(markup).toContain('class="dashOverviewGrid"');
    expect(markup.match(/class="dashStatTile"/g) ?? []).toHaveLength(2);
    expect(markup.match(/class="dashOverviewCompactStat"/g) ?? []).toHaveLength(2);
    expect(markup).toContain(`${formatBytes(48n * GB)} / ${formatBytes(120n * GB)}`);
    expect(markup).toContain("Пригласить друга");
    expect(markup).toContain("Перевыпуск подписки");
    expect(markup).not.toContain("Сеть в работе");
    expect(markup).not.toContain("авто-продлен");
    expect(markup).not.toContain("От 200");
  });

  it("turns red and puts renewal first when five days or fewer are left", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T00:00:00.000Z"));

    const markup = renderOverview({
      status: "ACTIVE",
      planName: null,
      expiresAt: new Date("2026-05-01T00:00:00.000Z"),
      trafficLimitBytes: null,
      trafficUsedBytes: null
    });

    expect(markup).toContain('class="dashDaysLeft is-ending"');
    expect(markup).toContain("Скоро закончится");
    expect(markup).toContain('<span class="dashDaysLeftNumber">2</span>');
    expect(markup).toContain("дня осталось");
    expect(markup.indexOf("Продлить сейчас")).toBeLessThan(markup.indexOf("Подключить"));
  });

  it("rounds the remaining days up when less than a day is left", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));

    const markup = renderOverview({
      status: "ACTIVE",
      planName: "Pro 30",
      expiresAt: new Date("2026-05-01T00:00:00.000Z"),
      trafficLimitBytes: 60n * GB,
      trafficUsedBytes: 10n * GB
    });

    expect(markup).toContain('<span class="dashDaysLeftNumber">1</span>');
    expect(markup).toContain("день остался");
  });

  it("offers to resume an expired subscription without a connect button", () => {
    const markup = renderOverview({
      status: "EXPIRED",
      planName: "Pro 30",
      expiresAt: new Date("2026-04-01T00:00:00.000Z"),
      trafficLimitBytes: 60n * GB,
      trafficUsedBytes: 60n * GB
    });

    expect(markup).toContain('class="dashDaysLeft is-expired"');
    expect(markup).toContain("Доступ отключён");
    expect(markup).toContain("Возобновить подписку");
    expect(markup).not.toContain("Подключить");
  });

  it("offers to buy and hides reissue when there is no subscription", () => {
    const markup = renderOverview(null, null);

    expect(markup).toContain("Подписки нет");
    expect(markup).toMatch(/<a href="\/dashboard\/buy" class="button buttonPrimary[^"]*" data-tour="connect">Купить подписку/);
    expect(markup).not.toContain("Подключить");
    expect(markup).not.toContain("Перевыпуск подписки");
  });
});
