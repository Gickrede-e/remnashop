# Admin Provider Status Overview Design

Date: 2026-03-22
Worktree: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild`

## Summary

Replace the admin overview card titled `Что проверять дальше` with a server-rendered `Статусы модулей` block that shows live provider availability for `Remnawave`, `YooKassa`, and `Platega`.

The block must preserve the current mobile-first admin overview structure, avoid extra client-side hydration, and degrade safely when one or more external providers are slow or unavailable.

## Goals

- Show the current operational state of critical external modules directly on `/admin`.
- Keep the admin overview server-first and light on mobile.
- Prevent one failing provider from breaking the full admin page.
- Distinguish provider misconfiguration from runtime outages and timeouts.

## Non-Goals

- No auto-refresh polling.
- No new public routes.
- No changes to existing payment, sync, or webhook business logic.
- No provider-side mutating checks or synthetic transactions.

## Current State

`/admin` renders KPI, quick actions, a revenue chart, and a generic detail card with static operational hints. The current hint card is useful as copy, but not operationally actionable because it does not reflect the real state of external dependencies.

The existing admin overview is already server-rendered and structured around reusable overview blocks, which makes it a good fit for a server-computed status section with no extra client runtime.

## Proposed Design

### Data Flow

`app/admin/page.tsx` will fetch one additional overview dependency: a provider status summary generated on the server during page render.

A new server helper in `lib/services/provider-status.ts` will:

- run `Remnawave`, `YooKassa`, and `Platega` checks in parallel;
- use `Promise.allSettled` so one failed probe does not fail the page;
- normalize all outcomes into a shared view model consumed by the admin overview UI.

### Status Model

Each provider row returns:

- `label`: provider name;
- `status`: one of `available`, `timeout`, `unavailable`, `not_configured`;
- `summary`: short user-facing status text;
- `detail`: concise technical explanation;
- `checkedAt`: ISO timestamp for when the probe completed.

`checkedAt` is helper metadata for logging, tests, and future refresh UX. It is not rendered in the first version of the admin overview block.

Display labels:

- `available` -> `Доступен`
- `timeout` -> `Таймаут`
- `unavailable` -> `Недоступен`
- `not_configured` -> `Не настроен`

### Probe Rules

All probes are read-only. They must not create payments, mutate users, sync subscriptions, or update remote state.

Common rules:

- short hard timeout per provider;
- `cache: "no-store"`;
- explicit classification for config, auth, network, timeout, and unknown failures;
- placeholder or empty environment values should yield `not_configured` without making a remote request;
- if a provider does not already have a safe, known read-only probe in the current codebase, the implementation plan must include provider-doc lookup and explicit endpoint selection before coding starts.

Provider rules:

- `Remnawave`: authenticated lightweight read request against the Remnawave API.
- `YooKassa`: authenticated lightweight read request against the official YooKassa API using the existing Basic auth pattern.
- `Platega`: authenticated lightweight read request against the Platega API using the existing auth pattern.

Known `not_configured` heuristics must be explicit rather than inferred ad hoc:

- `Remnawave`: empty values, `https://your-panel.example.com`, or `placeholder_token`.
- `YooKassa`: empty values, `123456`, or `test_secret_key`.
- `Platega`: empty values or placeholder defaults such as `platega_placeholder_key` and `platega_placeholder_secret`.

### UI Changes

The existing `Что проверять дальше` section in the admin overview is replaced with `Статусы модулей`.

The new block remains inside the existing overview grid and renders as a compact status list:

- provider name on the left;
- status text as the primary value;
- short technical detail below;
- low-cost color indicator per row:
  - green for `Доступен`;
  - yellow for `Таймаут`;
  - red for `Недоступен`;
  - gray for `Не настроен`.

This block stays server-rendered and does not add client-side refresh logic.

## Error Handling

- Provider probe failures are contained inside the provider status helper.
- `/admin` must still render even if all provider checks fail.
- Route-level error boundaries are not used for provider probe failures.
- If a provider returns an auth error, the UI should reflect that as an unavailable status with a concise auth-related detail.

## Performance Constraints

- Checks must run in parallel.
- Checks must use a short timeout to keep `/admin` responsive on mobile.
- No additional client components are introduced for this feature.
- The UI should reuse existing overview card patterns rather than introduce heavy new compositions.

## Testing

Verification for the implementation should include:

- unit coverage for status normalization and timeout/error mapping;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm test -- --run`;
- `npm run build`;
- manual admin overview verification in the local Docker stack.

Manual checks should confirm:

- each provider can render `Доступен`, `Недоступен`, `Таймаут`, and `Не настроен`;
- `/admin` still renders if one or more providers fail;
- the replaced block remains visually compact on mobile.
