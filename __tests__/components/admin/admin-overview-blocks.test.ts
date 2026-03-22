import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Activity } from "lucide-react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

import { AdminOverviewBlocks, AdminProviderStatusSection } from "@/components/blocks/admin/admin-overview-blocks";

const providerStatuses = [
  {
    label: "Remnawave",
    status: "available" as const,
    summary: "Доступен",
    detail: "auth ok",
    checkedAt: "2026-03-22T00:00:00.000Z"
  },
  {
    label: "YooKassa",
    status: "unavailable" as const,
    summary: "Недоступен",
    detail: "401 Unauthorized",
    checkedAt: "2026-03-22T00:00:00.000Z"
  },
  {
    label: "Platega",
    status: "timeout" as const,
    summary: "Таймаут",
    detail: "request timed out after 2500ms",
    checkedAt: "2026-03-22T00:00:00.000Z"
  },
  {
    label: "Webhook",
    status: "not_configured" as const,
    summary: "Не настроен",
    detail: "placeholder config",
    checkedAt: "2026-03-22T00:00:00.000Z"
  }
];

function renderOverview() {
  return renderToStaticMarkup(
    React.createElement(AdminOverviewBlocks, {
      summaryTitle: "Summary",
      summaryDescription: "Summary",
      primaryMetrics: [{ label: "Доход", value: "1000 ₽" }],
      contextRows: [{ label: "Доход за неделю", value: "5000 ₽" }],
      sections: [
        {
          title: "Фокус по выручке",
          description: "Держим финансовый срез рядом с overview.",
          items: [{ label: "За неделю", value: "5000 ₽", hint: "Рост к прошлой неделе" }]
        }
      ],
      providerStatusSlot: React.createElement(AdminProviderStatusSection, {
        statuses: providerStatuses
      }),
      quickActions: [
        {
          href: "/admin/logs",
          label: "Логи",
          description: "Проверить системные события.",
          icon: Activity
        }
      ]
    })
  );
}

describe("AdminOverviewBlocks provider status section", () => {
  it("renders all supported provider states in order with stable hooks", () => {
    const markup = renderOverview();

    expect(markup).toContain("Статусы модулей");
    expect(markup).toContain("Remnawave");
    expect(markup).toContain("YooKassa");
    expect(markup).toContain("Platega");
    expect(markup).toContain("Webhook");
    expect(markup).toContain("Доступен");
    expect(markup).toContain("Недоступен");
    expect(markup).toContain("Таймаут");
    expect(markup).toContain("Не настроен");
    expect(markup).toContain("auth ok");
    expect(markup).toContain("401 Unauthorized");
    expect(markup).toContain("request timed out after 2500ms");
    expect(markup).toContain("placeholder config");
    expect((markup.match(/data-status="/g) ?? []).length).toBe(4);
    expect(markup.indexOf("Remnawave")).toBeLessThan(markup.indexOf("YooKassa"));
    expect(markup.indexOf("YooKassa")).toBeLessThan(markup.indexOf("Platega"));
    expect(markup.indexOf("Platega")).toBeLessThan(markup.indexOf("Webhook"));
    expect(markup).toContain("data-status=\"available\"");
    expect(markup).toContain("data-status=\"unavailable\"");
    expect(markup).toContain("data-status=\"timeout\"");
    expect(markup).toContain("data-status=\"not_configured\"");
    expect(markup).not.toContain("Что проверять дальше");
  });

  it("keeps the provider block in the real two-card detail grid when sections are present", () => {
    const markup = renderOverview();

    expect(markup).toContain("Фокус по выручке");
    expect(markup).toContain("Держим финансовый срез рядом с overview.");
    expect(markup).toContain("lg:grid-cols-2");
    expect(markup).toContain("Проверить системные события.");
    expect(markup.indexOf("Фокус по выручке")).toBeLessThan(markup.indexOf("Статусы модулей"));
  });
});
