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
        className="appMoreSheet dialogSurface !left-0 !top-auto !bottom-0 !w-full !translate-x-0 !translate-y-0 max-h-[85dvh] overflow-y-auto rounded-b-none rounded-t-[32px] border-x-0 border-b-0 p-0 sm:!left-1/2 sm:!top-1/2 sm:!bottom-auto sm:!w-[min(92vw,560px)] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:max-h-[min(80vh,720px)] sm:rounded-[28px] sm:border"
      >
        <DialogHeader className="dialogHeader appMoreSheetHeader">
          <DialogTitle className="sr-only">Ещё разделы</DialogTitle>
          <DialogDescription className="sr-only">{descriptions[area]}</DialogDescription>
          <ScreenHeader
            compact
            eyebrow="Навигация"
            title="Ещё разделы"
            titleAs="p"
            description={descriptions[area]}
            className="appMoreSheetHeading"
          />
        </DialogHeader>

        <div className="appMoreSheetBody">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              aria-current={item.active ? "page" : undefined}
              className={cn("appMoreSheetLink surface-soft", item.active && "is-active")}
            >
              <span className="appMoreSheetLinkGroup">
                <span className="appMoreSheetIcon">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="appMoreSheetLabel">{item.label}</span>
              </span>
              <ArrowRight className="appMoreSheetArrow h-4 w-4 shrink-0" />
            </Link>
          ))}
        </div>

        <div className="appMoreSheetFooter">
          <LogoutButton className="appMoreSheetLogout" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
