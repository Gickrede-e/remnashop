# Testing Guide

## Test Matrix

This repository now has explicit commands for each test layer:

| Layer | Command | Purpose |
| --- | --- | --- |
| Unit | `npm run test:unit` | Fast checks for `lib/`, `components/`, `scripts/`, `prisma/`, proxy and config-level helpers |
| Integration | `npm run test:integration` | Route/page coverage under `__tests__/app` |
| Full suite | `npm test -- --run` | Entire Vitest suite |
| Coverage | `npm run test:coverage` | V8 coverage via `@vitest/coverage-v8` |
| Load smoke | `npm run test:load` | `autocannon` smoke against a self-hosted health endpoint harness |
| Mutation | `npm run test:mutation` | Stryker mutation analysis for critical helpers/services/routes |

## Current Baseline

Measured on 2026-04-12:

- Full suite: `63` test files, `298` tests, all green.
- Unit split: `47` test files, `240` tests.
- Integration split: `15` test files, `46` tests.
- Coverage: `72.41%` statements, `60.75%` branches, `67.10%` functions, `73.81%` lines.
- Load smoke: `20` connections for `5s`, `12010.8` req/s average, `p99=4ms`, `0` errors/timeouts/non-2xx.
- Mutation score: `94.55%` total, `96.55%` covered, on the targeted mutation scope below.

## Mutation Scope

`stryker.conf.json` intentionally targets high-value, fast-feedback files:

- `app/api/health/route.ts`
- `lib/auth/roles.ts`
- `lib/http/errors.ts`
- `lib/http/response.ts`
- `lib/server/bigint.ts`
- `lib/services/auth.ts`
- `lib/services/export.ts`
- `lib/services/platega.ts`

This keeps the mutation run practical for CI/local work while still exercising critical control flow. The latest run left a handful of survivors, mostly equivalent mutants or low-value framework/infrastructure details such as:

- equivalent `Number(value)` behavior for numeric input in `lib/server/bigint.ts`
- optional chaining/object-spread mutations that do not change runtime output in current `export` / `platega` call sites
- fallback string literals behind already-covered success paths

## Load Test Harness

`scripts/load-health.mjs` supports two modes:

1. Default `npm run test:load`
   Runs a self-hosted local harness so the tool itself is always verifiable.
2. Target a real app endpoint
   Run `node scripts/load-health.mjs --url http://127.0.0.1:3000/api/health`

Thresholds can be overridden with args or env vars:

- `--connections` / `LOAD_TEST_CONNECTIONS`
- `--duration` / `LOAD_TEST_DURATION`
- `--min-avg-req-per-sec` / `LOAD_TEST_MIN_AVG_REQ_PER_SEC`
- `--max-p99-ms` / `LOAD_TEST_MAX_P99_MS`
- `--max-errors` / `LOAD_TEST_MAX_ERRORS`

## Coverage Hotspots

The biggest remaining gaps are not in the newly covered core helpers, but in heavier UI/admin and payment flows:

- `components/admin/*.tsx`
- `components/dashboard/payment-checkout.tsx`
- `lib/services/payments.ts`
- `lib/auth/session.ts`
- `components/blocks/dashboard/*.tsx`

If you want the next meaningful coverage jump, target those files rather than polishing already well-covered helpers.
