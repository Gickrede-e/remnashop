import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Menu } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("@/components/shared/logo", () => ({
  Logo: ({ href = "/" }: { href?: string }) => React.createElement("a", { href }, "Logo")
}));

vi.mock("@/components/shared/logout-button", () => ({
  LogoutButton: () => React.createElement("button", { type: "button" }, "LogoutMock")
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  DialogContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props, children),
  DialogDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) =>
    React.createElement("p", props, children),
  DialogHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props, children),
  DialogTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) =>
    React.createElement("h2", props, children)
}));

import { AppMoreSheet } from "@/components/shell/app-more-sheet";
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
    expect(markup).toMatch(/class="[^"]*\bmoreTrigger\b[^"]*"/);
  });

  it("uses dialog trigger semantics for both topbar more buttons", () => {
    const props: React.ComponentProps<typeof AppTopbar> = {
      homeHref: "/dashboard",
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
    expect((markup.match(/class="[^"]*\bmoreTrigger\b[^"]*"/g) ?? []).length).toBe(2);
  });

  it("keeps the topbar free of the old left text block and mounts logout", () => {
    const props: React.ComponentProps<typeof AppTopbar> = {
      homeHref: "/dashboard",
      primaryItems: [{ href: "/dashboard", label: "Обзор", icon: Menu, active: true }],
      isMoreActive: false,
      onOpenMore: () => undefined,
      moreOpen: false,
      moreSheetId: "dashboard-more-sheet"
    };

    const markup = renderToStaticMarkup(
      React.createElement(AppTopbar, props)
    );

    expect(markup).not.toContain("Личный кабинет");
    expect(markup).not.toContain("<p>Обзор</p>");
    expect(markup).toContain("LogoutMock");
    expect(markup).toContain('<a href="/dashboard">Logo</a>');
  });

  it("renders logout inside the more sheet", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AppMoreSheet, {
        area: "dashboard",
        items: [{ href: "/dashboard/referrals", label: "Рефералы", icon: Menu, active: false }],
        open: true,
        onOpenChange: () => undefined
      })
    );

    expect(markup).toContain("LogoutMock");
  });
});
