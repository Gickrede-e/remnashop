# Admin Provider Status Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `Что проверять дальше` admin overview card with a server-rendered live status block for `Remnawave`, `YooKassa`, and `Platega`.

**Architecture:** Keep `/admin` server-first. Add a focused server helper that normalizes provider probe results, classify placeholders before any network call, and pass the resulting rows into the existing admin overview composition. Reuse the current card layout system instead of adding a new client widget or extra route.

**Tech Stack:** Next.js App Router, TypeScript, server-side `fetch`, Vitest, React server rendering tests

---

## File Map

- Create: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/lib/services/provider-status.ts`
  Purpose: Provider probe contract, config heuristics, timeout handling, result normalization, aggregate overview helper.
- Create: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/__tests__/lib/services/provider-status.test.ts`
  Purpose: Unit coverage for `not_configured`, `available`, `timeout`, auth/network failure mapping, and aggregate safety.
- Create: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/__tests__/components/admin/admin-overview-blocks.test.ts`
  Purpose: Server-rendered UI assertions for the new provider status section and removal of the old static card content.
- Modify: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/components/blocks/admin/admin-overview-blocks.tsx`
  Purpose: Extend the overview block API to render a compact provider status section with low-cost status indicators.
- Modify: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/app/admin/page.tsx`
  Purpose: Fetch provider statuses on the server and replace the old static section with the new module status block.
- Review reference: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/docs/superpowers/specs/2026-03-22-admin-provider-status-overview-design.md`
  Purpose: Source of truth for scope, failure modes, and UI behavior.

### Task 1: Lock the Provider Status Contract with Failing Tests

**Files:**
- Create: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/__tests__/lib/services/provider-status.test.ts`
- Create: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/lib/services/provider-status.ts`

- [ ] **Step 1: Write the failing service test file**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    REMNAWAVE_BASE_URL: "https://your-panel.example.com",
    REMNAWAVE_API_TOKEN: "placeholder_token",
    YOOKASSA_SHOP_ID: "123456",
    YOOKASSA_SECRET_KEY: "test_secret_key",
    PLATEGA_API_KEY: "platega_placeholder_key",
    PLATEGA_WEBHOOK_SECRET: "platega_placeholder_secret",
    PLATEGA_MERCHANT_ID: ""
  }
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { getProviderStatuses } from "@/lib/services/provider-status";

describe("getProviderStatuses", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockEnv.REMNAWAVE_BASE_URL = "https://your-panel.example.com";
    mockEnv.REMNAWAVE_API_TOKEN = "placeholder_token";
    mockEnv.YOOKASSA_SHOP_ID = "123456";
    mockEnv.YOOKASSA_SECRET_KEY = "test_secret_key";
    mockEnv.PLATEGA_API_KEY = "platega_placeholder_key";
    mockEnv.PLATEGA_WEBHOOK_SECRET = "platega_placeholder_secret";
    mockEnv.PLATEGA_MERCHANT_ID = "";
  });

  it("marks placeholder providers as not_configured without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getProviderStatuses();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.map((item) => item.status)).toEqual([
      "not_configured",
      "not_configured",
      "not_configured"
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npm test -- --run __tests__/lib/services/provider-status.test.ts
```

Expected: FAIL because `@/lib/services/provider-status` does not exist yet.

- [ ] **Step 3: Write the minimal provider status module**

```ts
export type ProviderStatus = "available" | "timeout" | "unavailable" | "not_configured";

export type ProviderStatusRow = {
  label: string;
  status: ProviderStatus;
  summary: string;
  detail: string;
  checkedAt: string;
};

export async function getProviderStatuses(): Promise<ProviderStatusRow[]> {
  const now = new Date().toISOString();

  return [
    { label: "Remnawave", status: "not_configured", summary: "Не настроен", detail: "placeholder config", checkedAt: now },
    { label: "YooKassa", status: "not_configured", summary: "Не настроен", detail: "placeholder config", checkedAt: now },
    { label: "Platega", status: "not_configured", summary: "Не настроен", detail: "placeholder config", checkedAt: now }
  ];
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npm test -- --run __tests__/lib/services/provider-status.test.ts
```

Expected: PASS for the new placeholder-config contract test.

- [ ] **Step 5: Commit**

```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && git add __tests__/lib/services/provider-status.test.ts lib/services/provider-status.ts && git commit -m "test: lock provider status contract"
```

### Task 2: Implement Real Probe Classification and Timeout Handling

**Files:**
- Modify: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/__tests__/lib/services/provider-status.test.ts`
- Modify: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/lib/services/provider-status.ts`
- Reference: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/lib/services/remnawave.ts`
- Reference: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/lib/services/yookassa.ts`
- Reference: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/lib/services/platega.ts`

- [ ] **Step 1: Confirm the external probe contracts before coding**

Confirm and record these external contracts from official docs before touching the implementation:
- `YooKassa`: `GET https://api.yookassa.ru/v3/payments?limit=1` with Basic auth from `YOOKASSA_SHOP_ID:YOOKASSA_SECRET_KEY`;
- `Platega`: `GET https://app.platega.io/transaction/balance-unlock-operations?from=<iso>&to=<iso>&page=1&size=1` with `X-MerchantId` and `X-Secret`.

Write the chosen endpoint/auth pair into the new tests and the implementation comments so the source of truth is preserved in code review.

- [ ] **Step 2: Extend the failing tests to cover live probe outcomes**

```ts
it("marks a provider as available when the probe returns ok", async () => {
  mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
  mockEnv.REMNAWAVE_API_TOKEN = "real-token";

  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));

  const result = await getProviderStatuses();

  expect(result.find((item) => item.label === "Remnawave")?.status).toBe("available");
});

it("maps a timed out probe to timeout", async () => {
  mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
  mockEnv.REMNAWAVE_API_TOKEN = "real-token";

  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

  const result = await getProviderStatuses({ timeoutMs: 1 });

  expect(result.find((item) => item.label === "Remnawave")?.status).toBe("timeout");
});

it("maps auth and transport failures to unavailable without crashing the aggregate", async () => {
  mockEnv.REMNAWAVE_BASE_URL = "https://panel.example.com";
  mockEnv.REMNAWAVE_API_TOKEN = "real-token";
  mockEnv.YOOKASSA_SHOP_ID = "shop-id";
  mockEnv.YOOKASSA_SECRET_KEY = "secret";
  mockEnv.PLATEGA_API_KEY = "platega-real-key";
  mockEnv.PLATEGA_WEBHOOK_SECRET = "platega-real-secret";
  mockEnv.PLATEGA_MERCHANT_ID = "merchant-1";

  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response("{}", { status: 401, statusText: "Unauthorized" }))
    .mockRejectedValueOnce(new TypeError("fetch failed"))
    .mockResolvedValueOnce(new Response("{}", { status: 200 })));

  const result = await getProviderStatuses();

  expect(result).toHaveLength(3);
  expect(result.find((item) => item.label === "Remnawave")?.status).toBe("unavailable");
  expect(result.find((item) => item.label === "YooKassa")?.status).toBe("unavailable");
  expect(result.find((item) => item.label === "Platega")?.status).toBe("available");
});
```

- [ ] **Step 3: Run the focused test file and confirm the new cases fail**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npm test -- --run __tests__/lib/services/provider-status.test.ts
```

Expected: FAIL because the minimal helper only returns static `not_configured` rows.

- [ ] **Step 4: Implement the real probe layer**

Implementation requirements:
- keep probe helpers isolated inside `lib/services/provider-status.ts`;
- classify `not_configured` before any request using the spec heuristics;
- add a small timeout wrapper, defaulting to a concrete short timeout such as `2500` ms;
- set every external provider probe request to `cache: "no-store"`;
- use `Promise.allSettled` in the aggregate helper;
- normalize each provider to fixed UI labels plus technical `detail`;
- keep checks read-only and avoid any synthetic payment or mutation.

Exact probe selection workflow for this plan:
- `Remnawave`: use the existing authenticated users read route already aligned with the local integration helper, `GET ${env.REMNAWAVE_BASE_URL}/api/users`, with `Authorization: Bearer ${env.REMNAWAVE_API_TOKEN}`. This probe is already evidenced in `lib/services/remnawave.ts`.
- `YooKassa`: before finalizing code, confirm the read-only payment-acceptance probe in official docs and then use `GET https://api.yookassa.ru/v3/payments?limit=1` with Basic auth built from `${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`.
- `Platega`: before finalizing code, confirm the authenticated read-only reporting probe in official docs and then use `GET https://app.platega.io/transaction/balance-unlock-operations?from=<iso>&to=<iso>&page=1&size=1` with `X-MerchantId: ${env.PLATEGA_MERCHANT_ID}` and `X-Secret: ${env.PLATEGA_API_KEY}`.

Explicit `not_configured` rules for this task:
- `Remnawave`: placeholder base URL or placeholder token.
- `YooKassa`: placeholder shop id or placeholder secret key.
- `Platega`: placeholder API key, placeholder webhook secret, or missing `PLATEGA_MERCHANT_ID`.

Suggested shape:

```ts
async function probeWithTimeout(
  label: string,
  run: () => Promise<Response>,
  timeoutMs: number
): Promise<ProviderStatusRow> {
  try {
    const response = await withTimeout(run(), timeoutMs);
    return response.ok
      ? buildStatus(label, "available", "Доступен", "auth ok")
      : buildStatus(label, "unavailable", "Недоступен", `${response.status} ${response.statusText}`.trim());
  } catch (error) {
    return normalizeProbeError(label, error);
  }
}
```

- [ ] **Step 5: Run the service test file again**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npm test -- --run __tests__/lib/services/provider-status.test.ts
```

Expected: PASS for placeholder, timeout, success, and aggregate failure-mapping cases.

- [ ] **Step 6: Commit**

```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && git add __tests__/lib/services/provider-status.test.ts lib/services/provider-status.ts && git commit -m "feat: add provider status probes"
```

### Task 3: Render the Provider Status Block in the Admin Overview

**Files:**
- Create: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/__tests__/components/admin/admin-overview-blocks.test.ts`
- Modify: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/components/blocks/admin/admin-overview-blocks.tsx`
- Modify: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/app/admin/page.tsx`
- Modify: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/lib/services/provider-status.ts`

- [ ] **Step 1: Write the failing overview rendering test**

```ts
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

import { AdminOverviewBlocks } from "@/components/blocks/admin/admin-overview-blocks";

describe("AdminOverviewBlocks provider status section", () => {
  it("renders provider rows and drops the old static copy", () => {
    const markup = renderToStaticMarkup(
      <AdminOverviewBlocks
        summaryTitle="Summary"
        summaryDescription="Summary"
        primaryMetrics={[]}
        contextRows={[]}
        sections={[]}
        providerStatuses={[
          { label: "Remnawave", status: "available", summary: "Доступен", detail: "auth ok", checkedAt: "2026-03-22T00:00:00.000Z" }
        ]}
        quickActions={[]}
      />
    );

    expect(markup).toContain("Статусы модулей");
    expect(markup).toContain("Remnawave");
    expect(markup).toContain("Доступен");
    expect(markup).toContain("auth ok");
    expect(markup).toContain("data-status=\"available\"");
    expect(markup).not.toContain("Что проверять дальше");
  });
});
```

- [ ] **Step 2: Run the focused component test and verify it fails**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npm test -- --run __tests__/components/admin/admin-overview-blocks.test.ts
```

Expected: FAIL because `providerStatuses` is not part of the component contract yet.

- [ ] **Step 3: Implement the UI and route wiring**

Implementation requirements:
- extend `AdminOverviewBlocks` with a dedicated provider status prop instead of overloading generic metrics;
- keep the block server-rendered and visually compact;
- render fixed display labels from normalized status rows;
- render the technical `detail` text and expose a stable per-status styling hook/class for tests;
- remove the old static `Что проверять дальше` section from `app/admin/page.tsx`;
- fetch provider statuses in parallel with the existing admin stats path.

Suggested route change:

```ts
const [stats, providerStatuses] = await Promise.all([
  getAdminStats(),
  getProviderStatuses()
]);
```

- [ ] **Step 4: Run the focused component test, then the full admin-related suite**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npm test -- --run __tests__/components/admin/admin-overview-blocks.test.ts __tests__/lib/services/provider-status.test.ts
```

Expected: PASS with the new provider status section rendering and no regression in provider normalization.

- [ ] **Step 5: Commit**

```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && git add __tests__/components/admin/admin-overview-blocks.test.ts __tests__/lib/services/provider-status.test.ts components/blocks/admin/admin-overview-blocks.tsx app/admin/page.tsx lib/services/provider-status.ts && git commit -m "feat: show provider status block in admin overview"
```

### Task 4: Run Full Verification and Manual Admin Overview Checks

**Files:**
- Verify only: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/app/admin/page.tsx`
- Verify only: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/components/blocks/admin/admin-overview-blocks.tsx`
- Verify only: `/home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild/lib/services/provider-status.ts`

- [ ] **Step 1: Run repository verification gates**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npm run lint
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npx tsc --noEmit
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npm test -- --run
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && npm run build
```

Expected: all commands PASS.

- [ ] **Step 2: Verify the admin overview manually in the local Docker stack**

Manual checklist:
- open `http://localhost/admin`;
- confirm the old `Что проверять дальше` card is gone;
- confirm `Статусы модулей` is visible;
- verify all three providers render one row each;
- verify the UI can represent `Доступен`, `Недоступен`, `Таймаут`, and `Не настроен`;
- force `Не настроен` by using placeholder env values or an empty `PLATEGA_MERCHANT_ID`;
- force `Недоступен` by supplying syntactically valid but rejected credentials and confirming the row still renders;
- force `Таймаут` by pointing a probe host to a non-responsive address or temporarily increasing network latency in a controlled local setup;
- confirm `Доступен` with the normal configured local environment;
- verify degraded states still render the full overview when a provider is unavailable or misconfigured;
- verify the block remains compact on a phone-width viewport.

- [ ] **Step 3: Commit the final polish if verification reveals a small issue**

```bash
cd /home/gickrede/remnashop/.worktrees/feat/dashboard-admin-mobile-rebuild && git add app/admin/page.tsx components/blocks/admin/admin-overview-blocks.tsx lib/services/provider-status.ts __tests__/components/admin/admin-overview-blocks.test.ts __tests__/lib/services/provider-status.test.ts && git commit -m "polish: finalize admin provider status overview"
```

Skip this commit if no code changed during final verification.
