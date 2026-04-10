# Overrrides Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the application shell around an `overrrides.com`-style internal-page sidebar, keep `login/register` as sidebar-free centered cards, and retune the existing pure-CSS system so public, dashboard, and admin surfaces share one coherent visual language.

**Architecture:** Extend the current pure-CSS shell instead of replacing routing or business logic. The left rail becomes the primary navigation model for every non-auth surface, with a guest footer variant for public pages and a system footer variant for authenticated areas. Public pages, auth cards, dashboard blocks, admin blocks, and primitives are migrated in TDD slices so the existing app stays navigable at every checkpoint.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, Docker Compose, plain CSS

**Spec:** `docs/superpowers/specs/2026-04-09-overrrides-sidebar-redesign-design.md`

---

## File Map

### New Files

| File | Type | Responsibility |
|------|------|----------------|
| `app/terms/page.tsx` | Server component | Guest public page inside the shared sidebar shell |
| `components/shell/app-nav-rail.tsx` | Client component | Extracted fixed left rail with brand, nav groups, and footer actions |
| `components/shell/app-shell-footer-actions.tsx` | Client component | State-aware sidebar footer (`login/register` for guests, `profile/switch role/logout` for authenticated users) |
| `__tests__/app/public-pages.test.ts` | Test | Public page contract for sidebar shell and auth exceptions |

### Modified Files

| File | Change |
|------|--------|
| `lib/ui/app-shell-nav.ts` | Add public-shell inventory and footer action mapping |
| `__tests__/lib/ui/app-shell-nav.test.ts` | Lock new public/dashboard/admin navigation contract |
| `components/shell/app-shell.tsx` | Support `public` area, extracted rail, new layout semantics |
| `components/shell/app-topbar.tsx` | Simplify to support sidebar-first layout and mobile drawer trigger |
| `components/shell/app-more-sheet.tsx` | Match sidebar inventory and footer actions on mobile |
| `components/shell/app-bottom-nav.tsx` | Remove legacy bottom-nav behavior or reduce to no-op if obsolete |
| `components/shared/logo.tsx` | Retune brand block for `overrrides`-like rail header |
| `components/shared/logout-button.tsx` | Fit sidebar footer action styling |
| `app/layout.tsx` | Keep root shell wrappers compatible with revised public/auth split |
| `app/page.tsx` | Convert home into guest sidebar entry page |
| `app/faq/page.tsx` | Replace redirect with guest sidebar content page |
| `app/pricing/page.tsx` | Replace redirect with guest sidebar content page |
| `app/login/page.tsx` | Keep auth outside sidebar and align to centered-card contract |
| `app/register/page.tsx` | Keep auth outside sidebar and align to centered-card contract |
| `components/blocks/auth/auth-entry-panel.tsx` | Simplify to compact centered-card structure |
| `components/auth/login-form.tsx` | Fit simplified auth card and revised CTA tone |
| `components/auth/register-form.tsx` | Fit simplified auth card and revised CTA tone |
| `components/auth/telegram-login-button.tsx` | Match new auth-card action hierarchy |
| `components/ui/button.tsx` | Yellow-accent primary button and restrained secondary variants |
| `components/ui/input.tsx` | Matte dark inputs for auth and app surfaces |
| `components/ui/card.tsx` | Flatten panel treatment toward `overrrides` matte blocks |
| `components/ui/tabs.tsx` | Fit compact rail/document rhythm |
| `components/ui/dialog.tsx` | Keep reduced-motion-safe overlay/panel styling in new palette |
| `components/ui/table.tsx` | Retune admin tables for restrained document-like density |
| `components/ui/badge.tsx` | Shift to neutral/yellow accents |
| `components/ui/skeleton.tsx` | Match darker matte loading surfaces |
| `app/globals.css` | New palette, rail layout, public/auth/dashboard/admin surface rules |
| `components/blocks/dashboard/dashboard-overview-blocks.tsx` | Recompose overview inside new shell |
| `components/blocks/dashboard/payment-history-list.tsx` | Fit document-like dashboard secondary surfaces |
| `components/blocks/dashboard/referral-summary-blocks.tsx` | Fit dashboard secondary surfaces |
| `components/blocks/dashboard/device-list.tsx` | Fit dashboard secondary surfaces |
| `components/dashboard/payment-checkout.tsx` | Fit buy workspace to the new operational style |
| `app/dashboard/page.tsx` | Align overview page composition to new shell |
| `app/dashboard/buy/page.tsx` | Align buy page composition to new shell |
| `app/dashboard/history/page.tsx` | Align history page composition to new shell |
| `app/dashboard/referrals/page.tsx` | Align referrals page composition to new shell |
| `app/dashboard/devices/page.tsx` | Align devices page composition to new shell |
| `components/blocks/admin/admin-overview-blocks.tsx` | Recompose admin top surface in new shell |
| `components/blocks/admin/admin-record-list.tsx` | Retune record list surfaces and table wrappers |
| `components/admin/revenue-chart.tsx` | Retune chart shell styling |
| `components/admin/plan-form.tsx` | Fit matte form system |
| `components/admin/promo-form.tsx` | Fit matte form system |
| `components/forms/grant-subscription-form.tsx` | Fit matte form system |
| `components/admin/active-users-sync-button.tsx` | Match new action hierarchy |
| `components/admin/async-action-button.tsx` | Match new action hierarchy |
| `components/admin/user-actions.tsx` | Match sidebar-era action styling |
| `app/admin/page.tsx` | Align overview page composition to new shell |
| `app/admin/users/page.tsx` | Align users page composition to new shell |
| `app/admin/payments/page.tsx` | Align payments page composition to new shell |
| `app/admin/plans/page.tsx` | Align plans page composition to new shell |
| `app/admin/plans/new/page.tsx` | Align create-plan page composition to new shell |
| `app/admin/plans/[id]/edit/page.tsx` | Align edit-plan page composition to new shell |
| `app/admin/promos/page.tsx` | Align promos page composition to new shell |
| `app/admin/promos/new/page.tsx` | Align create-promo page composition to new shell |
| `app/admin/promos/[id]/edit/page.tsx` | Align edit-promo page composition to new shell |
| `app/admin/referrals/page.tsx` | Align referrals page composition to new shell |
| `app/admin/logs/page.tsx` | Align logs page composition to new shell |
| `app/admin/export/page.tsx` | Align export page composition to new shell |
| `__tests__/app/layout.test.ts` | Keep root layout semantics intact |
| `__tests__/app/auth-pages.test.ts` | Update auth route contract for centered-card exception |
| `__tests__/components/auth/auth-surfaces.test.ts` | Update auth surface hooks |
| `__tests__/components/shell/app-shell-structure.test.ts` | Update shell semantics and landmarks |
| `__tests__/components/shell/more-trigger-a11y.test.ts` | Keep mobile drawer trigger accessible |
| `__tests__/components/ui/mobile-visual-primitives.test.ts` | Lock reduced-motion and mobile shell hooks |
| `__tests__/components/dashboard/dashboard-overview-blocks.test.ts` | Lock updated overview hooks |
| `__tests__/components/dashboard/dashboard-secondary-surfaces.test.ts` | Lock updated dashboard secondary hooks |
| `__tests__/components/admin/admin-overview-blocks.test.ts` | Lock updated admin overview hooks |
| `__tests__/components/admin/admin-secondary-surfaces.test.ts` | Lock updated admin secondary hooks |

---

## Task 1: Navigation Contract for Public, Dashboard, and Admin

**Files:**
- Modify: `lib/ui/app-shell-nav.ts`
- Modify: `__tests__/lib/ui/app-shell-nav.test.ts`

- [ ] **Step 1: Write the failing nav-contract assertions**

Add a new test block that expects:

```typescript
expect(getPrimaryNavItems("public").map((item) => item.href)).toEqual([
  "/",
  "/pricing",
  "/faq",
  "/terms"
]);
expect(getFooterActions("public", { authenticated: false }).map((item) => item.label)).toEqual([
  "Login",
  "Register"
]);
expect(getFooterActions("public", { authenticated: false }).map((item) => item.kind)).toEqual([
  "link",
  "link"
]);
expect(getFooterActions("dashboard", { authenticated: true, canAccessAdmin: true }).map((item) => item.label)).toEqual([
  "Profile",
  "Switch role",
  "Logout"
]);
expect(getFooterActions("dashboard", { authenticated: true, canAccessAdmin: true }).map((item) => item.kind)).toEqual([
  "summary",
  "link",
  "command"
]);
expect(getFooterActions("public", { authenticated: false }).flatMap((item) => item.href ?? [])).toEqual([
  "/login",
  "/register"
]);
```

- [ ] **Step 2: Run the focused nav test and verify red state**

Run: `npm test -- __tests__/lib/ui/app-shell-nav.test.ts`
Expected: FAIL because `public` inventory and footer action helpers do not exist yet

- [ ] **Step 3: Extend the nav module with explicit shell areas and footer actions**

Implement `AppShellArea = "public" | "dashboard" | "admin"` plus a footer helper:

```typescript
export type AppFooterAction = {
  label: string;
  kind: "link" | "summary" | "command";
  intent: "guest" | "system";
  href?: string;
  command?: "logout";
};

export function getFooterActions(
  area: AppShellArea,
  options: { authenticated: boolean; canAccessAdmin?: boolean }
): AppFooterAction[] {
  if (!options.authenticated || area === "public") {
    return [
      { href: "/login", label: "Login", kind: "link", intent: "guest" },
      { href: "/register", label: "Register", kind: "link", intent: "guest" }
    ];
  }

  return [
    { label: "Profile", kind: "summary", intent: "system" },
    ...(area === "dashboard" && options.canAccessAdmin
      ? [{ href: "/admin", label: "Switch role", kind: "link", intent: "system" as const }]
      : area === "admin"
        ? [{ href: "/dashboard", label: "Switch role", kind: "link", intent: "system" as const }]
        : []),
    { label: "Logout", kind: "command", command: "logout", intent: "system" }
  ];
}
```

- [ ] **Step 4: Keep dashboard/admin inventory exact**

Verify `getPrimaryNavItems("dashboard")`, `getSecondaryNavItems("dashboard")`, `getPrimaryNavItems("admin")`, and `getSecondaryNavItems("admin")` still preserve current route coverage while dropping assumptions tied to the old bottom-nav-only model.

- [ ] **Step 5: Re-run the focused nav test**

Run: `npm test -- __tests__/lib/ui/app-shell-nav.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/ui/app-shell-nav.ts __tests__/lib/ui/app-shell-nav.test.ts
git commit -m "feat: define overrrides shell navigation contract"
```

---

## Task 2: Rebuild the Shared Shell Around a Fixed Left Rail

**Files:**
- Create: `components/shell/app-nav-rail.tsx`
- Create: `components/shell/app-shell-footer-actions.tsx`
- Modify: `components/shell/app-shell.tsx`
- Modify: `components/shell/app-topbar.tsx`
- Modify: `components/shell/app-more-sheet.tsx`
- Modify: `components/shell/app-bottom-nav.tsx`
- Modify: `components/shared/logo.tsx`
- Modify: `components/shared/logout-button.tsx`
- Modify: `__tests__/components/shell/app-shell-structure.test.ts`
- Modify: `__tests__/components/shell/more-trigger-a11y.test.ts`

- [ ] **Step 1: Write failing shell-structure assertions for the new rail**

Extend the shell test to assert:

```typescript
expect(markup).toContain('data-testid="app-nav-rail"');
expect(markup).toContain('aria-label="Primary navigation"');
expect(markup).toContain('aria-label="Sidebar footer actions"');
expect(markup).not.toContain('data-slot="bottom-nav"');
```

- [ ] **Step 2: Run the shell tests and confirm they fail**

Run: `npm test -- __tests__/components/shell/app-shell-structure.test.ts __tests__/components/shell/more-trigger-a11y.test.ts`
Expected: FAIL because the current shell still renders the old rail/topbar/bottom-nav structure

- [ ] **Step 3: Extract the desktop/mobile rail components**

Create:

```tsx
// components/shell/app-nav-rail.tsx
export function AppNavRail({ area, primaryItems, secondaryItems, footerActions }: Props) {
  return (
    <aside className="appNavRail" data-testid="app-nav-rail" aria-label="Sidebar navigation">
      <Logo variant="rail" />
      <nav aria-label="Primary navigation">{/* primary + secondary groups */}</nav>
      <AppShellFooterActions actions={footerActions} />
    </aside>
  );
}
```

`AppShellFooterActions` should render guest actions as links, the profile item as a passive identity/status row, and logout through the existing `LogoutButton` command rather than a fake `/logout` route.

- [ ] **Step 4: Simplify `AppShell` to a sidebar-first viewport**

Update `components/shell/app-shell.tsx` so it:

```tsx
<div className="appShell overrridesShell">
  <a href="#app-shell-main" className="appSkipLink">Перейти к содержимому</a>
  <AppTopbar area={area} />
  <div className="appShellViewport">
    <AppNavRail ... />
    <main id="app-shell-main" data-testid="app-shell-main" className="appShellMain">{children}</main>
  </div>
  <AppMoreSheet ... />
</div>
```

and no longer depends on `AppBottomNav` as the primary mobile navigation pattern.

- [ ] **Step 5: Rework mobile navigation into the sheet, not a bottom bar**

Keep `AppMoreSheet` as the mobile drawer mirror of the rail inventory and footer actions. `AppBottomNav` should either be removed from runtime rendering or reduced to a compatibility shim that renders nothing.

- [ ] **Step 6: Re-run shell tests**

Run: `npm test -- __tests__/components/shell/app-shell-structure.test.ts __tests__/components/shell/more-trigger-a11y.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/shell/app-nav-rail.tsx components/shell/app-shell-footer-actions.tsx components/shell/app-shell.tsx components/shell/app-topbar.tsx components/shell/app-more-sheet.tsx components/shell/app-bottom-nav.tsx components/shared/logo.tsx components/shared/logout-button.tsx __tests__/components/shell/app-shell-structure.test.ts __tests__/components/shell/more-trigger-a11y.test.ts
git commit -m "feat: rebuild app shell around fixed sidebar rail"
```

---

## Task 3: Put Home, Pricing, FAQ, and Terms Into the Guest Sidebar Shell

**Files:**
- Create: `app/terms/page.tsx`
- Create: `__tests__/app/public-pages.test.ts`
- Modify: `app/page.tsx`
- Modify: `app/faq/page.tsx`
- Modify: `app/pricing/page.tsx`
- Modify: `components/shell/app-shell.tsx`
- Modify: `app/layout.tsx`
- Modify: `__tests__/app/auth-pages.test.ts`

- [ ] **Step 1: Write the failing public-page contract**

Create tests that expect:

```typescript
expect(renderedHome).toContain('data-testid="app-nav-rail"');
expect(renderedHome).toContain("Login");
expect(renderedHome).toContain("Register");
expect(renderedFaq).toContain("FAQ");
expect(renderedPricing).toContain("Тарифы");
expect(renderedTerms).toContain("Условия");
expect(redirectMock).toHaveBeenCalledWith("/dashboard");
```

Update the existing home-page assertion in `__tests__/app/auth-pages.test.ts` so `/login` and `/register` remain the auth-scene coverage there, while `/` moves into `__tests__/app/public-pages.test.ts`.

- [ ] **Step 2: Run the public/auth page tests to confirm red state**

Run: `npm test -- __tests__/app/public-pages.test.ts __tests__/app/auth-pages.test.ts`
Expected: FAIL because `/faq` and `/pricing` still redirect and `/terms` does not exist

- [ ] **Step 3: Render guest pages inside the shared shell**

Refactor `app/page.tsx` into a short guest entry workspace:

```tsx
const session = await getSession();
if (session) {
  redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
}

return (
  <AppShell area="public">
    <section className="publicEntry">
      <p className="publicEyebrow">RemnaShop access</p>
      <h1 className="publicTitle">VPN access without dashboard clutter.</h1>
      <p className="publicDescription">Короткий входной экран в стиле internal pages overrrides.</p>
    </section>
  </AppShell>
);
```

- [ ] **Step 4: Replace redirect pages with compact public content pages**

Implement `app/faq/page.tsx`, `app/pricing/page.tsx`, and `app/terms/page.tsx` as short document-like surfaces inside `AppShell area="public"` rather than redirect stubs.

- [ ] **Step 5: Re-run public/auth page tests**

Run: `npm test -- __tests__/app/public-pages.test.ts __tests__/app/auth-pages.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/faq/page.tsx app/pricing/page.tsx app/terms/page.tsx app/layout.tsx components/shell/app-shell.tsx __tests__/app/public-pages.test.ts __tests__/app/auth-pages.test.ts
git commit -m "feat: move guest pages into sidebar shell"
```

---

## Task 4: Simplify Login and Register Into Sidebar-Free Centered Cards

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `components/blocks/auth/auth-entry-panel.tsx`
- Modify: `components/auth/login-form.tsx`
- Modify: `components/auth/register-form.tsx`
- Modify: `components/auth/telegram-login-button.tsx`
- Modify: `__tests__/app/auth-pages.test.ts`
- Modify: `__tests__/components/auth/auth-surfaces.test.ts`

- [ ] **Step 1: Tighten auth tests around the centered-card exception**

Update the auth tests to assert:

```typescript
expect(markup).toMatch(/class="[^"]*authScene[^"]*"/);
expect(markup).toMatch(/class="[^"]*authCard[^"]*"/);
expect(markup).not.toContain('data-testid="app-nav-rail"');
expect(markup).not.toMatch(/class="[^"]*authEntryWorkspace[^"]*"/);
```

- [ ] **Step 2: Run auth tests and confirm red state**

Run: `npm test -- __tests__/app/auth-pages.test.ts __tests__/components/auth/auth-surfaces.test.ts`
Expected: FAIL because `AuthEntryPanel` still renders the larger split-style structure

- [ ] **Step 3: Collapse `AuthEntryPanel` into a compact card scaffold**

Implement a simplified structure:

```tsx
<section className="authCard authScenePanel panel">
  <p className="authCardEyebrow">{publicEnv.NEXT_PUBLIC_SITE_NAME}</p>
  <h1 className="authCardTitle">{title}</h1>
  <p className="authCardDescription">{description}</p>
  <nav className="authCardTabs">{/* login/register */}</nav>
  <div className="authCardBody">{children}</div>
</section>
```

- [ ] **Step 4: Retune forms to the simple-card hierarchy**

Keep form logic intact, but make `login-form.tsx`, `register-form.tsx`, and `telegram-login-button.tsx` match the smaller card:
- one clear primary submit
- subdued Telegram secondary zone
- concise hint/recovery copy under the body, not in a split panel

- [ ] **Step 5: Re-run auth tests**

Run: `npm test -- __tests__/app/auth-pages.test.ts __tests__/components/auth/auth-surfaces.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx app/register/page.tsx components/blocks/auth/auth-entry-panel.tsx components/auth/login-form.tsx components/auth/register-form.tsx components/auth/telegram-login-button.tsx __tests__/app/auth-pages.test.ts __tests__/components/auth/auth-surfaces.test.ts
git commit -m "feat: simplify auth into centered card surfaces"
```

---

## Task 5: Retune Global CSS and Primitives to the Overrrides Palette

**Files:**
- Modify: `app/globals.css`
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/card.tsx`
- Modify: `components/ui/tabs.tsx`
- Modify: `components/ui/dialog.tsx`
- Modify: `components/ui/table.tsx`
- Modify: `components/ui/badge.tsx`
- Modify: `components/ui/skeleton.tsx`
- Modify: `__tests__/app/layout.test.ts`
- Modify: `__tests__/components/ui/mobile-visual-primitives.test.ts`

- [ ] **Step 1: Add failing primitive-style assertions**

Update the primitives test to expect the new semantic hooks:

```typescript
expect(css).toContain("--accent-primary");
expect(css).toContain(".appNavRail");
expect(css).toContain(".authCard");
expect(css).toContain("@media (prefers-reduced-motion: reduce)");
expect(css).toContain("--canvas-0: #090909");
expect(css).toContain("--text-primary: #f3efe6");
```

Update `__tests__/app/layout.test.ts` in the same task so the root foundation assertions stop expecting the removed cyan-console HSL tokens and instead assert the new `overrrides` palette tokens plus the same structural hooks.

- [ ] **Step 2: Run the primitive test**

Run: `npm test -- __tests__/app/layout.test.ts __tests__/components/ui/mobile-visual-primitives.test.ts`
Expected: FAIL until the new hooks and tokens are present

- [ ] **Step 3: Retune the CSS foundation**

In `app/globals.css`, define the new palette and shell primitives:

```css
:root {
  --canvas-0: #090909;
  --canvas-1: #121212;
  --surface-line: rgba(244, 244, 238, 0.14);
  --text-primary: #f3efe6;
  --accent-primary: #d6ff3f;
  --accent-ambient: rgba(124, 92, 255, 0.18);
}
```

and add dedicated blocks for `.appNavRail`, `.publicEntry`, `.authCard`, `.dashboardWorkspace`, and `.adminWorkspace`.

- [ ] **Step 4: Align primitives to the new tone without breaking behavior**

Keep component APIs stable, but retune the class inventories so buttons, inputs, cards, tabs, dialogs, tables, badges, and skeletons all render the new matte/yellow/document rhythm.

- [ ] **Step 5: Re-run the primitive test**

Run: `npm test -- __tests__/app/layout.test.ts __tests__/components/ui/mobile-visual-primitives.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/ui/button.tsx components/ui/input.tsx components/ui/card.tsx components/ui/tabs.tsx components/ui/dialog.tsx components/ui/table.tsx components/ui/badge.tsx components/ui/skeleton.tsx __tests__/app/layout.test.ts __tests__/components/ui/mobile-visual-primitives.test.ts
git commit -m "feat: retune css primitives to overrrides palette"
```

---

## Task 6: Recompose Dashboard Overview and Secondary Workspaces

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/buy/page.tsx`
- Modify: `app/dashboard/history/page.tsx`
- Modify: `app/dashboard/referrals/page.tsx`
- Modify: `app/dashboard/devices/page.tsx`
- Modify: `components/blocks/dashboard/dashboard-overview-blocks.tsx`
- Modify: `components/blocks/dashboard/payment-history-list.tsx`
- Modify: `components/blocks/dashboard/referral-summary-blocks.tsx`
- Modify: `components/blocks/dashboard/device-list.tsx`
- Modify: `components/dashboard/payment-checkout.tsx`
- Modify: `__tests__/components/dashboard/dashboard-overview-blocks.test.ts`
- Modify: `__tests__/components/dashboard/dashboard-secondary-surfaces.test.ts`

- [ ] **Step 1: Strengthen the dashboard tests around workspace hooks**

Add assertions such as:

```typescript
expect(markup).toMatch(/class="[^"]*dashboardWorkspace[^"]*"/);
expect(markup).toMatch(/class="[^"]*dashboardHero[^"]*"/);
expect(markup).toMatch(/class="[^"]*dashboardSection[^"]*"/);
expect(markup).toMatch(/class="[^"]*historyWorkspace[^"]*"/);
expect(markup).toMatch(/class="[^"]*checkoutWorkspace[^"]*"/);
```

- [ ] **Step 2: Run dashboard tests and confirm red state**

Run: `npm test -- __tests__/components/dashboard/dashboard-overview-blocks.test.ts __tests__/components/dashboard/dashboard-secondary-surfaces.test.ts`
Expected: FAIL until the new semantic workspace hooks exist

- [ ] **Step 3: Recompose the dashboard overview**

Reshape the overview into:
- a restrained hero/status block at the top
- a compact action row
- two-column secondary sections for referrals/devices/history shortcuts

without turning the screen into a gallery of decorative cards.

- [ ] **Step 4: Recompose buy/history/referrals/devices pages**

Make each page use a document-like workspace wrapper and consistent section headers, reusing the new dashboard surface vocabulary instead of ad-hoc panel stacks.

- [ ] **Step 5: Re-run dashboard tests**

Run: `npm test -- __tests__/components/dashboard/dashboard-overview-blocks.test.ts __tests__/components/dashboard/dashboard-secondary-surfaces.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/buy/page.tsx app/dashboard/history/page.tsx app/dashboard/referrals/page.tsx app/dashboard/devices/page.tsx components/blocks/dashboard/dashboard-overview-blocks.tsx components/blocks/dashboard/payment-history-list.tsx components/blocks/dashboard/referral-summary-blocks.tsx components/blocks/dashboard/device-list.tsx components/dashboard/payment-checkout.tsx __tests__/components/dashboard/dashboard-overview-blocks.test.ts __tests__/components/dashboard/dashboard-secondary-surfaces.test.ts
git commit -m "feat: recompose dashboard workspaces for sidebar shell"
```

---

## Task 7: Recompose Admin Overview and Secondary Workspaces

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/users/page.tsx`
- Modify: `app/admin/payments/page.tsx`
- Modify: `app/admin/plans/page.tsx`
- Modify: `app/admin/plans/new/page.tsx`
- Modify: `app/admin/plans/[id]/edit/page.tsx`
- Modify: `app/admin/promos/page.tsx`
- Modify: `app/admin/promos/new/page.tsx`
- Modify: `app/admin/promos/[id]/edit/page.tsx`
- Modify: `app/admin/referrals/page.tsx`
- Modify: `app/admin/logs/page.tsx`
- Modify: `app/admin/export/page.tsx`
- Modify: `components/blocks/admin/admin-overview-blocks.tsx`
- Modify: `components/blocks/admin/admin-record-list.tsx`
- Modify: `components/admin/revenue-chart.tsx`
- Modify: `components/admin/plan-form.tsx`
- Modify: `components/admin/promo-form.tsx`
- Modify: `components/forms/grant-subscription-form.tsx`
- Modify: `components/admin/active-users-sync-button.tsx`
- Modify: `components/admin/async-action-button.tsx`
- Modify: `components/admin/user-actions.tsx`
- Modify: `__tests__/components/admin/admin-overview-blocks.test.ts`
- Modify: `__tests__/components/admin/admin-secondary-surfaces.test.ts`

- [ ] **Step 1: Strengthen the admin tests around supervisory hooks**

Add assertions such as:

```typescript
expect(markup).toMatch(/class="[^"]*adminWorkspace[^"]*"/);
expect(markup).toMatch(/class="[^"]*adminHero[^"]*"/);
expect(markup).toMatch(/class="[^"]*adminSection[^"]*"/);
expect(markup).toMatch(/class="[^"]*recordWorkspace[^"]*"/);
```

- [ ] **Step 2: Run admin tests and confirm red state**

Run: `npm test -- __tests__/components/admin/admin-overview-blocks.test.ts __tests__/components/admin/admin-secondary-surfaces.test.ts`
Expected: FAIL until the new semantic workspace hooks exist

- [ ] **Step 3: Recompose the admin overview**

Make the overview read like a supervisory console inside the new shell:
- one top control/status frame
- dense KPI + provider + action group
- secondary document-like blocks below

- [ ] **Step 4: Recompose the secondary admin screens**

Retune lists, forms, tables, export surfaces, and action buttons to the shared matte/document vocabulary while preserving existing mutations and data loading.

- [ ] **Step 5: Re-run admin tests**

Run: `npm test -- __tests__/components/admin/admin-overview-blocks.test.ts __tests__/components/admin/admin-secondary-surfaces.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx app/admin/users/page.tsx app/admin/payments/page.tsx app/admin/plans/page.tsx app/admin/plans/new/page.tsx app/admin/plans/[id]/edit/page.tsx app/admin/promos/page.tsx app/admin/promos/new/page.tsx app/admin/promos/[id]/edit/page.tsx app/admin/referrals/page.tsx app/admin/logs/page.tsx app/admin/export/page.tsx components/blocks/admin/admin-overview-blocks.tsx components/blocks/admin/admin-record-list.tsx components/admin/revenue-chart.tsx components/admin/plan-form.tsx components/admin/promo-form.tsx components/forms/grant-subscription-form.tsx components/admin/active-users-sync-button.tsx components/admin/async-action-button.tsx components/admin/user-actions.tsx __tests__/components/admin/admin-overview-blocks.test.ts __tests__/components/admin/admin-secondary-surfaces.test.ts
git commit -m "feat: recompose admin workspaces for sidebar shell"
```

---

## Task 8: Verification, Docker Rebuild, and Final Regression Sweep

**Files:**
- Verify only: current task diff

- [ ] **Step 1: Run the targeted UI regression suite**

Run:

```bash
npm test -- __tests__/app/layout.test.ts __tests__/lib/ui/app-shell-nav.test.ts __tests__/components/shell/app-shell-structure.test.ts __tests__/components/shell/more-trigger-a11y.test.ts __tests__/app/public-pages.test.ts __tests__/app/auth-pages.test.ts __tests__/components/auth/auth-surfaces.test.ts __tests__/components/ui/mobile-visual-primitives.test.ts __tests__/components/dashboard/dashboard-overview-blocks.test.ts __tests__/components/dashboard/dashboard-secondary-surfaces.test.ts __tests__/components/admin/admin-overview-blocks.test.ts __tests__/components/admin/admin-secondary-surfaces.test.ts
```

Expected: PASS

- [ ] **Step 2: Run type-check and diff hygiene**

Run:

```bash
npx tsc --noEmit
git diff --check
```

Expected: both commands exit `0`

- [ ] **Step 3: Rebuild the local app container from the worktree**

Run:

```bash
docker compose build app
docker compose up -d app
docker compose ps app
curl -I http://localhost:3000/
curl -I http://localhost:3000/login
```

Expected:
- app container recreated and `healthy`
- HTTP `200` (or auth redirect where appropriate) from the local smoke checks
- authenticated `/` still redirects to the correct cabinet in manual/session-backed smoke checks

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: verify overrrides sidebar redesign"
```

- [ ] **Step 5: Capture final notes for handoff**

Record:
- which screenshots/manual checks were reviewed
- whether any route remains intentionally divergent from the spec
- exact verification commands and outputs
