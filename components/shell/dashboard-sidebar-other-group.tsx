"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

const STORAGE_KEY = "dashboardSidebar.otherStuff.open";

export function DashboardSidebarOtherGroup({ children }: { children: ReactNode }) {
  // По макету секция раскрыта по умолчанию; localStorage хранит только
  // явное решение пользователя её свернуть.
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    try {
      return window.localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  });

  return (
    <details
      className="dashSidebarOther"
      open={open}
      onToggle={(event) => {
        const next = (event.currentTarget as HTMLDetailsElement).open;
        setOpen(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        } catch {
          // ignore
        }
      }}
    >
      <summary className="dashSidebarOtherSummary">
        <span className="dashSidebarOtherLabel">Другое</span>
        <ChevronRight className="dashSidebarOtherChevron" aria-hidden="true" />
      </summary>
      <div className="dashSidebarOtherBody">{children}</div>
    </details>
  );
}
