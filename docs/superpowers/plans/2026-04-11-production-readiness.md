# Production Readiness — TZ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Target executor:** chatgpt-5.4.
>
> **Context:** This TZ is built from a static review of the repo at commit `ecc69fa` (post-pull from `origin/main`). The product itself (admin panel, dashboard, payments via YooKassa/Platega, Remnawave sync, referrals, promos) is functionally complete and reasonably well tested (35 vitest files for 32 API routes). What is missing is the **operational hardening** required to call this project "production-ready". This plan fixes the gaps in minimum-blast-radius slices and adds tests so each regression cannot return.

**Goal:** Bring the project to a state where a fresh deploy on a new server can be considered safe to expose to real paying users — schema is migration-managed, secrets cannot silently fall back to placeholders, brute-force on auth is rate-limited, the default admin password cannot ship, observability exists for failed webhooks, and CI gates merges.

**Architecture:** Touches are concentrated in:
- `prisma/migrations/**` — new (one baseline migration)
- `lib/env.ts` — tighten production validation (no silent fallbacks when `NODE_ENV=production`)
- `prisma/seed.ts` — rotate / require admin password from env
- `lib/server/rate-limit.ts` — new tiny in-process limiter with DB fallback
- `app/api/auth/{login,register,telegram}/route.ts` — wire the limiter
- `lib/services/payments.ts` + webhook routes — structured logging
- `Caddyfile` — add HSTS + CSP (report-only first)
- `.github/workflows/ci.yml` — new (lint + test on PR)
- `docs/RUNBOOK.md` — new (deploy + restore steps)

No business logic changes. No DB schema changes beyond capturing the current schema as a baseline migration.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 + Postgres 16, Caddy, Vitest, GitHub Actions.

---

## Findings (read before touching code)

### Critical (blocks "production-ready")

1. **No Prisma migrations directory.** `prisma/migrations/` does not exist. Both the Dockerfile (`tools` stage) and `docker-compose.yml` `migrate` service fall back to `prisma db push` when the folder is empty. `db push` is a dev tool — it never creates a migration history, so:
   - schema drift between environments is invisible,
   - you cannot roll back,
   - destructive column changes execute silently.
   - **Impact:** Any future schema change shipped through this pipeline is a Russian roulette on prod data.

2. **No CI workflow.** `.github/` does not exist. Tests are written and passing locally but nothing prevents a broken commit from landing on `main`. The repo already has 35 vitest files — the gate is one YAML file away.

3. **No rate limiting on auth or webhooks.** Searched for `rate.?limit|rateLimit` — zero hits. `app/api/auth/login/route.ts` calls `loginUser(body)` directly with no throttle. `register` and `telegram` are similarly open. `bcrypt` work factor 12 (`prisma/seed.ts:102`) is not a substitute for a limiter — it just slows the attacker down by ~250 ms per try, which still allows credential stuffing.

4. **Default admin password is hardcoded.** `prisma/seed.ts:102` bakes `change-me-admin-password` into the seed. The README (`README.md:73-77`) literally documents this credential. Any deployer who forgets to rotate it ships an open admin account that is publicly known. The seed should require an env var (e.g. `ADMIN_INITIAL_PASSWORD`) and refuse to seed an admin without it.

5. **`lib/env.ts` silently accepts placeholder secrets.** Every required field has a fallback string that **passes** the Zod schema:
   - `JWT_SECRET` fallback `"development_only_change_me_to_a_long_secret"` — 47 chars, passes `min(32)`.
   - `CRON_SECRET` fallback `"change_me_internal_cron_secret"` — 30 chars, passes `min(16)`.
   - `YOOKASSA_WEBHOOK_SECRET`, `PLATEGA_WEBHOOK_SECRET`, `REMNAWAVE_API_TOKEN`, `SMTP_PASS` all have non-empty placeholder fallbacks.
   This means a misconfigured prod box boots cleanly and signs JWTs with a publicly known secret. The `??` fallbacks must only apply when `NODE_ENV !== "production"`, and in production the schema must reject any value matching a known placeholder.

### Important (should-fix before real traffic)

6. **No `middleware.ts`.** All auth gating is per-route via `requireSession()` in server components / per-route handlers. That works, but a thin middleware layer would let us (a) inject security headers (CSP, HSTS, Permissions-Policy) without touching Caddy on every config change, and (b) cheaply early-block requests the limiter has marked.

7. **Caddyfile is missing HSTS and CSP.** `Caddyfile:4-9` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`. Missing: `Strict-Transport-Security`, `Content-Security-Policy` (start with `Report-Only`), `Permissions-Policy`.

8. **No structured logging / error reporting.** Webhook failures are logged via `console.error("[webhook:platega] failed", error)` (`app/api/webhook/platega/route.ts:51`) and recorded in `AdminLog`. There is no Sentry / Pino / OTel hook, so the only way to notice a spike of failed payments is to manually open the admin logs page. For a payments product this is the wrong default.

9. **No documented backup / restore procedure.** `docker-compose.yml` mounts `postgres_data` as a named volume but there is no backup cron, no `pg_dump` script, no restore drill in the README. A disk failure today loses all paying users.

10. **`prisma db push` fallback in the Dockerfile.** `Dockerfile:22` and `docker-compose.yml:23` both contain the `if [ -d prisma/migrations ]` branch. After fix #1 lands, this fallback should be removed entirely so a missing-migrations folder fails loudly instead of silently destroying schema history.

### Nice-to-have (track separately, not in scope)

- No CSRF tokens on mutating routes. SameSite=Lax cookies cover the common case but not all browser contexts.
- No request-id propagation for cross-service tracing.
- `npm audit` / Dependabot is not configured.
- No load test or k6 script committed.

These are real but outside the scope of "minimum to call it production-ready" — leave them for a follow-up plan.

---

## Plan

### Task 1 — Capture the current schema as a baseline migration

- [ ] Run `npx prisma migrate dev --name 0_init --create-only` against a throwaway empty Postgres (a temporary `docker run --rm postgres:16-alpine`). This generates `prisma/migrations/<timestamp>_0_init/migration.sql` without applying it.
- [ ] Inspect the generated SQL — it must match the current `schema.prisma` exactly. No data, no `DROP TABLE`.
- [ ] Commit `prisma/migrations/<timestamp>_0_init/migration.sql` and `prisma/migrations/migration_lock.toml`.
- [ ] Remove the `if [ -d prisma/migrations ]` fallback from both `Dockerfile:22` and `docker-compose.yml:23` — collapse to a plain `npx prisma migrate deploy`. The build must fail if migrations are absent.
- [ ] Add a vitest spec `__tests__/prisma/migrations.test.ts` that asserts `prisma/migrations/` is non-empty and contains a `migration_lock.toml` — guards against the directory being deleted.

**Acceptance:** Fresh `docker compose up -d` against an empty database creates the schema via `migrate deploy`, not `db push`. `npm run test` passes.

### Task 2 — Tighten `lib/env.ts` so production cannot boot with placeholders

- [ ] Replace the per-field `?? "..."` fallbacks with a single conditional: when `process.env.NODE_ENV === "production"`, every required secret must be present and **must not** match its known placeholder. When `NODE_ENV !== "production"`, the dev fallbacks stay so local `npm run dev` keeps working.
- [ ] Add a `KNOWN_PLACEHOLDERS` set in `lib/env.ts` (the literal strings currently used as fallbacks) and reject any value in that set during prod validation with a clear error: `"JWT_SECRET is set to the development placeholder — generate a real secret"`.
- [ ] Add `__tests__/lib/env.test.ts`: with `NODE_ENV=production` and a placeholder `JWT_SECRET`, importing `lib/env` must throw. With a real 64-char hex secret, it must succeed.
- [ ] Update `.env.example` so each placeholder is suffixed with `# REPLACE BEFORE PRODUCTION` and the values are obviously fake (e.g. `JWT_SECRET=REPLACE_WITH_OPENSSL_RAND_HEX_32`).

**Acceptance:** `NODE_ENV=production npm run build` against an unconfigured `.env` exits non-zero with a readable error listing every offending variable. Local dev is unchanged.

### Task 3 — Remove the hardcoded admin password from `prisma/seed.ts`

- [ ] Add `ADMIN_INITIAL_PASSWORD` to `lib/env.ts` as an **optional** secret. When `ADMIN_EMAILS` is set and `ADMIN_INITIAL_PASSWORD` is missing, seeding must `throw` with a clear message instructing the operator to set it (or pre-create the admin manually).
- [ ] Replace the `bcrypt.hash("change-me-admin-password", 12)` literal at `prisma/seed.ts:102` with `bcrypt.hash(env.ADMIN_INITIAL_PASSWORD, 12)`.
- [ ] Update `README.md:73-77` — drop the hardcoded password line, replace with: "Set `ADMIN_INITIAL_PASSWORD` in `.env` before the first `db:seed`. Rotate immediately after first login."
- [ ] Add `__tests__/prisma/seed.test.ts` that imports the seed module with `ADMIN_EMAILS=admin@example.com` and no `ADMIN_INITIAL_PASSWORD` → expect throw.

**Acceptance:** Grepping the repo for `change-me-admin-password` returns zero hits. README no longer documents a default credential.

### Task 4 — Add an in-process rate limiter and wire it to auth routes

- [ ] Create `lib/server/rate-limit.ts` exporting `enforceRateLimit({ key, max, windowMs })`. Implementation: a `Map<string, { count, resetAt }>` with periodic GC. Keep it process-local (good enough for one-app-container; document the limit in the file header).
- [ ] In `app/api/auth/login/route.ts`, before `loginUser(body)`, call `enforceRateLimit({ key: \`login:${getClientIp(request)}\`, max: 10, windowMs: 60_000 })`. On limit hit return `apiError("Слишком много попыток, попробуйте позже", 429)`.
- [ ] Same wiring in `app/api/auth/register/route.ts` (max 5 / 60 s) and `app/api/auth/telegram/route.ts` (max 10 / 60 s).
- [ ] Add `__tests__/lib/server/rate-limit.test.ts` covering: under-limit passes, over-limit throws, window resets after `windowMs`.
- [ ] Add `__tests__/app/api/auth/login.rate-limit.test.ts` that fires 11 requests from the same IP and asserts the 11th gets 429.

**Acceptance:** Curling `/api/auth/login` 11 times in a row from the same source returns one 429. Existing login tests still pass.

### Task 5 — Wire structured webhook logging

- [ ] Add `lib/server/logger.ts` — a tiny wrapper that prints JSON lines (`{ts, level, msg, ...fields}`) to stdout. No external dep. Replaces ad-hoc `console.error` in the two webhook routes.
- [ ] Replace the two `console.error("[webhook:..." )` calls in `app/api/webhook/yookassa/route.ts:36` and `app/api/webhook/platega/route.ts:51` with `logger.error("webhook.failed", { provider, paymentId: targetId, error: serializeError(e) })`.
- [ ] Document in the runbook (Task 8) how to grep these lines from `docker compose logs app`.

**Acceptance:** A failing webhook produces a single JSON line on stdout containing `provider`, `paymentId`, and `error.message`. Existing webhook tests still pass.

### Task 6 — Add HSTS + CSP-Report-Only to `Caddyfile`

- [ ] In `Caddyfile`, inside the `header { ... }` block, add:
  - `Strict-Transport-Security "max-age=31536000; includeSubDomains"`
  - `Permissions-Policy "camera=(), microphone=(), geolocation=()"`
  - `Content-Security-Policy-Report-Only "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.yookassa.ru https://*.platega.io; frame-ancestors 'none'"`
- [ ] Deploy with Report-Only first. After one week of clean reports, a follow-up plan should flip to enforcing CSP.
- [ ] No test (Caddy config is not unit-tested in this repo). Manual verification: `curl -I https://<host>` after deploy must show the three new headers.

**Acceptance:** Production response headers contain HSTS, Permissions-Policy, and CSP-Report-Only. Site still loads in Chrome/Firefox/Safari without console errors.

### Task 7 — Add a CI workflow

- [ ] Create `.github/workflows/ci.yml` triggered on `pull_request` and `push: main`:
  ```yaml
  name: CI
  on:
    pull_request:
    push:
      branches: [main]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '22', cache: 'npm' }
        - run: npm ci
        - run: npx prisma generate
        - run: npm run lint
        - run: npm run test
  ```
- [ ] Make sure `npm run lint` and `npm run test` are green on `main` before opening any PR for the rest of this plan, otherwise the first CI run will block everything.
- [ ] Add a status badge to the top of `README.md`.

**Acceptance:** Opening any PR runs lint + tests automatically. A red build blocks merge (configured in repo settings — manual step, document it in the runbook).

### Task 8 — Write `docs/RUNBOOK.md`

- [ ] New file `docs/RUNBOOK.md` with these sections:
  - **First deploy:** prerequisites, `.env` checklist (cross-link `.env.example`), `docker compose up -d`, health verification.
  - **Schema change workflow:** `npx prisma migrate dev --name <slug>` locally → commit → on prod the `migrate` service applies it automatically. Explicitly forbid `prisma db push` against prod.
  - **Postgres backup:** sample `cron` line that runs `pg_dump` inside the postgres container nightly into a host directory + 7-day rotation. (Add the script as `scripts/backup.sh`.)
  - **Restore drill:** how to recreate the volume from a dump.
  - **Rotating secrets:** which env vars to regenerate, in what order, with what restart sequence.
  - **Reading webhook errors:** `docker compose logs app | grep webhook.failed` (depends on Task 5).
- [ ] Add `scripts/backup.sh` (referenced by the runbook) — a 15-line bash script that runs `pg_dump` via `docker compose exec`.

**Acceptance:** A new operator can follow `RUNBOOK.md` end-to-end on a clean Linux box and have a working, backed-up deployment without reading any other file.

---

## Out of scope

- Redesigning auth (OAuth, magic links, 2FA).
- Replacing the in-process limiter with Redis. Acceptable trade-off for a single-container deploy; revisit when horizontally scaled.
- CSRF tokens. SameSite=Lax + the new rate limiter cover the realistic threat model for this product. Reconsider if/when an embedded iframe / cross-origin POST flow is added.
- Sentry / OTel. Logger upgrade in Task 5 makes adding a sink later mechanical.
- Load testing.

These are listed so reviewers know the omissions are deliberate, not forgotten.

---

## Verification checklist (run after every task lands)

- [ ] `npm run lint` — clean
- [ ] `npm run test` — all green (35 existing + new specs)
- [ ] `docker compose -f docker-compose.yml up -d` against an empty volume — comes up healthy
- [ ] `curl -I https://<host>/api/health` — 200 + new security headers (after Task 6)
- [ ] `grep -R "change-me-admin-password" .` — zero hits (after Task 3)
- [ ] `grep -R "development_only_change_me" .` — only inside `lib/env.ts` placeholder set (after Task 2)
