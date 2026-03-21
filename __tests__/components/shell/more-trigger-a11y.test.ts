import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Menu } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("@/components/layout/logo", () => ({
  Logo: ({ href = "/" }: { href?: string }) => React.createElement("a", { href }, "Logo")
}));

import { AppBottomNav } from "@/components/shell/app-bottom-nav";
import { AppTopbar } from "@/components/shell/app-topbar";

describe("shared shell more triggers", () => {
  it("uses dialog trigger semantics for the mobile bottom-nav more button", () => {
    const props: React.ComponentProps<typeof AppBottomNav> = {
      items: [
        { href: "/dashboard", label: "Обзор", icon: Menu, active: false },
        { href: "#more", label: "Ещё", icon: Menu, active: true }
      ],
      onOpenMore: () => undefined,
      moreOpen: true,
      moreSheetId: "dashboard-more-sheet"
    };

    const markup = renderToStaticMarkup(
      React.createElement(AppBottomNav, props)
    );

    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-controls="dashboard-more-sheet"');
    expect(markup).not.toContain("aria-pressed=");
  });

  it("uses dialog trigger semantics for both topbar more buttons", () => {
    const props: React.ComponentProps<typeof AppTopbar> = {
      area: "dashboard",
      currentLabel: "Обзор",
      primaryItems: [{ href: "/dashboard", label: "Обзор", icon: Menu, active: true }],
      isMoreActive: false,
      onOpenMore: () => undefined,
      moreOpen: false,
      moreSheetId: "dashboard-more-sheet"
    };

    const markup = renderToStaticMarkup(
      React.createElement(AppTopbar, props)
    );

    expect(markup.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(markup.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(markup.match(/aria-controls="dashboard-more-sheet"/g)).toHaveLength(2);
  });
});
