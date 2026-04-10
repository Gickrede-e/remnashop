import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Menu } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("@radix-ui/react-dialog", () => {
  const Overlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => React.createElement("div", { ref, ...props }, children)
  );
  Overlay.displayName = "MockDialogOverlay";

  const Content = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => React.createElement("div", { ref, ...props }, children)
  );
  Content.displayName = "MockDialogContent";

  const Close = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ children, ...props }, ref) =>
      React.createElement("button", { ref, type: "button", ...props }, children)
  );
  Close.displayName = "MockDialogClose";

  const Title = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ children, ...props }, ref) => React.createElement("h2", { ref, ...props }, children)
  );
  Title.displayName = "MockDialogTitle";

  const Description = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ children, ...props }, ref) => React.createElement("p", { ref, ...props }, children)
  );
  Description.displayName = "MockDialogDescription";

  const Trigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ children, ...props }, ref) =>
      React.createElement("button", { ref, type: "button", ...props }, children)
  );
  Trigger.displayName = "MockDialogTrigger";

  return {
    Root: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Portal: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Overlay,
    Content,
    Close,
    Title,
    Description,
    Trigger
  };
});

vi.mock("@/components/shared/logo", () => ({
  Logo: ({ href = "/" }: { href?: string }) => React.createElement("a", { href }, "Logo")
}));

vi.mock("@/components/shared/logout-button", () => ({
  LogoutButton: () => React.createElement("button", { type: "button" }, "LogoutMock")
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

  it("exposes the topbar more trigger as a dialog opener", () => {
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

    expect(markup).toContain('aria-label="Открыть меню разделов"');
    expect(markup.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(markup.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(markup.match(/aria-controls="dashboard-more-sheet"/g)).toHaveLength(2);
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
          { label: "Профиль", kind: "summary", intent: "system" },
          { label: "Выйти", kind: "command", intent: "system", command: "logout" }
        ],
        open: true,
        onOpenChange: () => undefined
      })
    );

    expect(markup).toContain("Профиль");
    expect(markup).toContain("LogoutMock");
    expect(markup).not.toContain('href="/logout"');
    expect(markup).toMatch(/class="[^"]*\bappMoreSheetContent\b[^"]*\bdialogSurface\b[^"]*"/);
    expect(markup).toContain('aria-label="Действия в меню"');
    expect(markup).toContain('aria-label="Закрыть диалог"');
  });
});
