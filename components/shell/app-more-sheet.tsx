"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { LogoutButton } from "@/components/shared/logout-button";
import { ScreenHeader } from "@/components/shell/screen-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { AppShellArea } from "@/lib/ui/app-shell-nav";
import { cn } from "@/lib/utils";

type AppMoreSheetItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type AppMoreSheetProps = {
  area: AppShellArea;
  items: AppMoreSheetItem[];
  open: boolean;
  contentId?: string;
  onOpenChange: (open: boolean) => void;
};

const descriptions = {
  dashboard: "Дополнительные разделы кабинета и реферальные инструменты.",
  admin: "Второстепенные разделы управления, отчёты и переход обратно в кабинет."
} satisfies Record<AppShellArea, string>;

export function AppMoreSheet({ area, items, open, contentId, onOpenChange }: AppMoreSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id={contentId}
        className="!left-0 !top-auto !bottom-0 !w-full !translate-x-0 !translate-y-0 max-h-[85dvh] overflow-y-auto rounded-b-none rounded-t-[32px] border-x-0 border-b-0 p-0 sm:!left-1/2 sm:!top-1/2 sm:!bottom-auto sm:!w-[min(92vw,560px)] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:max-h-[min(80vh,720px)] sm:rounded-[28px] sm:border"
      >
        <DialogHeader className="border-b border-white/10 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <DialogTitle className="sr-only">Ещё разделы</DialogTitle>
          <DialogDescription className="sr-only">{descriptions[area]}</DialogDescription>
          <ScreenHeader compact eyebrow="Навигация" title="Ещё разделы" titleAs="p" description={descriptions[area]} />
        </DialogHeader>

        <div className="grid gap-3 p-5 sm:p-6">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "surface-soft flex items-center justify-between gap-3 px-4 py-4 text-sm transition hover:border-white/20 hover:bg-white/[0.04]",
                item.active && "border-white/20 bg-white/[0.05]"
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-zinc-200">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 truncate text-base font-medium text-white">{item.label}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </Link>
          ))}
        </div>

        <div className="border-t border-white/10 px-5 py-5 sm:px-6 sm:py-6">
          <LogoutButton className="w-full justify-center" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
