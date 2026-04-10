"use client";

import { type LucideIcon } from "lucide-react";

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
  void items;
  void moreOpen;
  void moreSheetId;
  void onOpenMore;

  return null;
}
