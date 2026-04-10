"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { AppShellFooterActions } from "@/components/shell/app-shell-footer-actions";
import { ScreenHeader } from "@/components/shell/screen-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { AppFooterAction, AppShellArea } from "@/lib/ui/app-shell-nav";
import { cn } from "@/lib/utils";

type AppMoreSheetItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type AppMoreSheetProps = {
  area: AppShellArea;
  primaryItems: AppMoreSheetItem[];
  secondaryItems: AppMoreSheetItem[];
  footerActions: AppFooterAction[];
  open: boolean;
  contentId?: string;
  onOpenChange: (open: boolean) => void;
};

const descriptions = {
  dashboard: "Дополнительные разделы кабинета и реферальные инструменты.",
  admin: "Второстепенные разделы управления, отчёты и переход обратно в кабинет."
} satisfies Record<AppShellArea, string>;

function renderSheetLink(item: AppMoreSheetItem, onOpenChange: (open: boolean) => void) {
  return (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => onOpenChange(false)}
      aria-current={item.active ? "page" : undefined}
      className={cn("appMoreSheetLink surface-soft", item.active && "is-active")}
    >
      <span className="appMoreSheetLinkGroup">
        <span className="appMoreSheetIcon">
          <item.icon className="iconMd" />
        </span>
        <span className="appMoreSheetLabel">{item.label}</span>
      </span>
      <ArrowRight className="appMoreSheetArrow iconSm iconNoShrink" />
    </Link>
  );
}

export function AppMoreSheet({
  area,
  primaryItems,
  secondaryItems,
  footerActions,
  open,
  contentId,
  onOpenChange
}: AppMoreSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id={contentId}
        className="appMoreSheet appMoreSheetContent dialogSurface"
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
          <p className="appNavRailSectionLabel">Основное</p>
          {primaryItems.map((item) => renderSheetLink(item, onOpenChange))}
        </div>

        <div className="appMoreSheetBody">
          <p className="appNavRailSectionLabel">Дополнительно</p>
          {secondaryItems.map((item) => renderSheetLink(item, onOpenChange))}
        </div>

        <AppShellFooterActions actions={footerActions} variant="sheet" onAction={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
