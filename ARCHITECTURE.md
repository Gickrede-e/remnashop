# ARCHITECTURE

_Initial architecture map captured on 2026-03-19 15:07 UTC. Updated manually on 2026-03-22 00:00 UTC._

## Scope
- Repository root: `/home/gickrede/remnashop`
- Architecture file: `ARCHITECTURE.md`
- Indexed files: 155
- Modules indexed: 5

## Technology Signals
- Node.js / JavaScript
- React
- Next.js
- Containerization (Docker)

## Module Map

### `root`
- Responsibility: Repository entrypoints and global configuration shared across the project, including container build and deployment manifests.
- Key files:
  - `Dockerfile`
  - `package.json`
  - `vitest.config.ts`
  - `prisma.config.ts`
  - `tsconfig.json`
  - `ARCHITECTURE.md`
  - `components.json`
  - `docker-compose.hub.yml`
  - `docker-compose.yml`
  - `next-env.d.ts`
- Notes: `Dockerfile` now packages a standalone Next.js runtime together with Prisma CLI/runtime files so one Docker Hub image can serve `app`, `worker`, and one-shot `migrate`. `docker-compose.hub.yml` is the pull-only deployment manifest: `postgres` + `migrate` + `app` + `worker` + `caddy`, with `migrate` running `prisma migrate deploy` or `prisma db push` plus seed before the app starts. `vitest.config.ts` provides the repository test harness: Node-based Vitest execution, `@/` path alias resolution, and runtime aliases for `server-only` and mocked Prisma enums.

### `app`
- Responsibility: App Router pages, layouts, and route handlers for the auth-first entry flow, authenticated dashboard/admin surfaces, and APIs.
- Key files:
  - `app/error.tsx`
  - `app/globals.css`
  - `app/layout.tsx`
  - `app/loading.tsx`
  - `app/not-found.tsx`
  - `app/page.tsx`
  - `app/admin/error.tsx`
  - `app/admin/layout.tsx`
- Notes: `app/page.tsx` is now the guest auth entry and redirect hub: authenticated users are sent straight to `/dashboard` or `/admin`, while guests see only the compact `AuthEntryPanel`. Legacy marketing routes such as `app/pricing/page.tsx` and `app/faq/page.tsx` now redirect to `/` instead of rendering standalone marketing UI. Authenticated product surfaces live under `app/dashboard/*` and `app/admin/*`, both of which render through the shared mobile-first shell defined in `components/shell/*`.

### `components`
- Responsibility: Reusable UI primitives, the shared dashboard/admin shell, auth/admin form composition, and small shared status/logo building blocks.
- Key files:
  - `components/providers.tsx`
  - `components/admin/async-action-button.tsx`
  - `components/admin/plan-form.tsx`
  - `components/admin/promo-form.tsx`
  - `components/admin/revenue-chart.tsx`
  - `components/admin/user-actions.tsx`
  - `components/auth/login-form.tsx`
  - `components/blocks/forms/form-section.tsx`
  - `components/shared/logo.tsx`
  - `components/shell/app-shell.tsx`
- Notes: `components/shell/app-shell.tsx`, `components/shell/app-topbar.tsx`, `components/shell/app-bottom-nav.tsx`, and `components/shell/app-more-sheet.tsx` are now the core navigation surface for both dashboard and admin. `components/admin/plan-form.tsx` and `components/admin/promo-form.tsx` were rebuilt around `components/blocks/forms/form-section.tsx` so admin create/edit routes read as short mobile-first sections instead of long desktop cards. The old sidebar, marketing, and public site-chrome components were removed after the app switched to the auth-first entry model; the remaining shared brand mark now lives in `components/shared/logo.tsx`.

### `lib`
- Responsibility: Server-side business logic and APIs.
- Key files:
  - `lib/api-session.ts`
  - `lib/constants.ts`
  - `lib/env.ts`
  - `lib/http.ts`
  - `lib/prisma.ts`
  - `lib/public-env.ts`
  - `lib/utils.ts`
  - `lib/auth/session.ts`
- Notes: `lib/services/plans.ts` persists tariff configuration including Remnawave-specific provisioning fields. `lib/services/subscriptions.ts` applies the selected plan to Remnawave on purchase/admin grant, and `lib/services/remnawave.ts` now accepts `tag`, internal squads, external squad, and HWID/device limit in create/update calls. Admin analytics and export paths now lean on database-side aggregation or batched iteration (`lib/services/stats.ts`, `lib/services/users.ts`, `lib/services/export.ts`, `lib/services/subscriptions.ts`, `lib/services/notifications.ts`) instead of loading entire histories into application memory. Payment status normalization lives in `lib/services/payment-status.ts` so Vitest can cover provider status mapping without pulling in the full payment service module.

### `prisma`
- Responsibility: Database schema and seed data for users, plans, subscriptions, payments, promos, referrals, and admin audit logs.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/seed.ts`
- Notes: `Plan` stores both commerce fields and Remnawave provisioning settings. The public `slug` remains the plan identifier; the Remnawave user `tag` is derived from that slug in application code.

## Change Protocol
- Read this file before major searches or code modifications.
- Update the impacted module sections immediately after structural/code changes.
- Keep uncertain claims marked as `UNCONFIRMED` until verified.

## Change Notes
- 2026-03-22: Removed obsolete marketing/sidebar/site-chrome components (`components/marketing/*`, `components/*/sidebar-nav.tsx`, `components/shared/site-header.tsx`, `components/shared/site-footer.tsx`, `components/layout/site-*.tsx`, `components/layout/side-nav.tsx`, `components/layout/logo.tsx`, `components/forms/auth-form.tsx`) after the shift to the shared dashboard/admin shell; `components/shell/app-topbar.tsx` now uses `components/shared/logo.tsx`, and this ledger was updated to reflect the auth-first route structure.
- 2026-03-21: Added Vitest-based unit/integration coverage in `vitest.config.ts`, `__mocks__/`, and `__tests__/` for utility helpers, schemas, HTTP helpers, promo validation, payment status mapping, payment/provider signature checks, CSV helpers, and Telegram auth verification.
- 2026-03-21: Reduced public-page scroll cost by replacing the fixed body background attachment and the old heavy-blur public shell treatment with fixed background layers and more opaque surfaces in `app/globals.css`, `app/layout.tsx`, and the then-current landing/auth pages.
- 2026-03-21: Refactored admin stats/users, export batching, stale-subscription expiry, notification transport reuse, and Telegram auth hash handling across `lib/services/*`, plus updated `/admin/users` to use aggregated `totalSpent`.
- 2026-03-20: Restyled the non-home public pages and key dashboard/admin landing pages for mobile-first presentation: `pricing`, `faq`, `setup`, `login`, `register`, `dashboard`, `dashboard/buy`, and `admin/export` now use intentional summary surfaces instead of plain desktop card stacks, and `site-footer` matches the updated visual system.
- 2026-03-20: Redesigned the public homepage visual language in `app/page.tsx` and `app/globals.css` using a new `surface-soft` / `surface-feature` layer, a stronger two-column hero, featured pricing layout, and a compact FAQ + privacy composition.
- 2026-03-19: Extended tariff configuration with Remnawave provisioning settings in `Plan` and wired `slug -> Remnawave tag` through plan services, admin UI, and subscription activation/admin grant flows.
- 2026-03-19: Added Docker Hub deployment flow via `docker-compose.hub.yml` and updated `Dockerfile` runtime packaging so the published `gickrede/remnashop:latest` image can be used directly for `migrate`, `app`, and `worker` without a local build step.
