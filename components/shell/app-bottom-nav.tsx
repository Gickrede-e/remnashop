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
    <nav className="appBottomNav" aria-label="Быстрая навигация">
      <div className="appBottomNavFrame">
        {items.map((item) => {
          const content = (
            <>
              <span className="appBottomNavIcon">
                <item.icon className="h-4 w-4 shrink-0" />
              </span>
              <span className="appBottomNavLabel">{item.label}</span>
            </>
          );

          if (item.href === "#more") {
            return (
              <button
                key={item.href}
                type="button"
                className={cn("appBottomNavLink moreTrigger", item.active && "is-active")}
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
              className={cn("appBottomNavLink", item.active && "is-active")}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
