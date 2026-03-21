"use client";

import Link from "next/link";
import { Menu, type LucideIcon } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/shell/screen-header";
import type { AppShellArea } from "@/lib/ui/app-shell-nav";
import { cn } from "@/lib/utils";

type AppTopbarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type AppTopbarProps = {
  area: AppShellArea;
  currentLabel: string;
  primaryItems: AppTopbarItem[];
  isMoreActive: boolean;
  moreOpen: boolean;
  moreSheetId?: string;
  onOpenMore: () => void;
};

const areaMeta = {
  dashboard: {
    eyebrow: "Личный кабинет",
    href: "/dashboard"
  },
  admin: {
    eyebrow: "Админ-панель",
    href: "/admin"
  }
} satisfies Record<AppShellArea, { eyebrow: string; href: string }>;

export function AppTopbar({
  area,
  currentLabel,
  primaryItems,
  isMoreActive,
  moreOpen,
  moreSheetId,
  onOpenMore
}: AppTopbarProps) {
  const meta = areaMeta[area];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[color-mix(in_srgb,var(--app-bg)_92%,transparent)]">
      <div className="container py-3">
        <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-6">
          <div className="flex items-center justify-between gap-3">
            <Logo compact href={meta.href} />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="md:hidden"
              onClick={onOpenMore}
              aria-label="Открыть меню разделов"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls={moreSheetId}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <ScreenHeader
            compact
            eyebrow={meta.eyebrow}
            title={currentLabel}
            titleAs="p"
            className="min-w-0"
            titleClassName="truncate"
          />

          <nav className="hidden items-center gap-2 md:flex">
            {primaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white",
                  item.active && "bg-white/[0.06] text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Button
              type="button"
              variant={isMoreActive ? "secondary" : "ghost"}
              className={cn(
                "min-h-11 rounded-2xl px-4 text-sm",
                !isMoreActive && "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
              )}
              onClick={onOpenMore}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls={moreSheetId}
            >
              <Menu className="h-4 w-4" />
              Ещё
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
