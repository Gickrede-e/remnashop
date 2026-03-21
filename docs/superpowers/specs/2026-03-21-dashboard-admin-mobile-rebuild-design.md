# Dashboard/Admin Mobile Rebuild Design

Date: 2026-03-21
Status: Approved in chat, pending implementation plan
Repository: `/home/gickrede/remnashop`

## Summary

Remnashop will keep the current Next.js application, current routes for authenticated product surfaces, and current server/business logic. Public marketing UI will be removed. The frontend will be rebuilt inside the existing App Router application with a phone-first dark shell shared by both the user dashboard and the admin area.

The rebuild is explicitly constrained by the following decisions:

- Keep `app/api/*` unchanged.
- Keep current dashboard and admin routes and current business functions.
- Remove public marketing as a product layer.
- Turn `/` into a minimal auth entry page.
- Redirect removed marketing routes such as `/pricing` and `/faq` to `/`.
- Use one shared mobile-first shell and one shared interaction model for both `dashboard` and `admin`.
- Prefer mobile performance over decorative effects: almost no blur, no heavy shadows, and no complex animations.

## Goals

- Rebuild the authenticated frontend from scratch inside the current Next.js app.
- Improve phone responsiveness and perceived speed across dashboard and admin.
- Replace the current desktop-first mobile composition with a true mobile-first shell.
- Create a cleaner component architecture with clearer boundaries between route composition, reusable blocks, and low-level primitives.
- Preserve all current authenticated routes and product capabilities.

## Non-Goals

- No changes to `app/api/*`.
- No changes to Prisma schema or database behavior unless required by a later implementation bugfix.
- No product-scope cuts to dashboard or admin functionality.
- No separate frontend application or framework migration.
- No marketing redesign; public marketing routes are being removed, not refreshed.

## Confirmed Current-State References

Current route/layout references that shape this design:

- `app/layout.tsx`
- `app/login/page.tsx`
- `app/dashboard/layout.tsx`
- `app/admin/layout.tsx`
- `components/dashboard/sidebar-nav.tsx`
- `components/admin/sidebar-nav.tsx`

Confirmed authenticated routes to preserve:

- `app/dashboard/page.tsx`
- `app/dashboard/buy/page.tsx`
- `app/dashboard/history/page.tsx`
- `app/dashboard/referrals/page.tsx`
- `app/admin/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/plans/page.tsx`
- `app/admin/plans/new/page.tsx`
- `app/admin/plans/[id]/edit/page.tsx`
- `app/admin/payments/page.tsx`
- `app/admin/promos/page.tsx`
- `app/admin/promos/new/page.tsx`
- `app/admin/promos/[id]/edit/page.tsx`
- `app/admin/referrals/page.tsx`
- `app/admin/logs/page.tsx`
- `app/admin/export/page.tsx`

Confirmed public routes to replace or redirect:

- `app/page.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/pricing/page.tsx`
- `app/faq/page.tsx`

## Target Product Surface

### Public/Auth Surface

- `/` becomes a minimal auth entry page.
- `/login` remains available as a dedicated page.
- `/register` remains available as a dedicated page.
- Removed marketing routes redirect to `/`.
- Public shell/header/footer used for marketing pages are deleted or reduced to the minimum required for auth entry pages.

### Authenticated Surface

- `/dashboard/*` remains the user product area.
- `/admin/*` remains the admin product area.
- Both areas share the same shell system, the same primitives, and the same mobile interaction patterns.
- Differences between dashboard and admin live in route composition and nav configuration, not in separate architectural systems.

## Target Route Architecture

The rebuild keeps App Router and route paths, but restructures UI ownership:

- Route pages are responsible for data loading and top-level composition only.
- Shared shell components own chrome, navigation, and responsive layout behavior.
- Block components own large reusable page sections.
- Primitive components own visual building blocks.
- Client components are used only where interaction requires them.

Illustrative target structure:

```text
app/
  page.tsx                      -> minimal auth entry
  login/page.tsx
  register/page.tsx
  pricing/page.tsx              -> redirect to /
  faq/page.tsx                  -> redirect to /
  dashboard/
    layout.tsx                  -> shared app shell wrapper
    page.tsx
    buy/page.tsx
    history/page.tsx
    referrals/page.tsx
  admin/
    layout.tsx                  -> shared app shell wrapper with admin config
    page.tsx
    users/page.tsx
    plans/page.tsx
    plans/new/page.tsx
    plans/[id]/edit/page.tsx
    payments/page.tsx
    promos/page.tsx
    promos/new/page.tsx
    promos/[id]/edit/page.tsx
    referrals/page.tsx
    logs/page.tsx
    export/page.tsx

components/
  shell/
  nav/
  primitives/
  blocks/
  forms/
```

This is a UI-layer restructuring, not an API-layer restructuring.

## Shared Shell Design

Both `dashboard` and `admin` use one dark shell system.

### Mobile Pattern

On phones, the default pattern is:

- top app bar
- bottom tab navigation
- sheet or drawer for secondary destinations and actions

The chosen visual direction is:

- dark theme
- clean geometry
- high contrast
- low ornament
- performance-first presentation

### Desktop/Tablet Pattern

The same shell expands into a wider layout on larger breakpoints:

- left rail or sidebar may appear at larger sizes
- navigation data differs by product area
- shell primitives remain the same

This avoids creating one mobile architecture and one desktop architecture that drift apart over time.

### Navigation Model

Dashboard mobile primary tabs:

- Overview
- Buy
- History
- More

Admin mobile primary tabs:

- Overview
- Users
- Payments
- More

Secondary destinations move into sheets or secondary menus:

- dashboard referrals
- admin plans
- admin promos
- admin referrals
- admin logs
- admin export

## Page Composition Rules

### Dashboard

- `/dashboard`: `ScreenHeader + PrimaryStatusCard + QuickActions + 2-3 compact info blocks`
- `/dashboard/buy`: `ScreenHeader + PlanList + PaymentMethodPanel + CheckoutSummary`
- `/dashboard/history`: card-list first on phones, table mode only on larger breakpoints
- `/dashboard/referrals`: `ReferralSummary + ReferralLinkCard + ReferralEventsList`

### Admin

- `/admin`: `KPI row + alerts/actions + recent activity`
- list-heavy routes use `filter bar + card list + secondary actions sheet` on phones
- table mode is an enhancement for larger breakpoints, not the default mental model
- large forms are split into short `FormSection` groups

### Universal Screen Rules

- each screen has one main focus
- first viewport answers "where am I?" and "what is the primary action?"
- dense data and forms do not compete in the same top section
- every major block explicitly handles loading, empty, error, and ready states

## Component Architecture

The rebuild should favor these layers:

- `components/shell/*`: app shell, top bar, bottom nav, page container, content frame
- `components/nav/*`: route-aware navigation datasets and nav items
- `components/primitives/*`: buttons, cards, lists, labels, pills, compact panels, section containers
- `components/blocks/*`: summary blocks, activity blocks, plan lists, payment rows, referral summaries, admin action groups
- `components/forms/*`: only components that actually own form interaction

Rules:

- route page files stay small and mostly server-rendered
- reusable interactive blocks become focused client components
- no giant shared wrapper that hoists unnecessary state across the app
- no route page should require understanding half the repo to edit safely

## Performance Rules

Performance is a primary product requirement, especially on phones.

### Hard Rules

- no broad `backdrop-blur` layers in the app shell
- no large fixed decorative overlays behind all app screens
- no heavy persistent shadows
- no complex page-load animation choreography
- no unnecessary client wrappers around server-renderable screens

### Preferred Rendering Model

- server-first route pages
- client components only for forms, sheets, toggles, local filters, and explicit interactive widgets
- props over context where practical
- card/list presentation on phones, table presentation only at wider breakpoints
- charts only where simpler KPI summaries are genuinely insufficient

### Interaction Rules

- animations limited to short `opacity` and `transform` transitions
- sheets and dialogs mounted only when needed
- no decorative effects that can trigger repaint-heavy scroll behavior
- avoid large sticky regions unless they materially improve usability

## Redirect Strategy

The following public routes should redirect to `/` after the rebuild:

- `/pricing`
- `/faq`
- any other removed public marketing route that currently exists only for marketing navigation

`/login` and `/register` remain first-class routes.

## Migration Strategy

Implementation should happen in phases to reduce risk.

### Phase 1: Remove Marketing Surface

- replace root page with minimal auth entry
- convert marketing routes to redirects
- reduce or remove obsolete public header/footer components

### Phase 2: Build Shared App Shell

- create new shell and nav primitives
- replace current dashboard/admin layout composition
- land the responsive frame before rewriting every page body

### Phase 3: Rebuild Dashboard Screens

- rebuild overview, buy, history, referrals
- move phone UI to card/list-first patterns
- keep behavior and server actions intact

### Phase 4: Rebuild Admin Screens

- rebuild overview
- rebuild list screens into mobile-first card/list layouts
- rebuild admin forms into sectioned mobile-friendly forms

### Phase 5: Cleanup

- remove unused marketing components
- remove superseded shared chrome
- collapse obsolete UI primitives that are no longer needed

## Verification Requirements

Minimum verification for implementation:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Manual verification:

- auth entry on `/`
- `/login`
- `/register`
- redirects from removed marketing routes
- all `dashboard` routes
- all `admin` routes
- mobile viewport checks for navigation, scrolling, sheets, forms, and list density
- console and network error review in browser tooling

## Risks And Controls

### Risk: Route behavior changes while rebuilding UI

Control:

- preserve route paths
- preserve route-level guards
- keep data loading and action wiring close to existing server logic

### Risk: Reintroducing mobile lag through visual polish

Control:

- treat blur, shadows, and animation as opt-in exceptions
- verify scroll and navigation performance during implementation

### Risk: Rebuild drifts into backend refactor

Control:

- keep `app/api/*`, `lib/services/*`, and auth/session primitives out of scope unless a specific implementation bug requires touching them

## Acceptance Criteria

The design is successful when all of the following are true:

- public marketing UI is gone
- `/` is a minimal auth entry
- removed marketing routes redirect to `/`
- all current dashboard and admin routes still exist
- dashboard and admin share one dark mobile-first shell and interaction model
- mobile interaction is visibly simpler and more responsive than the current implementation
- UI code is reorganized into clearer route, shell, block, and primitive boundaries
- `app/api/*` remains unchanged
