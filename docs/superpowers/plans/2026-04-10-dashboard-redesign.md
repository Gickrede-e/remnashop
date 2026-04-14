# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Target executor:** codex-5.4 xhigh.
>
> **Sibling plan:** `2026-04-10-auth-pages-redesign.md` defined the monochrome `overrrides` palette and wired `--font-mono` (JetBrains Mono) into `app/layout.tsx`. This plan reuses both — execute the auth plan first if it has not been merged.

**Goal:** Rebuild the dashboard so the left sidebar matches the `overrrides` reference (fixed left, monospace, brand block on top, expandable "OTHER STUFF" group, primary CTA + LOG OUT block on the bottom). Rebuild every dashboard page (`/dashboard`, `/dashboard/buy`, `/dashboard/devices`, `/dashboard/history`, `/dashboard/referrals`) using the AdminHub structural template (top stat tiles → main card grid with tables / lists), but rendered fully in the monochrome dark palette from the auth pages — no purple, no blue, no AdminHub status colors. The admin area inherits the same sidebar shell as a side effect (the sidebar component is shared), but admin page **bodies** are not rebuilt in this plan.

**Architecture:** Rewrite the existing `components/shell/app-nav-rail.tsx` in place so `AppShell` keeps working without import-path churn. Strip `AppTopbar` and `AppMoreSheet` from `AppShell` for every area — the new sidebar is self-contained and the design has no topbar. Update `lib/ui/app-shell-nav.ts` so primary nav contains every dashboard / admin route directly (no more `#more` placeholder), and add a new "other" slot for items that live inside the collapsible "OTHER STUFF" group. Rebuild dashboard widgets around a small set of new shared CSS classes (`.dash*` prefix) so the AdminHub-style cards stay isolated from the legacy `.telemetry*` / `.command*` styles, then delete the legacy classes once `rg` confirms zero consumers.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, plain CSS in `app/globals.css`, lucide-react icons, Vitest.

---

## Visual Reference

### Sidebar (`overrrides` reference, screenshot 1)

- Fixed left, full viewport height, **flush to the left edge of the screen** (no outer margin, no gutter — `position: fixed; top: 0; left: 0;`).
- Width `clamp(15rem, 18vw, 16.5rem)` on desktop, collapses on mobile via the existing mobile pattern (see Task 4).
- Background `var(--canvas-0)` (`#090909`), right border `1px solid var(--surface-line)`.
- Brand block at the top:
  - Wordmark "GICKSHOP" in monospace, weight 700, letter-spacing `0.08em`, `var(--text-primary)`.
  - Subtitle line "VPN КАБИНЕТ" / "ПАНЕЛЬ АДМИНА" / "ГОСТЕВОЙ КОНТУР" in `var(--text-tertiary)`, monospace, uppercase, very small (`0.65rem`), letter-spacing `0.18em`.
- Primary nav list under the brand:
  - Each row: `<icon>` + label, monospace, `0.9rem`, padding `0.6rem 0.9rem`.
  - Inactive: `var(--text-secondary)` text, transparent background.
  - Hover: `var(--text-primary)` text, background `rgba(255,255,255,0.04)`.
  - Active: `var(--text-primary)` text, background `rgba(255,255,255,0.06)`, **inset border-left** `2px solid var(--text-primary)`, subtle outer border `1px solid var(--surface-line)`. The active row also gets `font-weight: 700`.
- "OTHER STUFF" group:
  - Section label `OTHER STUFF` in `var(--text-tertiary)`, uppercase, `0.65rem`, letter-spacing `0.22em`.
  - Trailing chevron toggles a `<details>`/state-driven dropdown that reveals the secondary items. Use a real `<details>` element so the behavior survives without JS hydration.
- Footer block (always pinned to the bottom):
  - **Primary CTA** styled like the auth `.authStandaloneSubmit` pill: `var(--text-primary)` background, `var(--canvas-0)` text, full-width inside the sidebar, monospace uppercase. Label: "КУПИТЬ ПОДПИСКУ" for dashboard, "В КАБИНЕТ" for admin, "ВОЙТИ" for public.
  - **Logout row** (only when authenticated): power-off icon + "LOG OUT" + the user's email on a second line in `var(--text-tertiary)`, `0.7rem`. Uses a `form` posting to `/api/auth/logout` (already exists in the codebase — confirm the route under `app/api/auth/logout/route.ts` and reuse it).

### Dashboard pages (AdminHub reference, screenshot 2 — adapted to monochrome)

For **every** dashboard page (`/dashboard`, `/dashboard/buy`, `/dashboard/devices`, `/dashboard/history`, `/dashboard/referrals`):

- Top **page header**:
  - `<h1>` in monospace, `clamp(1.75rem, 3vw, 2.5rem)`, weight 700, `var(--text-primary)`.
  - Breadcrumb row directly under the title: `Dashboard › <Page>` with `›` chevron (use `lucide-react` `ChevronRight`). Inactive crumbs use `var(--text-tertiary)`, current crumb uses `var(--text-primary)`.
  - Right-aligned action button (where applicable, e.g. "Купить подписку" on overview → links to `/dashboard/buy`). Pill-shaped, `var(--text-primary)` background, `var(--canvas-0)` text.
- **Stat tiles row**: `grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));` `gap: 1.5rem;`. Each tile:
  - Background `var(--canvas-1)`, border `1px solid var(--surface-line)`, border-radius `1.25rem`, padding `1.5rem`.
  - Left: icon square `4rem × 4rem`, border `1px solid var(--surface-line)`, background `rgba(255,255,255,0.04)`, icon in `var(--text-primary)`.
  - Right: big numeric/text value (`1.75rem`, `var(--text-primary)`, weight 700) and a small label (`0.78rem`, `var(--text-tertiary)`, uppercase).
- **Main card grid** below the stat tiles: two flexible columns (`flex-wrap`, `flex-basis: 30rem` for the wider card, `20rem` for the narrower card). Each card:
  - Same `--canvas-1` surface, `--surface-line` border, `1.25rem` radius, `1.5rem` padding.
  - Card head: title (`1.25rem`, weight 600, `var(--text-primary)`) on the left, icon affordances on the right (search / filter / plus — all monospace-friendly). Use a hairline `border-bottom: 1px solid var(--surface-line)` between head and body.
  - Card body: table or list in the new monochrome shapes described below.
- **Tables**:
  - Header row: `border-bottom: 1px solid var(--surface-line)`, label `0.7rem` uppercase `var(--text-tertiary)` letter-spacing `0.16em`.
  - Body rows: `padding: 0.95rem 0`, `border-bottom: 1px solid rgba(255,255,255,0.04)`, hover background `rgba(255,255,255,0.03)`.
  - Avatar / leading cell: `2.25rem` rounded square with `var(--canvas-0)` background and `1px solid var(--surface-line)` border (no real images — use the user initial or a `lucide` glyph).
  - **Status pills** are monochrome:
    - `completed` → solid pill, `var(--text-primary)` background, `var(--canvas-0)` text.
    - `pending` → outlined pill, transparent background, `1px solid var(--text-secondary)`, text `var(--text-secondary)`.
    - `process` → outlined pill, `1px dashed var(--text-tertiary)`, text `var(--text-tertiary)`.
    - `failed` → outlined pill, `1px solid #c46a6a`, text `#e89494`.
- **Todos / list cards**:
  - Each item is a row in `var(--canvas-0)` (slightly darker than the card to create contrast inside `--canvas-1`), border `1px solid var(--surface-line)`, padding `0.85rem 1.1rem`, `border-radius: 0.75rem`, gap `0.85rem`.
  - "Completed" rows get `border-left: 2px solid var(--text-primary)`. "Not completed" rows get `border-left: 2px solid var(--text-tertiary)`. **No blue, no orange.**

**Strict palette rules** (re-state):
- Backgrounds: `var(--canvas-0)` for the page and inner row surfaces, `var(--canvas-1)` for cards.
- Borders: `var(--surface-line)` for hairlines.
- Text: `var(--text-primary)` (high), `var(--text-secondary)` (mid), `var(--text-tertiary)` (low).
- Accent: **none**. Do not use `--accent-primary` (`#d6ff3f`), do not introduce blue/orange/yellow/red gradients. The only "accent" is white-on-black contrast.
- Font: `var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` for **everything inside the dashboard**, applied via `.dashShell` (see CSS).

---

## File Map

### Create

- `components/shell/dashboard-sidebar.tsx`
  - New stand-alone sidebar component. Used by `AppShell` for all areas. Re-exports `AppNavRail` as a deprecated alias inside the same file so existing imports continue to compile during the transition (`export const AppNavRail = DashboardSidebar`). Direct imports are migrated in Task 2.
- `components/shell/dashboard-sidebar-other-group.tsx`
  - Tiny client component that wraps a `<details>` element with a chevron icon and persists open state in `localStorage` under the key `dashboardSidebar.otherStuff.open`. Stays interactive after hydration.
- `components/blocks/dashboard/dashboard-page-header.tsx`
  - Reusable page header with `<h1>`, breadcrumb crumbs, and an optional `action` slot. Replaces every direct usage of `ScreenHeader` inside `app/dashboard/**`.
- `components/blocks/dashboard/dashboard-stat-tile.tsx`
  - Single stat tile (icon square + value + label). Used by every dashboard page.
- `components/blocks/dashboard/dashboard-card.tsx`
  - Card shell (head + body). Accepts `title`, optional `actions` slot, and `children`. Used by tables and todo lists.
- `components/blocks/dashboard/dashboard-overview-blocks.new.tsx` *(temporary file name during the rewrite — see Task 5; the final file replaces the existing one with the same name)*

### Modify

- `app/layout.tsx`
  - Confirm the JetBrains Mono `.variable` from the auth plan is on `<html>`. If the auth plan has not been merged yet, add it now and add a comment that the auth plan owns this token.
- `app/dashboard/layout.tsx`
  - Pass the user email and `subscription.status` flag through to the new sidebar via a new `accountSummary` prop on `AppShell` (see Task 3). Continue to call `getSession()` and redirect unauthenticated users to `/login`.
- `app/admin/layout.tsx`
  - Pass the same `accountSummary` shape so the admin sidebar footer also shows the email. Do not touch admin route bodies.
- `app/dashboard/page.tsx`
  - Drop `ScreenHeader`, render `DashboardPageHeader` + the new `DashboardOverviewBlocks`. Wrap everything in `<div className="dashShell dashWorkspace">`.
- `app/dashboard/buy/page.tsx`
  - Drop `ScreenHeader`. Render `DashboardPageHeader` (title "Купить", breadcrumbs `Dashboard › Купить`). Render `DashboardBuyBlocks` (see Task 6).
- `app/dashboard/devices/page.tsx`
  - Drop `ScreenHeader`. Render `DashboardPageHeader` (title "Устройства"). Render `DashboardDevicesBlocks` (see Task 6).
- `app/dashboard/history/page.tsx`
  - Drop `ScreenHeader`. Render `DashboardPageHeader` (title "История"). Render `DashboardHistoryBlocks` (see Task 6).
- `app/dashboard/referrals/page.tsx`
  - Drop `ScreenHeader`. Render `DashboardPageHeader` (title "Рефералы"). Render `DashboardReferralsBlocks` (see Task 6).
- `components/shell/app-shell.tsx`
  - Stop importing / rendering `AppTopbar` and `AppMoreSheet`. Drop the `useState` for `moreOpen`. Replace `AppNavRail` with `DashboardSidebar`. Accept the new `accountSummary` prop and pass it through. Keep `area`, `canAccessAdmin`, `children`. Remove the `appShellViewport` `container` wrapper (the new layout is sidebar + main with no centered container) — replace it with `.dashShell` + `.dashShellMain`.
- `components/shell/app-nav-rail.tsx`
  - Replace the file contents with a `re-export` from `dashboard-sidebar.tsx`:
    ```ts
    export { DashboardSidebar as AppNavRail } from "@/components/shell/dashboard-sidebar";
    ```
  - This keeps any stale imports compiling until they are migrated. Delete the file in Task 9 once `rg -n "app-nav-rail" app components __tests__` returns zero hits.
- `lib/ui/app-shell-nav.ts`
  - Add a new `slot: "other"` value to `AppNavItem`. Remove every `#more` entry from the primary lists. Move existing secondary items into the `other` slot. Add a new `getOtherNavItems(area, options)` exported helper that returns the items grouped under "OTHER STUFF". Keep `getPrimaryNavItems` and `getFooterActions` exported, but rewrite them so:
    - Dashboard primary: `Обзор / Купить / Устройства / История / Рефералы`.
    - Dashboard other: `Профиль` (links to `#profile` placeholder, drops if no target), `Админка` (only if `canAccessAdmin`).
    - Admin primary: `Обзор / Пользователи / Платежи / Тарифы / Промокоды`.
    - Admin other: `Рефералы / Логи / Экспорт / Личный кабинет`.
    - Public primary: `Главная / Тарифы / FAQ / Условия`.
    - Public other: `[]` (empty — group hides).
  - Add a new `getPrimaryCta(area, options)` helper that returns `{ label, href }` for the BUY NOW slot:
    - dashboard authenticated → `{ label: "КУПИТЬ ПОДПИСКУ", href: "/dashboard/buy" }`
    - admin authenticated → `{ label: "В КАБИНЕТ", href: "/dashboard" }`
    - public/unauthenticated → `{ label: "ВОЙТИ", href: "/login" }`
- `app/globals.css`
  - Add the new `.dashSidebar*`, `.dashShell*`, `.dashWorkspace`, `.dashPageHeader*`, `.dashStatTile*`, `.dashCard*`, `.dashTable*`, `.dashStatusPill*`, `.dashList*` rules from the **Target CSS Contracts** section. Delete the `.appNavRail*`, `.appTopbar*`, `.appMoreSheet*`, `.appShell*` (except `.appShell` itself if still used as a body class), `.appBottomNav*`, `.dashboardWorkspace*`, `.dashboardOverview*`, `.dashboardSurfacePage`, `.dashboardSection`, `.dashboardActionRow`, `.dashboardHero`, `.telemetryHero*`, `.telemetryGrid`, `.telemetryMetric*`, `.telemetryPanelLabel`, `.commandPanel*`, `.commandButton*`, `.commandRow`, `.commandDialog*`, `.commandError`, `.referralPanel*`, `.referralLink*`, `.devicePanel*`, `.deviceList*`, `.deviceGuide*`, `.deviceCounter`, `.deviceToolbar*`, `.deviceWorkspace`, `.checkoutWorkspace`, `.checkoutPlan*`, `.checkoutSummary*`, `.checkoutPromo*`, `.checkoutProvider*`, `.checkoutPayment*`, `.checkoutStatus`, `.historyWorkspace`, `.referralWorkspace`, `.screenHeader*`, `.dataSummaryGrid`, `.dataDetailPill*` selectors after Task 6 confirms zero runtime consumers. Run the audit grep before deleting any block.

### Component bodies that get rebuilt (separately listed because they each need their own sub-step in Task 6)

- `components/blocks/dashboard/dashboard-overview-blocks.tsx`
- `components/dashboard/payment-checkout.tsx`
- `components/blocks/dashboard/device-list.tsx`
- `components/blocks/dashboard/payment-history-list.tsx`
- `components/blocks/dashboard/referral-summary-blocks.tsx`
- `components/blocks/dashboard/reissue-subscription-button.tsx`

The **business logic** (Prisma data fetching, server actions, schema validation, dialog open state, fetch calls) inside each of these files is preserved byte-for-byte. Only the JSX returned and the imports of UI primitives change.

### Delete (after audit)

- `components/shell/app-topbar.tsx`
- `components/shell/app-more-sheet.tsx`
- `components/shell/app-bottom-nav.tsx`
- `components/shell/app-shell-footer-actions.tsx`
- `components/shell/app-nav-rail.tsx` (delete the re-export shim only after Task 9 confirms zero callers)
- `components/shell/screen-header.tsx`
- `__tests__/components/shell/more-trigger-a11y.test.ts`

### Do NOT touch

- `lib/auth/session.ts`, `lib/auth/navigation.ts`, `lib/services/*`, `lib/schemas/*`, `lib/public-env.ts`
- `app/api/**/*` (except read-only confirmation that `/api/auth/logout` exists for the sidebar logout form)
- Any Prisma schema or database migration
- The auth pages from the sibling plan (`/login`, `/register`)
- Public pages (`/`, `/pricing`, `/faq`, `/terms`) — they should continue to render but only via the shared sidebar shell, not via redesigned content
- Any admin route body (only the sidebar that wraps them changes)
- The `components/ui/*` primitives (`Button`, `Input`, `Label`, `Dialog`, `Table`, etc.). The new dashboard widgets use raw HTML elements styled by the new CSS, just like the auth pages. Existing dialogs (like the reissue subscription dialog) keep their `Dialog` primitive — only the trigger button and inner content classes change.

---

## Target Markup Contracts

### `DashboardSidebar`

```tsx
<aside className="dashSidebar" data-testid="app-nav-rail" aria-label="Навигация кабинета">
  <div className="dashSidebarBrand">
    <p className="dashSidebarBrandWordmark">{publicEnv.NEXT_PUBLIC_SITE_NAME?.toUpperCase() ?? "GICKSHOP"}</p>
    <p className="dashSidebarBrandTagline">{areaTagline}</p>
  </div>

  <nav className="dashSidebarNav" aria-label="Основная навигация">
    {primaryItems.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        aria-current={item.active ? "page" : undefined}
        className={cn("dashSidebarLink", item.active && "is-active")}
      >
        <item.icon className="dashSidebarLinkIcon" aria-hidden="true" />
        <span className="dashSidebarLinkLabel">{item.label}</span>
      </Link>
    ))}
  </nav>

  {otherItems.length > 0 ? (
    <DashboardSidebarOtherGroup>
      {otherItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn("dashSidebarLink dashSidebarLinkOther", item.active && "is-active")}
        >
          <item.icon className="dashSidebarLinkIcon" aria-hidden="true" />
          <span className="dashSidebarLinkLabel">{item.label}</span>
        </Link>
      ))}
    </DashboardSidebarOtherGroup>
  ) : null}

  <div className="dashSidebarFooter">
    <Link href={primaryCta.href} className="dashSidebarCta">
      {primaryCta.label}
    </Link>
    {accountSummary ? (
      <form action="/api/auth/logout" method="post" className="dashSidebarLogoutRow">
        <button type="submit" className="dashSidebarLogoutBtn">
          <PowerIcon className="dashSidebarLogoutIcon" aria-hidden="true" />
          <span>LOG OUT</span>
        </button>
        <p className="dashSidebarLogoutEmail">{accountSummary.email}</p>
      </form>
    ) : null}
  </div>
</aside>
```

- `data-testid="app-nav-rail"` is preserved so existing accessibility tests that look it up keep working.
- `<details>`-based "OTHER STUFF" group is the responsibility of `DashboardSidebarOtherGroup`. The summary row contains a chevron and the literal text `OTHER STUFF`.
- `cn` is the existing utility from `lib/utils.ts`.
- `PowerIcon` comes from `lucide-react` (`Power`).

### `DashboardSidebarOtherGroup`

```tsx
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

const STORAGE_KEY = "dashboardSidebar.otherStuff.open";

export function DashboardSidebarOtherGroup({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

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
        <span className="dashSidebarOtherLabel">OTHER STUFF</span>
        <ChevronRight className="dashSidebarOtherChevron" aria-hidden="true" />
      </summary>
      <div className="dashSidebarOtherBody">{children}</div>
    </details>
  );
}
```

### `AppShell` (after rewrite)

```tsx
"use client";

import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";

import { DashboardSidebar } from "@/components/shell/dashboard-sidebar";
import {
  getFooterActions,
  getOtherNavItems,
  getPrimaryCta,
  getPrimaryNavItems,
  isNavItemActive,
  type AppNavItem,
  type AppShellNavArea
} from "@/lib/ui/app-shell-nav";
import { resolveNavIcon } from "@/lib/ui/nav-icons";

type AppShellProps = {
  area: AppShellNavArea;
  canAccessAdmin?: boolean;
  accountSummary?: { email: string } | null;
  children: React.ReactNode;
};

function decorate(area: AppShellNavArea, items: AppNavItem[], pathname: string) {
  return items.map((item) => ({
    ...item,
    icon: resolveNavIcon(area, item.href),
    active: isNavItemActive(pathname, item.href)
  }));
}

export function AppShell({ area, canAccessAdmin = false, accountSummary = null, children }: AppShellProps) {
  const pathname = usePathname();
  const authenticated = Boolean(accountSummary);
  const primaryItems = decorate(area, getPrimaryNavItems(area), pathname);
  const otherItems = decorate(area, getOtherNavItems(area, { canAccessAdmin }), pathname);
  const primaryCta = getPrimaryCta(area, { authenticated });

  return (
    <div className="dashShell" data-area={area}>
      <a href="#dash-shell-main" className="dashSkipLink">
        Перейти к содержимому
      </a>
      <DashboardSidebar
        area={area}
        primaryItems={primaryItems}
        otherItems={otherItems}
        primaryCta={primaryCta}
        accountSummary={accountSummary}
      />
      <main id="dash-shell-main" data-testid="app-shell-main" className="dashShellMain" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
```

- The icon resolver is moved into a small helper file `lib/ui/nav-icons.ts` (create it as part of Task 3) so `app-shell.tsx` does not own a giant icon map. The helper exports a single `resolveNavIcon(area, href)` function backed by the existing `navIcons` record from the current `app-shell.tsx`.
- The `data-area` attribute is used by CSS in case the sidebar needs to adjust the brand tagline color per area.
- `getFooterActions` becomes unused — delete it from `lib/ui/app-shell-nav.ts` in Task 3.

### `DashboardPageHeader`

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Crumb = { label: string; href?: string };

type DashboardPageHeaderProps = {
  title: string;
  crumbs: Crumb[];
  action?: ReactNode;
};

export function DashboardPageHeader({ title, crumbs, action }: DashboardPageHeaderProps) {
  return (
    <header className="dashPageHeader">
      <div className="dashPageHeaderText">
        <h1 className="dashPageTitle">{title}</h1>
        <ol className="dashBreadcrumb">
          {crumbs.map((crumb, index) => (
            <li key={`${crumb.label}-${index}`} className="dashBreadcrumbItem">
              {crumb.href ? (
                <Link href={crumb.href} className="dashBreadcrumbLink">
                  {crumb.label}
                </Link>
              ) : (
                <span className="dashBreadcrumbCurrent" aria-current="page">
                  {crumb.label}
                </span>
              )}
              {index < crumbs.length - 1 ? (
                <ChevronRight className="dashBreadcrumbSep" aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
      {action ? <div className="dashPageHeaderAction">{action}</div> : null}
    </header>
  );
}
```

### `DashboardStatTile`

```tsx
import type { LucideIcon } from "lucide-react";

type DashboardStatTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function DashboardStatTile({ icon: Icon, label, value }: DashboardStatTileProps) {
  return (
    <article className="dashStatTile">
      <div className="dashStatTileIcon">
        <Icon className="dashStatTileGlyph" aria-hidden="true" />
      </div>
      <div className="dashStatTileBody">
        <p className="dashStatTileValue">{value}</p>
        <p className="dashStatTileLabel">{label}</p>
      </div>
    </article>
  );
}
```

### `DashboardCard`

```tsx
import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function DashboardCard({ title, actions, children }: DashboardCardProps) {
  return (
    <section className="dashCard">
      <header className="dashCardHead">
        <h2 className="dashCardTitle">{title}</h2>
        {actions ? <div className="dashCardActions">{actions}</div> : null}
      </header>
      <div className="dashCardBody">{children}</div>
    </section>
  );
}
```

---

## Target CSS Contracts

Add the following inside the existing `@layer components` block in `app/globals.css`. Place it **after** the auth-page block from the sibling plan so the cascade is consistent. Variables already exist in `:root`.

```css
@layer components {
  .dashShell {
    display: grid;
    grid-template-columns: clamp(15rem, 18vw, 16.5rem) minmax(0, 1fr);
    min-height: 100dvh;
    background: var(--canvas-0);
    color: var(--text-primary);
    font-family: var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .dashShellMain {
    min-width: 0;
    padding: clamp(1.75rem, 3vw, 2.75rem);
    display: grid;
    gap: clamp(1.5rem, 2.5vw, 2rem);
    align-content: start;
  }

  .dashSkipLink {
    position: absolute;
    left: -9999px;
  }
  .dashSkipLink:focus {
    left: 1rem;
    top: 1rem;
    padding: 0.5rem 0.75rem;
    background: var(--text-primary);
    color: var(--canvas-0);
    z-index: 9999;
  }

  /* Sidebar */

  .dashSidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: clamp(15rem, 18vw, 16.5rem);
    display: grid;
    grid-template-rows: auto auto auto 1fr auto;
    gap: 1.25rem;
    padding: 1.5rem 1rem 1.25rem;
    background: var(--canvas-0);
    border-right: 1px solid var(--surface-line);
    z-index: 50;
    overflow-y: auto;
  }

  .dashShellMain {
    margin-left: clamp(15rem, 18vw, 16.5rem);
    padding-left: clamp(1.75rem, 3vw, 2.75rem);
  }

  .dashSidebarBrand {
    display: grid;
    gap: 0.35rem;
    padding: 0.5rem 0.75rem 1rem;
    border-bottom: 1px solid var(--surface-line);
  }

  .dashSidebarBrandWordmark {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .dashSidebarBrandTagline {
    margin: 0;
    color: var(--text-tertiary);
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .dashSidebarNav {
    display: grid;
    gap: 0.25rem;
  }

  .dashSidebarLink {
    display: grid;
    grid-template-columns: 1.25rem 1fr;
    align-items: center;
    gap: 0.85rem;
    padding: 0.6rem 0.9rem;
    border-radius: 0.65rem;
    border: 1px solid transparent;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-decoration: none;
    transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
  }

  .dashSidebarLink:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-primary);
  }

  .dashSidebarLink.is-active {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-primary);
    font-weight: 700;
    border-color: var(--surface-line);
    box-shadow: inset 2px 0 0 var(--text-primary);
  }

  .dashSidebarLinkIcon {
    width: 1.1rem;
    height: 1.1rem;
  }

  .dashSidebarOther {
    display: grid;
    gap: 0.25rem;
  }

  .dashSidebarOther > .dashSidebarOtherSummary {
    list-style: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.9rem;
    color: var(--text-tertiary);
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .dashSidebarOther > .dashSidebarOtherSummary::-webkit-details-marker {
    display: none;
  }

  .dashSidebarOtherChevron {
    width: 0.85rem;
    height: 0.85rem;
    transition: transform 140ms ease;
  }

  .dashSidebarOther[open] .dashSidebarOtherChevron {
    transform: rotate(90deg);
  }

  .dashSidebarOtherBody {
    display: grid;
    gap: 0.25rem;
    padding-top: 0.25rem;
  }

  .dashSidebarFooter {
    display: grid;
    gap: 0.85rem;
    padding-top: 1rem;
    border-top: 1px solid var(--surface-line);
  }

  .dashSidebarCta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    border-radius: 999px;
    background: var(--text-primary);
    color: var(--canvas-0);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-decoration: none;
    transition: background-color 140ms ease, transform 140ms ease;
  }

  .dashSidebarCta:hover {
    background: #ffffff;
    transform: translateY(-1px);
  }

  .dashSidebarLogoutRow {
    display: grid;
    gap: 0.15rem;
    margin: 0;
  }

  .dashSidebarLogoutBtn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .dashSidebarLogoutBtn:hover {
    color: var(--text-primary);
  }

  .dashSidebarLogoutIcon {
    width: 0.9rem;
    height: 0.9rem;
  }

  .dashSidebarLogoutEmail {
    margin: 0;
    color: var(--text-tertiary);
    font-size: 0.66rem;
    letter-spacing: 0.04em;
  }

  /* Page header */

  .dashWorkspace {
    display: grid;
    gap: clamp(1.5rem, 2.5vw, 2rem);
  }

  .dashPageHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .dashPageHeaderText {
    display: grid;
    gap: 0.5rem;
  }

  .dashPageTitle {
    margin: 0;
    color: var(--text-primary);
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .dashBreadcrumb {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--text-tertiary);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
  }

  .dashBreadcrumbItem {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .dashBreadcrumbLink {
    color: var(--text-tertiary);
    text-decoration: none;
  }

  .dashBreadcrumbLink:hover {
    color: var(--text-primary);
  }

  .dashBreadcrumbCurrent {
    color: var(--text-primary);
  }

  .dashBreadcrumbSep {
    width: 0.85rem;
    height: 0.85rem;
  }

  .dashPageHeaderAction .dashSidebarCta {
    /* The header action shares the CTA visual; prefer composing it via class. */
  }

  /* Stat tiles */

  .dashStatGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1.25rem;
  }

  .dashStatTile {
    display: flex;
    align-items: center;
    gap: 1.1rem;
    padding: 1.4rem;
    background: var(--canvas-1);
    border: 1px solid var(--surface-line);
    border-radius: 1.25rem;
  }

  .dashStatTileIcon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.75rem;
    height: 3.75rem;
    border: 1px solid var(--surface-line);
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-primary);
  }

  .dashStatTileGlyph {
    width: 1.5rem;
    height: 1.5rem;
  }

  .dashStatTileBody {
    display: grid;
    gap: 0.25rem;
  }

  .dashStatTileValue {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .dashStatTileLabel {
    margin: 0;
    color: var(--text-tertiary);
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  /* Cards */

  .dashCardGrid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .dashCardGrid > .dashCardWide {
    flex: 1 1 30rem;
    min-width: 0;
  }

  .dashCardGrid > .dashCardNarrow {
    flex: 1 1 20rem;
    min-width: 0;
  }

  .dashCard {
    display: grid;
    background: var(--canvas-1);
    border: 1px solid var(--surface-line);
    border-radius: 1.25rem;
    padding: 1.5rem;
  }

  .dashCardHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--surface-line);
  }

  .dashCardTitle {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .dashCardActions {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--text-tertiary);
  }

  .dashCardActions button,
  .dashCardActions a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--surface-line);
    border-radius: 0.55rem;
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-tertiary);
    cursor: pointer;
  }

  .dashCardActions button:hover,
  .dashCardActions a:hover {
    color: var(--text-primary);
  }

  /* Tables */

  .dashTable {
    width: 100%;
    border-collapse: collapse;
    color: var(--text-secondary);
    font-size: 0.82rem;
  }

  .dashTable thead th {
    text-align: left;
    padding: 0 0 0.85rem;
    border-bottom: 1px solid var(--surface-line);
    color: var(--text-tertiary);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .dashTable tbody td {
    padding: 0.95rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }

  .dashTable tbody tr:hover td {
    background: rgba(255, 255, 255, 0.03);
  }

  .dashTable .dashTableLead {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .dashTableAvatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.6rem;
    background: var(--canvas-0);
    border: 1px solid var(--surface-line);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 700;
  }

  /* Status pills */

  .dashStatusPill {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.85rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .dashStatusPill.is-completed {
    background: var(--text-primary);
    color: var(--canvas-0);
  }

  .dashStatusPill.is-pending {
    background: transparent;
    border: 1px solid var(--text-secondary);
    color: var(--text-secondary);
  }

  .dashStatusPill.is-process {
    background: transparent;
    border: 1px dashed var(--text-tertiary);
    color: var(--text-tertiary);
  }

  .dashStatusPill.is-failed {
    background: transparent;
    border: 1px solid #c46a6a;
    color: #e89494;
  }

  /* List rows (todos / shortcuts) */

  .dashList {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .dashListItem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    padding: 0.85rem 1.1rem;
    background: var(--canvas-0);
    border: 1px solid var(--surface-line);
    border-radius: 0.85rem;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .dashListItem.is-completed {
    border-left: 2px solid var(--text-primary);
    color: var(--text-primary);
  }

  .dashListItem.is-not-completed {
    border-left: 2px solid var(--text-tertiary);
  }

  .dashListItem .dashListIcon {
    width: 1rem;
    height: 1rem;
    color: var(--text-tertiary);
    cursor: pointer;
  }
}

@media (max-width: 768px) {
  .dashShell {
    grid-template-columns: 1fr;
  }

  .dashShellMain {
    margin-left: 0;
    padding: 1.25rem;
  }

  .dashSidebar {
    position: sticky;
    width: 100%;
    height: auto;
    grid-template-rows: auto auto auto auto auto;
    border-right: none;
    border-bottom: 1px solid var(--surface-line);
  }
}
```

> **Note on the sidebar grid + fixed positioning:** the sidebar is `position: fixed` so it stays glued to the left of the viewport while the main scrolls. The `.dashShell` grid still reserves a column the same width as the sidebar so content doesn't slide under it. The duplicate `margin-left` rule on `.dashShellMain` is intentional — `position: fixed` removes the sidebar from the grid flow, so the main needs an explicit offset.

---

## Task 1: Lock the New Navigation Contract in Tests

**Files:**
- Modify: `__tests__/lib/ui/app-shell-nav.test.ts`
- Test: `__tests__/lib/ui/app-shell-nav.test.ts`

- [ ] **Step 1: Rewrite the navigation test to describe the new shape**

Replace the existing test bodies in `__tests__/lib/ui/app-shell-nav.test.ts` so they assert:

- `getPrimaryNavItems("dashboard")` returns exactly `["Обзор", "Купить", "Устройства", "История", "Рефералы"]` and contains no `#more` href.
- `getPrimaryNavItems("admin")` returns exactly `["Обзор", "Пользователи", "Платежи", "Тарифы", "Промокоды"]`.
- `getPrimaryNavItems("public")` returns the four public items unchanged.
- `getOtherNavItems("dashboard", { canAccessAdmin: true })` includes an item with `href: "/admin"` and `slot: "other"`.
- `getOtherNavItems("dashboard", { canAccessAdmin: false })` does **not** include `/admin`.
- `getOtherNavItems("admin")` includes `/admin/referrals`, `/admin/logs`, `/admin/export`, and `/dashboard` with `slot: "other"`.
- `getOtherNavItems("public")` returns `[]`.
- `getPrimaryCta("dashboard", { authenticated: true })` returns `{ label: "КУПИТЬ ПОДПИСКУ", href: "/dashboard/buy" }`.
- `getPrimaryCta("admin", { authenticated: true })` returns `{ label: "В КАБИНЕТ", href: "/dashboard" }`.
- `getPrimaryCta("public", { authenticated: false })` returns `{ label: "ВОЙТИ", href: "/login" }`.
- `getFooterActions` no longer exists (assert `expect(navModule).not.toHaveProperty("getFooterActions")`).

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run __tests__/lib/ui/app-shell-nav.test.ts`

Expected: FAIL. The current module still exposes `getFooterActions`, primary lists still contain `#more`, and `getOtherNavItems` / `getPrimaryCta` are missing.

- [ ] **Step 3: Commit the failing-test checkpoint**

```bash
git add __tests__/lib/ui/app-shell-nav.test.ts
git commit -m "test(shell): describe new sidebar navigation contract"
```

## Task 2: Lock the New Sidebar Contract in Tests

**Files:**
- Modify: `__tests__/components/shell/app-shell-structure.test.ts`
- Delete: `__tests__/components/shell/more-trigger-a11y.test.ts`
- Test: `__tests__/components/shell/app-shell-structure.test.ts`

- [ ] **Step 1: Rewrite `app-shell-structure.test.ts`**

Replace the test bodies so they assert:

- `AppShell` renders a single `<aside class="dashSidebar">` element regardless of area.
- The sidebar exposes `data-testid="app-nav-rail"` so existing screen-reader tests keep finding it.
- The sidebar contains a brand wordmark text equal to `"GICKSHOP"` (or whatever `NEXT_PUBLIC_SITE_NAME.toUpperCase()` resolves to in the test mock — pick a fixed mock value and assert against it).
- The sidebar contains every primary nav label for the dashboard area in order, and **does not** contain a button labelled `"Ещё"`.
- The "OTHER STUFF" section is only present when `getOtherNavItems` returns at least one item.
- The footer CTA pill has the text `"КУПИТЬ ПОДПИСКУ"` for `area="dashboard"` and `accountSummary={{ email: "user@example.com" }}`.
- The logout row only renders when `accountSummary` is present, and its `<form>` has `action="/api/auth/logout"` and `method="post"`.
- `AppShell` renders `<main id="dash-shell-main" data-testid="app-shell-main">` and **does not** render any element matching `[data-testid="app-topbar"]`, `[data-testid="app-more-sheet"]`, or any class starting with `appNavRail`, `appTopbar`, `appMoreSheet`, `appBottomNav`.

Use mocks in this shape:

```ts
vi.mock("@/lib/public-env", () => ({
  publicEnv: { NEXT_PUBLIC_SITE_NAME: "GickShop" }
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard"
}));
```

- [ ] **Step 2: Delete `more-trigger-a11y.test.ts`**

The test exists only to validate the AppMoreSheet trigger. Once `AppMoreSheet` is gone (Task 3), the test has no subject. Delete it now to avoid a broken file.

```bash
git rm __tests__/components/shell/more-trigger-a11y.test.ts
```

- [ ] **Step 3: Run the shell test and confirm it fails**

Run: `npx vitest run __tests__/components/shell/app-shell-structure.test.ts`

Expected: FAIL. The current `AppShell` renders `AppTopbar`, `AppMoreSheet`, and the `appNavRail*` classes. Several assertions will fail simultaneously — that is correct.

- [ ] **Step 4: Commit the test checkpoint**

```bash
git add __tests__/components/shell/app-shell-structure.test.ts __tests__/components/shell/more-trigger-a11y.test.ts
git commit -m "test(shell): describe overrides-style dashboard sidebar"
```

## Task 3: Rewrite Navigation Contracts and Build the New Sidebar

**Files:**
- Modify: `lib/ui/app-shell-nav.ts`
- Create: `lib/ui/nav-icons.ts`
- Create: `components/shell/dashboard-sidebar.tsx`
- Create: `components/shell/dashboard-sidebar-other-group.tsx`
- Modify: `components/shell/app-shell.tsx`
- Modify: `components/shell/app-nav-rail.tsx`
- Modify: `app/dashboard/layout.tsx`
- Modify: `app/admin/layout.tsx`
- Test: `__tests__/lib/ui/app-shell-nav.test.ts`
- Test: `__tests__/components/shell/app-shell-structure.test.ts`

- [ ] **Step 1: Rewrite `lib/ui/app-shell-nav.ts`**

Implement the contracts from Task 1:

- Remove every `#more` entry.
- Add `slot: "primary" | "other"` to `AppNavItem` (drop `"secondary"`).
- Replace `getSecondaryNavItems` with `getOtherNavItems(area, options)`.
- Add `getPrimaryCta(area, options)`.
- Delete `getFooterActions` and the related types (`AppFooterAction`, `guestFooterActions`, `profileFooterAction`, etc.).
- Keep `isNavItemActive` unchanged.

The new dashboard primary list:

```ts
const dashboardPrimaryNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Обзор", slot: "primary" },
  { href: "/dashboard/buy", label: "Купить", slot: "primary" },
  { href: "/dashboard/devices", label: "Устройства", slot: "primary" },
  { href: "/dashboard/history", label: "История", slot: "primary" },
  { href: "/dashboard/referrals", label: "Рефералы", slot: "primary" }
];
```

The new admin primary list:

```ts
const adminPrimaryNavItems: AppNavItem[] = [
  { href: "/admin", label: "Обзор", slot: "primary" },
  { href: "/admin/users", label: "Пользователи", slot: "primary" },
  { href: "/admin/payments", label: "Платежи", slot: "primary" },
  { href: "/admin/plans", label: "Тарифы", slot: "primary" },
  { href: "/admin/promos", label: "Промокоды", slot: "primary" }
];
```

Other slot for admin:

```ts
const adminOtherNavItems: AppNavItem[] = [
  { href: "/admin/referrals", label: "Рефералы", slot: "other" },
  { href: "/admin/logs", label: "Логи", slot: "other" },
  { href: "/admin/export", label: "Экспорт", slot: "other" },
  { href: "/dashboard", label: "Личный кабинет", slot: "other" }
];
```

- [ ] **Step 2: Create `lib/ui/nav-icons.ts`**

Move the existing `navIcons` map and the `resolveIcon` helper out of `app-shell.tsx` into this new module. Export `resolveNavIcon(area, href)`. Keep the same lucide imports. Add new entries for the new dashboard primary set:

```ts
{
  "/dashboard": Gauge,
  "/dashboard/buy": CreditCard,
  "/dashboard/devices": Smartphone,
  "/dashboard/history": History,
  "/dashboard/referrals": Share2,
  "/admin": LayoutDashboard,
  "/admin/users": Users,
  "/admin/payments": CreditCard,
  "/admin/plans": Boxes,
  "/admin/promos": BadgePercent,
  "/admin/referrals": Share2,
  "/admin/logs": ClipboardList,
  "/admin/export": ArrowDownToLine,
  "/": Gauge,
  "/pricing": CreditCard,
  "/faq": ClipboardList,
  "/terms": BadgePercent
}
```

The fallback icon for unknown hrefs is `ArrowLeft` from lucide-react.

- [ ] **Step 3: Create `components/shell/dashboard-sidebar.tsx`**

Implement the markup from the **Target Markup Contracts → DashboardSidebar** section. The component is a server component (no `"use client"`). Imports:

```tsx
import Link from "next/link";
import { Power } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DashboardSidebarOtherGroup } from "@/components/shell/dashboard-sidebar-other-group";
import { publicEnv } from "@/lib/public-env";
import type { AppShellNavArea } from "@/lib/ui/app-shell-nav";
import { cn } from "@/lib/utils";
```

The `areaTagline` map:

```ts
const areaTagline: Record<AppShellNavArea, string> = {
  dashboard: "VPN КАБИНЕТ",
  admin: "ПАНЕЛЬ АДМИНА",
  public: "ГОСТЕВОЙ КОНТУР"
};
```

Props:

```ts
type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type DashboardSidebarProps = {
  area: AppShellNavArea;
  primaryItems: SidebarItem[];
  otherItems: SidebarItem[];
  primaryCta: { label: string; href: string };
  accountSummary: { email: string } | null;
};
```

- [ ] **Step 4: Create `components/shell/dashboard-sidebar-other-group.tsx`**

Implement exactly the snippet from the **Target Markup Contracts → DashboardSidebarOtherGroup** section. It is a client component (`"use client"`).

- [ ] **Step 5: Rewrite `components/shell/app-shell.tsx`**

Replace its contents with the snippet from the **Target Markup Contracts → AppShell** section. Verify with `rg`:

```bash
rg -n "AppTopbar|AppMoreSheet|moreOpen" components/shell/app-shell.tsx
```

Expected: zero hits.

- [ ] **Step 6: Replace `components/shell/app-nav-rail.tsx` with a re-export shim**

```ts
export { DashboardSidebar as AppNavRail } from "@/components/shell/dashboard-sidebar";
```

Do not delete the file yet — Task 9 audits and removes it.

- [ ] **Step 7: Update `app/dashboard/layout.tsx` to pass `accountSummary`**

```tsx
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await getUserById(session.userId);

  return (
    <AppShell
      area="dashboard"
      canAccessAdmin={session.role === "ADMIN"}
      accountSummary={{ email: user?.email ?? session.email ?? "" }}
    >
      {children}
    </AppShell>
  );
}
```

If `getUserById` is too heavy for the layout, fall back to `session.email` only — confirm the field exists on the session shape before relying on it. If it does not, leave `getUserById` in place.

- [ ] **Step 8: Update `app/admin/layout.tsx` similarly**

Pass the same `accountSummary` shape with the same email source. Keep all admin guard logic untouched.

- [ ] **Step 9: Run the focused shell tests**

Run:

```bash
npx vitest run __tests__/lib/ui/app-shell-nav.test.ts __tests__/components/shell/app-shell-structure.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit the sidebar implementation**

```bash
git add lib/ui/app-shell-nav.ts lib/ui/nav-icons.ts \
  components/shell/dashboard-sidebar.tsx \
  components/shell/dashboard-sidebar-other-group.tsx \
  components/shell/app-shell.tsx \
  components/shell/app-nav-rail.tsx \
  app/dashboard/layout.tsx app/admin/layout.tsx
git commit -m "feat(shell): rebuild dashboard sidebar in overrides style"
```

## Task 4: Add the New Sidebar and Workspace CSS

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Insert the new CSS blocks**

Append every CSS block from the **Target CSS Contracts** section to `app/globals.css`, **inside** the existing `@layer components` group, after the auth-page rules from the sibling plan.

- [ ] **Step 2: Verify the build still compiles**

Run:

```bash
npm run lint
npx vitest run __tests__/components/shell/app-shell-structure.test.ts
```

Expected: PASS for both. The dashboard pages will look broken in the browser at this point because their bodies still use the old `.telemetry*` / `.command*` classes — that is fixed in Task 6.

- [ ] **Step 3: Commit the CSS layer**

```bash
git add app/globals.css
git commit -m "feat(shell): add overrides-style sidebar and workspace styles"
```

## Task 5: Lock the Dashboard Overview Contract in Tests

**Files:**
- Modify: `__tests__/components/dashboard/dashboard-overview-blocks.test.ts`

- [ ] **Step 1: Rewrite the overview test for the new shape**

Replace the assertions so they describe the AdminHub-style overview:

- The overview renders a `<div class="dashWorkspace dashOverview">` (or equivalent) wrapper.
- It contains a `.dashStatGrid` with exactly three `.dashStatTile` children.
- Each stat tile renders a label and a value derived from the `subscription` prop:
  - tile 1 label `"СТАТУС"`, value derived from `subscription?.status` (mapped to a Russian string)
  - tile 2 label `"ДОСТУП ДО"`, value `formatDateTime(subscription.expiresAt)`
  - tile 3 label `"ТРАФИК"`, value `${formatBytes(subscription.trafficUsedBytes)} / ${formatBytes(subscription.trafficLimitBytes)}`
- It contains a `.dashCardGrid` with two cards: one with `class="dashCard dashCardWide"` (Recent Payments table) and one with `class="dashCard dashCardNarrow"` (Quick Actions list).
- The Recent Payments card title equals `"Последние операции"`.
- The Quick Actions card title equals `"Быстрые действия"` and lists: "Купить подписку", "Управлять устройствами", "Пригласить друга".
- The overview no longer contains any `.telemetry*`, `.commandPanel*`, or `.referralPanel*` classes.

- [ ] **Step 2: Run the overview test and confirm it fails**

Run: `npx vitest run __tests__/components/dashboard/dashboard-overview-blocks.test.ts`

Expected: FAIL.

- [ ] **Step 3: Commit the test**

```bash
git add __tests__/components/dashboard/dashboard-overview-blocks.test.ts
git commit -m "test(dashboard): describe AdminHub-style overview shape"
```

## Task 6: Rebuild Dashboard Page Bodies Around the New Contracts

**Files:**
- Create: `components/blocks/dashboard/dashboard-page-header.tsx`
- Create: `components/blocks/dashboard/dashboard-stat-tile.tsx`
- Create: `components/blocks/dashboard/dashboard-card.tsx`
- Modify: `components/blocks/dashboard/dashboard-overview-blocks.tsx`
- Modify: `components/blocks/dashboard/payment-history-list.tsx`
- Modify: `components/blocks/dashboard/device-list.tsx`
- Modify: `components/blocks/dashboard/referral-summary-blocks.tsx`
- Modify: `components/blocks/dashboard/reissue-subscription-button.tsx`
- Modify: `components/dashboard/payment-checkout.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/buy/page.tsx`
- Modify: `app/dashboard/devices/page.tsx`
- Modify: `app/dashboard/history/page.tsx`
- Modify: `app/dashboard/referrals/page.tsx`
- Test: `__tests__/components/dashboard/dashboard-overview-blocks.test.ts`
- Test: `__tests__/components/dashboard/dashboard-secondary-surfaces.test.ts`

- [ ] **Step 1: Create the three shared building blocks**

Create `dashboard-page-header.tsx`, `dashboard-stat-tile.tsx`, and `dashboard-card.tsx` from the **Target Markup Contracts** section. They are server components.

- [ ] **Step 2: Rewrite `dashboard-overview-blocks.tsx`**

Wrap everything in `<div className="dashWorkspace dashOverview">`. Render:

1. `<DashStatGrid>` with three `<DashboardStatTile>` instances:
   - icon `ShieldCheck`, label `"СТАТУС"`, value computed from `subscription.status` via a small inline `statusLabel` map (`ACTIVE → "Активна"`, `PENDING → "Ожидает"`, `EXPIRED → "Истекла"`, `DISABLED → "Отключена"`, `null → "Не оформлена"`).
   - icon `CalendarClock`, label `"ДОСТУП ДО"`, value `subscription ? formatDateTime(subscription.expiresAt) : "—"`.
   - icon `Gauge`, label `"ТРАФИК"`, value `subscription ? `${formatBytes(subscription.trafficUsedBytes)} / ${formatBytes(subscription.trafficLimitBytes)}` : "—"`.
2. A `.dashCardGrid`:
   - **Wide card** `<DashboardCard title="Последние операции" actions={<><Search /><Filter /></>}>`. Body is a `<table className="dashTable">` with columns `Пользователь | Дата | Статус`. The data source is the **referral link** message in the current overview — but per the rebuild, replace it with **the latest five `Payment` rows**. This requires the page to fetch payments — see Step 8 for the data plumbing. For the component itself, accept a `recentPayments: Array<{ id: string; userInitial: string; userLabel: string; createdAt: Date; status: "completed" | "pending" | "process" | "failed" }>` prop and render it. If the array is empty, render a single row with `colspan={3}` that says "Платежей пока нет."
   - **Narrow card** `<DashboardCard title="Быстрые действия" actions={<Plus />}>`. Body is `<ul className="dashList">` with three list items:
     - `is-completed` "Купить подписку" — links to `/dashboard/buy`
     - `is-not-completed` "Управлять устройствами" — links to `/dashboard/devices`
     - `is-completed` "Пригласить друга" — links to `/dashboard/referrals`

Keep the `referralLink`, `externalSubscriptionUrl`, and `remnawaveUuid` props but **remove** the rendering of the legacy `ReferralAccess` and `DashboardShortcuts` sections — their content is now folded into the narrow card and into the Referrals page itself.

- [ ] **Step 3: Update `app/dashboard/page.tsx` to feed the new data shape**

After fetching the user, also fetch the latest five payments via the existing service helper (audit `lib/services/payments.ts` or whichever module exposes payment listing). Map each payment into the `recentPayments` shape using:

- `userInitial` = first letter of the user's email
- `userLabel` = the user's email (for the current user, this is the session email — the overview lists the **current user's** payments only, not other users)
- `status` = `payment.status === "SUCCEEDED" ? "completed" : payment.status === "FAILED" ? "failed" : payment.status === "PENDING" ? "pending" : "process"`

Render:

```tsx
return (
  <div className="dashShellPageWrapper">
    <DashboardPageHeader
      title="Обзор"
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Обзор" }]}
      action={
        <Link href="/dashboard/buy" className="dashSidebarCta">
          КУПИТЬ ПОДПИСКУ
        </Link>
      }
    />
    <DashboardOverviewBlocks
      subscription={...}
      recentPayments={recentPayments}
      referralLink={referralLink}
      externalSubscriptionUrl={externalSubscriptionUrl}
      remnawaveUuid={activeUser?.remnawaveUuid ?? null}
    />
  </div>
);
```

If a service helper for "latest payments by user" does not exist, **do not invent one** — instead pass `recentPayments={[]}` and leave a `// TODO(payment-history-service): expose latest-by-user helper` comment. The empty-state branch already handles this.

- [ ] **Step 4: Rewrite `payment-history-list.tsx`**

Wrap everything in `<div className="dashWorkspace dashHistory">`. Render:

- A `.dashStatGrid` with three tiles: total payments, last payment date, total spent (sum of successful payments). If any value is unknown, show `"—"`.
- One `<DashboardCard title="История платежей">` containing a `<table className="dashTable">` with columns `Дата | План | Сумма | Статус`. The status cell uses `<span className="dashStatusPill is-completed">` etc.
- Empty-state message inside the card body if there are no rows.

Preserve every existing prop and the `formatBytes` / `formatDateTime` helpers. Do not change the component signature beyond what is needed to feed the stat tiles.

- [ ] **Step 5: Rewrite `device-list.tsx`**

Wrap in `<div className="dashWorkspace dashDevices">`. Render:

- A `.dashStatGrid` with three tiles: total devices, device limit, free slots.
- One `<DashboardCard title="Подключенные устройства">` containing a `<ul className="dashList">` of device rows. Each row renders the platform glyph in a `.dashListIcon`, the model name, the OS version, and a delete button. The delete button keeps its existing client behavior.
- The onboarding empty-state (the original `deviceGuide` block) becomes a single `<DashboardCard title="Как подключить устройство">` with a `<ol className="dashList">` of three steps. Each step row is a `.dashListItem` with the existing copy.

- [ ] **Step 6: Rewrite `referral-summary-blocks.tsx`**

Wrap in `<div className="dashWorkspace dashReferrals">`. Render:

- A `.dashStatGrid` with three tiles: total invited users, total rewards count, sum of rewards.
- A `.dashCardGrid` with:
  - **Wide card** `<DashboardCard title="Приглашённые пользователи">` containing a `<table className="dashTable">` with columns `Email | Дата регистрации`.
  - **Narrow card** `<DashboardCard title="Реферальная ссылка">` containing the link text inside a monospace `<code>` block and a copy-to-clipboard button styled as the existing `.dashCardActions` button shape.

Keep the existing copy-to-clipboard hook / handler.

- [ ] **Step 7: Rewrite `payment-checkout.tsx`**

Wrap in `<div className="dashWorkspace dashCheckout">`. Render:

- A `.dashCardGrid` with:
  - **Wide card** `<DashboardCard title="Выбор тарифа">` containing the existing plan grid, restyled as `<ul className="dashList">` with each plan as a selectable `.dashListItem`. The selected plan gets `is-completed`, the rest stay neutral.
  - **Narrow card** `<DashboardCard title="К оплате">` containing the price summary: original price, discount line, total. Use a small `.dashSummary` block (define as `display: grid; gap: 0.5rem;` inline if it's the only place — otherwise add a tiny CSS block).
- Below the card grid, render the promo input row, provider toggle (as a pair of pill buttons), and the submit button (`<button className="dashSidebarCta">Оплатить</button>`).

Keep the entire `useState`, `useTransition`, `fetch`, redirect, error handling, and price recalculation logic untouched.

- [ ] **Step 8: Rewrite `reissue-subscription-button.tsx`**

Replace only the trigger button styles. The dialog body, confirmation copy, and server action stay the same. The trigger becomes:

```tsx
<button type="button" className="dashSidebarCta" onClick={...}>
  ПЕРЕВЫПУСТИТЬ ССЫЛКУ
</button>
```

Adjust the dialog content classes from `.commandDialog*` to a tiny new `.dashDialog*` set if you need to (or leave them on the existing `Dialog` primitive's defaults — that primitive is one of the few `components/ui/*` exceptions and stays).

- [ ] **Step 9: Rewrite each of the four dashboard pages to use `DashboardPageHeader`**

`/dashboard/buy/page.tsx`, `/dashboard/devices/page.tsx`, `/dashboard/history/page.tsx`, `/dashboard/referrals/page.tsx` all replace `ScreenHeader` with `DashboardPageHeader`. Crumbs:

- buy → `[{ label: "Dashboard", href: "/dashboard" }, { label: "Купить" }]`
- devices → `[{ label: "Dashboard", href: "/dashboard" }, { label: "Устройства" }]`
- history → `[{ label: "Dashboard", href: "/dashboard" }, { label: "История" }]`
- referrals → `[{ label: "Dashboard", href: "/dashboard" }, { label: "Рефералы" }]`

The page-level wrapper class is `<div className="dashShellPageWrapper">` (define it as `display: grid; gap: clamp(1.5rem, 2.5vw, 2rem);` in CSS — add to the contracts block in Task 4 if not already there).

- [ ] **Step 10: Update the secondary-surfaces test**

Open `__tests__/components/dashboard/dashboard-secondary-surfaces.test.ts` and rewrite the assertions so each component's output matches the new shape:

- `payment-checkout` renders `.dashWorkspace.dashCheckout`, `.dashCardGrid`, two `.dashCard` children, and the existing promo placeholder.
- `payment-history-list` renders `.dashWorkspace.dashHistory`, `.dashStatGrid` with three tiles, and `.dashCard` containing a `.dashTable`.
- `device-list` renders `.dashWorkspace.dashDevices`, `.dashStatGrid`, and at least one `.dashCard`.
- `referral-summary-blocks` renders `.dashWorkspace.dashReferrals`, `.dashStatGrid`, and a `.dashCardGrid` with two cards.
- None of the components contain `.telemetryHero`, `.commandPanel`, `.referralLinkLabel`, `.devicePanel`, `.checkoutWorkspace`, `.historyWorkspace`, or `.referralWorkspace`.

- [ ] **Step 11: Run all dashboard tests**

Run:

```bash
npx vitest run __tests__/components/dashboard
```

Expected: PASS for both test files.

- [ ] **Step 12: Commit the dashboard rebuild**

```bash
git add components/blocks/dashboard \
  components/dashboard/payment-checkout.tsx \
  app/dashboard \
  __tests__/components/dashboard
git commit -m "feat(dashboard): rebuild every page in monochrome AdminHub layout"
```

## Task 7: Add Dashboard Body CSS Polishing

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add a small `.dashShellPageWrapper`, `.dashOverview`, `.dashHistory`, `.dashDevices`, `.dashReferrals`, `.dashCheckout` block**

These are mostly thin wrappers that just compose `display: grid; gap: clamp(1.5rem, 2.5vw, 2rem);`. Add them to the `@layer components` group, immediately after the `.dashCard` rules.

```css
.dashShellPageWrapper,
.dashOverview,
.dashHistory,
.dashDevices,
.dashReferrals,
.dashCheckout {
  display: grid;
  gap: clamp(1.5rem, 2.5vw, 2rem);
}
```

- [ ] **Step 2: Run lint + the focused tests**

Run:

```bash
npm run lint
npx vitest run __tests__/components/dashboard __tests__/components/shell
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(dashboard): add page-level workspace wrappers"
```

## Task 8: Manual Browser Walkthrough

**Files:** none (manual verification step)

- [ ] **Step 1: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open every dashboard route and confirm visually**

Walk through:

- `/dashboard`
- `/dashboard/buy`
- `/dashboard/devices`
- `/dashboard/history`
- `/dashboard/referrals`
- `/admin` (if you have an admin user — only confirm the sidebar, not the page body)

For each route confirm:

- The sidebar is glued to the left edge of the viewport (no margin, no gutter).
- The brand wordmark is uppercase monospace, the tagline matches the area.
- The active link has the inset white left bar.
- "OTHER STUFF" expands and persists across reloads.
- The footer CTA pill is monochrome white-on-black.
- Logout posts to `/api/auth/logout` and returns the user to `/login`.
- The page header shows `Dashboard › <Page>` breadcrumbs.
- The three stat tiles are present and use only monochrome colors.
- The card grid below has the AdminHub two-column shape, collapses to a single column under ~768px.
- Status pills are monochrome (white-on-black for completed, outlined for pending, dashed outlined for process).
- No purple, no blue, no orange, no green anywhere on the page.

- [ ] **Step 3: Capture any drift**

If anything in the manual walkthrough does not match the visual reference, fix it before moving on. Do not commit screenshots — this step is verification only.

## Task 9: Audit, Delete Dead Code, and Final Cleanup

**Files:**
- Delete (after audit): `components/shell/app-topbar.tsx`
- Delete (after audit): `components/shell/app-more-sheet.tsx`
- Delete (after audit): `components/shell/app-bottom-nav.tsx`
- Delete (after audit): `components/shell/app-shell-footer-actions.tsx`
- Delete (after audit): `components/shell/screen-header.tsx`
- Delete (after audit): `components/shell/app-nav-rail.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Audit each candidate for live consumers**

Run:

```bash
rg -n "AppTopbar|app-topbar" app components __tests__
rg -n "AppMoreSheet|app-more-sheet" app components __tests__
rg -n "AppBottomNav|app-bottom-nav" app components __tests__
rg -n "AppShellFooterActions|app-shell-footer-actions" app components __tests__
rg -n "ScreenHeader|screen-header" app components __tests__
rg -n "AppNavRail|app-nav-rail" app components __tests__
```

For each command, expected: zero hits **outside** the file itself. If any consumer remains, stop and migrate it (most likely the consumer is a stale test or a leftover import in an admin layout).

- [ ] **Step 2: Delete the dead component files**

Delete every file in the list above that passed Step 1. If a file still has a consumer, leave it and revisit it after that consumer is removed. Do not introduce a `// removed` comment — just delete cleanly.

- [ ] **Step 3: Audit dead CSS selectors**

Run:

```bash
rg -n "\bappNavRail\b|\bappTopbar\b|\bappMoreSheet\b|\bappShell\b|\bappBottomNav\b" app components __tests__
rg -n "\btelemetryHero\b|\bcommandPanel\b|\bcommandButton\b|\breferralPanel\b|\bdevicePanel\b|\bdeviceGuide\b|\bcheckoutWorkspace\b|\bhistoryWorkspace\b|\breferralWorkspace\b|\bscreenHeader\b|\bdataSummaryGrid\b|\bdataDetailPill\b|\bdashboardOverview\b|\bdashboardWorkspace\b|\bdashboardSection\b|\bdashboardSurfacePage\b|\bdashboardActionRow\b|\bdashboardHero\b" app components __tests__
```

For each match list inside `app/globals.css` only, delete the corresponding rule. Do not delete a rule that still has live JSX consumers — rerun the grep across `app/` and `components/` to be sure.

- [ ] **Step 4: Run the full test suite**

Run:

```bash
npm run lint
npx vitest run
```

Expected: PASS.

- [ ] **Step 5: Commit the cleanup**

```bash
git add components/shell app/globals.css
git commit -m "refactor(shell): drop legacy topbar, sheet, screen-header, and dead css"
```

## Final Verification

- [ ] Run:

```bash
npm run lint
npx vitest run
```

- [ ] Manually walk through every dashboard route (`/dashboard`, `/dashboard/buy`, `/dashboard/devices`, `/dashboard/history`, `/dashboard/referrals`) plus `/admin` for sidebar parity.

- [ ] Confirm the deletion list from Task 9 left no dangling imports:

```bash
rg -n "AppTopbar|AppMoreSheet|AppBottomNav|AppShellFooterActions|ScreenHeader|AppNavRail|app-nav-rail|app-topbar|app-more-sheet|app-bottom-nav|app-shell-footer-actions|screen-header" app components __tests__
```

Expected: zero hits.

- [ ] Confirm the palette is strict monochrome:

```bash
rg -n "#3C91E6|#CFE8FF|#FFCE26|#FFF2C6|#FD7238|#FFE0D3|#DB504A|--accent-primary|var\(--blue\)|var\(--orange\)|var\(--yellow\)" app components
```

Expected: zero hits inside `app/dashboard`, `components/blocks/dashboard`, `components/shell`. The match for `--accent-primary` may still appear in unrelated public-page CSS — that is acceptable, but it must not appear in any selector that targets `.dash*` or `.appShell*`.

- [ ] Confirm the sidebar still exposes `data-testid="app-nav-rail"` so accessibility tooling that relied on it keeps working:

```bash
rg -n 'data-testid="app-nav-rail"' components/shell
```

Expected: one hit in `components/shell/dashboard-sidebar.tsx`.

- [ ] Final: leave a single bundled commit history with one commit per Task. Do not squash. Do not amend.
