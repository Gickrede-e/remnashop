"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AppBottomNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type AppBottomNavProps = {
  items: AppBottomNavItem[];
  moreOpen: boolean;
  moreSheetId?: string;
  onOpenMore: () => void;
};

export function AppBottomNav({ items, moreOpen, moreSheetId, onOpenMore }: AppBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[color-mix(in_srgb,var(--app-bg)_94%,transparent)] px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch gap-1 rounded-[26px] border border-white/10 bg-white/[0.04] p-1">
        {items.map((item) => {
          const content = (
            <>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </>
          );

          if (item.href === "#more") {
            return (
              <button
                key={item.href}
                type="button"
                className={cn(
                  "flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-[11px] font-medium text-zinc-400 transition",
                  item.active && "bg-white/[0.08] text-white"
                )}
                onClick={onOpenMore}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                aria-controls={moreSheetId}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-[11px] font-medium text-zinc-400 transition",
                item.active && "bg-white/[0.08] text-white"
              )}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
