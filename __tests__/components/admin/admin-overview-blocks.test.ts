import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

import { AdminOverviewBlocks } from "@/components/blocks/admin/admin-overview-blocks";

describe("AdminOverviewBlocks provider status section", () => {
  it("renders provider rows and drops the old static copy", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AdminOverviewBlocks, {
        summaryTitle: "Summary",
        summaryDescription: "Summary",
        primaryMetrics: [],
        contextRows: [],
        sections: [],
        providerStatuses: [
          {
            label: "Remnawave",
            status: "available",
            summary: "Доступен",
            detail: "auth ok",
            checkedAt: "2026-03-22T00:00:00.000Z"
          }
        ],
        quickActions: []
      })
    );

    expect(markup).toContain("Статусы модулей");
    expect(markup).toContain("Remnawave");
    expect(markup).toContain("Доступен");
    expect(markup).toContain("auth ok");
    expect(markup).toContain("data-status=\"available\"");
    expect(markup).not.toContain("Что проверять дальше");
  });
});
