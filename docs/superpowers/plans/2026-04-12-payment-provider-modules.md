# Payment Provider Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make YooKassa and Platega explicit optional modules that can be disabled without supplying their secrets.

**Architecture:** Add explicit provider enablement flags in env validation, centralize provider availability helpers, pass enabled providers into the checkout UI from the server, and enforce disabled-provider rejection in server APIs and webhook routes. Keep admin monitoring visible by introducing a `disabled` provider status instead of removing rows.

**Tech Stack:** Next.js App Router, TypeScript, Prisma enum `PaymentProvider`, Zod env validation, Vitest.

---

### Task 1: Add failing tests for modular provider flags

**Files:**
- Modify: `__tests__/lib/env.test.ts`
- Modify: `__tests__/lib/services/payments.test.ts`
- Modify: `__tests__/lib/services/provider-status.test.ts`
- Modify: `__tests__/components/dashboard/dashboard-secondary-surfaces.test.ts`
- Modify: `__tests__/app/api/webhook/yookassa.route.test.ts`
- Modify: `__tests__/app/api/webhook/platega.route.test.ts`

- [ ] Add red tests for disabled providers without secrets, enabled providers requiring secrets, checkout hiding disabled providers, disabled status rows, API rejection, and webhook `404`.
- [ ] Run the targeted Vitest files and confirm they fail for the expected reasons.

### Task 2: Implement provider capability helpers and env gating

**Files:**
- Modify: `lib/env.ts`
- Create: `lib/payments/providers.ts`

- [ ] Add `YOOKASSA_ENABLED` and `PLATEGA_ENABLED` with `false` defaults.
- [ ] Make provider-specific secret validation conditional on the provider being enabled.
- [ ] Add shared helpers for provider labels and enabled-provider filtering.

### Task 3: Enforce provider availability in services and routes

**Files:**
- Modify: `lib/services/payments.ts`
- Modify: `app/api/webhook/yookassa/route.ts`
- Modify: `app/api/webhook/platega/route.ts`

- [ ] Reject disabled providers from payment creation.
- [ ] Return `404` from disabled-provider webhook routes before any further processing.

### Task 4: Update checkout and admin monitoring behavior

**Files:**
- Modify: `app/dashboard/buy/page.tsx`
- Modify: `components/dashboard/payment-checkout.tsx`
- Modify: `lib/services/provider-status.ts`
- Modify: `components/blocks/admin/admin-overview-blocks.tsx`
- Modify: `app/globals.css`

- [ ] Pass enabled providers into the checkout from the server page.
- [ ] Hide disabled providers in checkout and show a clear no-payments-available state when none are enabled.
- [ ] Keep admin monitoring rows visible and add the `disabled` summary/badge styling.

### Task 5: Verify end to end

**Files:**
- Modify only if verification reveals gaps.

- [ ] Run targeted tests, then `npm test`, then `npm run lint`.
- [ ] Run `npm run build` with minimal required env for the enabled-module configuration used in verification.
