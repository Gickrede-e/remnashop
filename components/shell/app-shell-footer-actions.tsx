"use client";

import Link from "next/link";

import { LogoutButton } from "@/components/shared/logout-button";
import type { AppFooterAction } from "@/lib/ui/app-shell-nav";

type AppShellFooterActionsProps = {
  actions: AppFooterAction[];
  variant?: "rail" | "sheet";
  onAction?: () => void;
};

const variantClasses = {
  rail: {
    container: "appNavRailSection appShellFooterActions",
    list: "appNavRailNav",
    link: "appNavRailLink appNavRailLinkSecondary",
    summary: "appNavRailLink appNavRailLinkSecondary",
    summaryMeta: "appNavRailDescription",
    logout: "appNavRailLink appNavRailLinkSecondary justify-start"
  },
  sheet: {
    container: "appMoreSheetFooter appShellFooterActions",
    list: "appMoreSheetBody",
    link: "appMoreSheetLink surface-soft",
    summary: "appMoreSheetLink surface-soft",
    summaryMeta: "appNavRailDescription",
    logout: "appMoreSheetLogout"
  }
} as const;

export function AppShellFooterActions({
  actions,
  variant = "rail",
  onAction
}: AppShellFooterActionsProps) {
  const classes = variantClasses[variant];

  return (
    <section className={classes.container} aria-label="Sidebar footer actions">
      {variant === "rail" ? <p className="appNavRailSectionLabel">Аккаунт</p> : null}

      <div className={classes.list}>
        {actions.map((action) => {
          if (action.kind === "summary") {
            return (
              <div key={`${action.label}-${action.kind}`} className={classes.summary}>
                <span className={variant === "rail" ? "appNavRailLinkText" : "appMoreSheetLabel"}>{action.label}</span>
                <span className={classes.summaryMeta}>Активная сессия</span>
              </div>
            );
          }

          if (action.kind === "command" && action.command === "logout") {
            return (
              <LogoutButton
                key={`${action.label}-${action.kind}`}
                className={classes.logout}
                label={action.label}
                variant="ghost"
                size={variant === "rail" ? "sm" : "default"}
              />
            );
          }

          return (
            <Link
              key={`${action.label}-${action.href}`}
              href={action.href ?? "/"}
              onClick={onAction}
              className={classes.link}
            >
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
