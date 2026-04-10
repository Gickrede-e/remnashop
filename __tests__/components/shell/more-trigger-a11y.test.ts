import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Menu } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

const globalsCssPath = path.resolve(process.cwd(), "app/globals.css");

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
  it("keeps the legacy bottom-nav component as a no-op compatibility shim", () => {
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

    expect(markup).toBe("");
  });

  it("uses dialog trigger semantics for both topbar more buttons", () => {
    const props: React.ComponentProps<typeof AppTopbar> = {
      area: "dashboard",
      primaryItems: [{ href: "/dashboard", label: "Обзор", icon: Menu, active: true }],
      activeRouteLabel: "Обзор",
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

  it("keeps the topbar free of the old left text block and leaves footer actions to the rail or sheet", () => {
    const props: React.ComponentProps<typeof AppTopbar> = {
      area: "dashboard",
      primaryItems: [{ href: "/dashboard", label: "Обзор", icon: Menu, active: true }],
      activeRouteLabel: "Обзор",
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
    expect(markup).not.toContain("LogoutMock");
    expect(markup).toContain('<a href="/dashboard">Logo</a>');
  });

  it("renders footer actions inside the more sheet without a fake logout route", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AppMoreSheet, {
        area: "dashboard",
        primaryItems: [{ href: "/dashboard", label: "Обзор", icon: Menu, active: true }],
        secondaryItems: [{ href: "/dashboard/referrals", label: "Рефералы", icon: Menu, active: false }],
        footerActions: [
          { label: "Profile", kind: "summary", intent: "system" },
          { label: "Logout", kind: "command", intent: "system", command: "logout" }
        ],
        open: true,
        onOpenChange: () => undefined
      })
    );

    expect(markup).toContain("Profile");
    expect(markup).toContain("LogoutMock");
    expect(markup).not.toContain('href="/logout"');
    expect(markup).toMatch(/class="[^"]*\bappMoreSheetContent\b[^"]*\bdialogSurface\b[^"]*"/);

    const source = fs.readFileSync(globalsCssPath, "utf8");
    expect(source).toContain(".dialogSurface.appMoreSheetContent");
    expect(source).toContain(".appNavRailSurface");
    expect(source).toContain("position: fixed;");
    expect(source).toContain("grid-template-columns: minmax(15.75rem, 17.5rem) minmax(0, 1fr);");
    expect(source).toContain("bottom: 0;");
    expect(source).not.toContain("padding-bottom: calc(env(safe-area-inset-bottom) + 6.5rem);");
  });
});
