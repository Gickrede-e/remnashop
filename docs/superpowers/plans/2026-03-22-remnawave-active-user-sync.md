# Remnawave Active User Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe `gs_*` Remnawave identity provisioning for site users and a bulk admin sync action that creates or attaches missing Remnawave users for locally active subscriptions.

**Architecture:** Keep `subscriptions.ts` as the orchestrator for payments, grants, and sync, but extract the site-specific Remnawave identity rules into a focused helper module. Extend the existing Remnawave client with lookup helpers, add a bulk admin route that returns summary counts, and mount one dedicated client button on the admin users page for the new action.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Vitest, server-side `fetch`, React client components

---

## File Map

- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/remnawave-site-identities.ts`
  Purpose: Generate `gs_*` usernames, classify site-managed remote users, choose safe attach candidates, and own the attach-or-create flow used by subscriptions.
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/__tests__/lib/services/remnawave-site-identities.test.ts`
  Purpose: Lock deterministic username generation, suffix preservation, `gs_*` filtering, email-match rules, and “uuid already linked elsewhere” safety checks.
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/__tests__/lib/services/subscriptions-active-sync.test.ts`
  Purpose: Cover candidate filtering for bulk sync, summary counts, stale-link recovery handoff, and per-user isolation inside the aggregate sync.
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/app/api/admin/users/sync/route.ts`
  Purpose: Admin-only bulk sync endpoint returning summary counts from the subscriptions service.
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/__tests__/app/api/admin/users/sync.route.test.ts`
  Purpose: Verify admin guard wiring, success payload shape, and bulk sync error handling.
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/components/admin/active-users-sync-button.tsx`
  Purpose: Client-side pending state, POST request to the new admin route, alert summary, and page refresh after success.
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/__tests__/components/admin/active-users-sync-button.test.ts`
  Purpose: Static render coverage for the new admin button label and minimal shell-safe markup without changing the current Vitest file pattern.
- Modify: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/remnawave.ts`
  Purpose: Add lookup helpers for `by-username` and `by-email`, plus shared not-found detection for recovery flows.
- Modify: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/subscriptions.ts`
  Purpose: Remove the old inline username builder, delegate identity work to the new helper, recover stale links, and expose the bulk sync summary method.
- Modify: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/app/admin/users/page.tsx`
  Purpose: Mount the new bulk sync button near the user search controls.
- Reference: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/docs/superpowers/specs/2026-03-22-remnawave-active-user-sync-design.md`
  Purpose: Source of truth for safety rules, candidate scope, and outcome definitions.

### Task 1: Lock `gs_*` Identity Rules in a Dedicated Helper

**Files:**
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/remnawave-site-identities.ts`
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/__tests__/lib/services/remnawave-site-identities.test.ts`

- [ ] **Step 1: Write the failing helper test file**

```ts
import { describe, expect, it } from "vitest";

import {
  buildPrimaryProjectUsername,
  buildFallbackProjectUsername,
  isProjectManagedRemnawaveUsername,
  selectSafeAttachCandidate
} from "@/lib/services/remnawave-site-identities";

describe("remnawave site identities", () => {
  it("builds the primary gs username from the email local-part", () => {
    expect(buildPrimaryProjectUsername("Alice.Test+promo@example.com")).toBe("gs_alice_test_promo");
  });

  it("preserves the deterministic suffix while keeping the fallback inside 36 chars", () => {
    expect(buildFallbackProjectUsername("very.long.email.alias.with.many.parts@example.com", "cm8abc123xyz987654")).toMatch(
      /^gs_[a-z0-9_]+_[a-z0-9]{10}$/
    );
  });

  it("treats only gs-prefixed usernames as project managed", () => {
    expect(isProjectManagedRemnawaveUsername("gs_alice")).toBe(true);
    expect(isProjectManagedRemnawaveUsername("alice-other-project")).toBe(false);
  });

  it("rejects username hits when the remote email does not match", () => {
    const candidate = selectSafeAttachCandidate({
      localEmail: "alice@b.com",
      usernameHit: { uuid: "rw-1", username: "gs_alice", email: "alice@a.com" },
      emailHits: [],
      linkedRemoteUuids: new Set()
    });

    expect(candidate).toBeNull();
  });

  it("rejects remote uuids already linked to another local user", () => {
    const candidate = selectSafeAttachCandidate({
      localEmail: "alice@example.com",
      usernameHit: { uuid: "rw-1", username: "gs_alice", email: "alice@example.com" },
      emailHits: [],
      linkedRemoteUuids: new Set(["rw-1"])
    });

    expect(candidate).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused helper test to verify it fails**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run __tests__/lib/services/remnawave-site-identities.test.ts
```

Expected: FAIL because `@/lib/services/remnawave-site-identities` does not exist yet.

- [ ] **Step 3: Write the minimal helper module**

Implementation requirements:
- export pure helpers for:
  - primary username generation
  - deterministic fallback username generation
  - `gs_*` prefix classification
  - safe attach candidate selection
- keep the module free of Prisma and `fetch` so the tests stay fast and deterministic.

Minimal shape:

```ts
export type RemnawaveLookupUser = {
  uuid: string;
  username: string;
  email?: string | null;
};

export function buildPrimaryProjectUsername(email: string) {
  return "gs_user";
}

export function buildFallbackProjectUsername(email: string, userId: string) {
  return `gs_user_${userId.slice(-10).toLowerCase()}`;
}

export function isProjectManagedRemnawaveUsername(username: string) {
  return username.startsWith("gs_");
}

export function selectSafeAttachCandidate() {
  return null;
}
```

- [ ] **Step 4: Run the focused helper test again**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run __tests__/lib/services/remnawave-site-identities.test.ts
```

Expected: PASS for normalization, fallback, prefix classification, and unsafe-match rejection.

- [ ] **Step 5: Commit**

```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && git add __tests__/lib/services/remnawave-site-identities.test.ts lib/services/remnawave-site-identities.ts && git commit -m "test: lock remnawave site identity rules"
```

### Task 2: Integrate Safe Identity Lookup and Recovery into Subscriptions

**Files:**
- Modify: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/remnawave.ts`
- Modify: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/subscriptions.ts`
- Modify: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/remnawave-site-identities.ts`
- Modify: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/__tests__/lib/services/remnawave-site-identities.test.ts`

- [ ] **Step 1: Extend the failing helper tests for remote lookup decisions**

Add cases covering:

```ts
it("attaches a gs username hit when the email matches and the uuid is free", () => {
  const candidate = selectSafeAttachCandidate({
    localEmail: "alice@example.com",
    usernameHit: { uuid: "rw-1", username: "gs_alice", email: "alice@example.com" },
    emailHits: [],
    linkedRemoteUuids: new Set()
  });

  expect(candidate?.uuid).toBe("rw-1");
});

it("uses a single gs email match when username lookup misses", () => {
  const candidate = selectSafeAttachCandidate({
    localEmail: "alice@example.com",
    usernameHit: null,
    emailHits: [
      { uuid: "rw-1", username: "gs_alice", email: "alice@example.com" }
    ],
    linkedRemoteUuids: new Set()
  });

  expect(candidate?.uuid).toBe("rw-1");
});

it("rejects ambiguous gs email matches", () => {
  const candidate = selectSafeAttachCandidate({
    localEmail: "alice@example.com",
    usernameHit: null,
    emailHits: [
      { uuid: "rw-1", username: "gs_alice", email: "alice@example.com" },
      { uuid: "rw-2", username: "gs_alice_x9", email: "alice@example.com" }
    ],
    linkedRemoteUuids: new Set()
  });

  expect(candidate).toBeNull();
});

it("rejects email matches that belong only to non-project usernames", () => {
  const candidate = selectSafeAttachCandidate({
    localEmail: "alice@example.com",
    usernameHit: null,
    emailHits: [
      { uuid: "rw-9", username: "alice-other-project", email: "alice@example.com" }
    ],
    linkedRemoteUuids: new Set()
  });

  expect(candidate).toBeNull();
});
```

- [ ] **Step 2: Run the helper test file and confirm the new cases fail**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run __tests__/lib/services/remnawave-site-identities.test.ts
```

Expected: FAIL because the current helper does not resolve attach candidates yet.

- [ ] **Step 3: Extend the Remnawave client with lookup helpers**

Add to `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/remnawave.ts`:
- `getRemnawaveUserByUsername(username: string)`
- `listRemnawaveUsersByEmail(email: string)`
- a narrow helper to classify `404` as not-found for recovery flows

Keep the existing normalization style, `cache: "no-store"`, and `unwrap()` behavior.

- [ ] **Step 4: Integrate the helper into subscriptions**

Implementation requirements inside `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/subscriptions.ts`:
- remove the old `buildRemnawaveUsername` helper
- replace inline username building with `buildPrimaryProjectUsername` and `buildFallbackProjectUsername`
- route all attach-or-create work through one focused helper from `remnawave-site-identities.ts`
- update `ensureRemnawaveIdentity` to:
  - attach by username only when remote email matches
  - attach by email only for `gs_*` users
  - skip remote uuids already linked elsewhere locally
  - skip instead of creating when email lookup finds only non-`gs_` remote users
  - create a new remote user only when there are no conflicting remote email matches and no safe attach candidate exists
- update `syncUserSubscription` so a stale `remnawaveUuid` can recover through the same attach-or-create flow instead of silently failing
- keep `activateSubscriptionFromPayment` and `grantSubscriptionByAdmin` calling the shared logic rather than duplicating it

- [ ] **Step 5: Run the focused helper test and type-check affected files**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run __tests__/lib/services/remnawave-site-identities.test.ts
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npx tsc --noEmit
```

Expected: PASS for the helper tests and PASS for type-check after the subscription wiring is updated.

- [ ] **Step 6: Commit**

```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && git add lib/services/remnawave.ts lib/services/subscriptions.ts lib/services/remnawave-site-identities.ts __tests__/lib/services/remnawave-site-identities.test.ts && git commit -m "feat: add safe remnawave identity recovery"
```

### Task 3: Add Bulk Active-Subscription Sync and the Admin Route

**Files:**
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/__tests__/lib/services/subscriptions-active-sync.test.ts`
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/app/api/admin/users/sync/route.ts`
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/__tests__/app/api/admin/users/sync.route.test.ts`
- Modify: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/subscriptions.ts`

- [ ] **Step 1: Write the failing bulk-sync service test**

```ts
import { describe, expect, it, vi } from "vitest";

import { syncActiveSubscriptionsToRemnawave } from "@/lib/services/subscriptions";

describe("syncActiveSubscriptionsToRemnawave", () => {
  it("only targets still-valid ACTIVE subscriptions and aggregates summary counts", async () => {
    // mock prisma active/expired/disabled users
    // mock attach-or-create outcomes: created, attached, skipped, failed

    const result = await syncActiveSubscriptionsToRemnawave();

    expect(result).toMatchObject({
      totalCandidates: 2,
      created: 1,
      attached: 1,
      skipped: 0,
      failed: 0
    });
  });

  it("treats a stored remnawaveUuid that no longer resolves as a recovery path instead of a hard failure", async () => {
    // mock one ACTIVE subscription with a stale remnawaveUuid
    // mock shared identity recovery to return an attached or created outcome

    const result = await syncActiveSubscriptionsToRemnawave();

    expect(result.created + result.attached).toBe(1);
    expect(result.failed).toBe(0);
  });
});
```

- [ ] **Step 2: Write the failing route test**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-session", () => ({
  requireApiAdminSession: vi.fn(async () => ({ userId: "admin-1" }))
}));

vi.mock("@/lib/services/subscriptions", () => ({
  syncActiveSubscriptionsToRemnawave: vi.fn(async () => ({
    totalCandidates: 1,
    created: 1,
    attached: 0,
    alreadyLinked: 0,
    skipped: 0,
    failed: 0,
    items: []
  }))
}));

import { POST } from "@/app/api/admin/users/sync/route";

describe("POST /api/admin/users/sync", () => {
  it("returns the bulk sync summary", async () => {
    const response = await POST(new Request("http://localhost/api/admin/users/sync"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.created).toBe(1);
  });
});
```

- [ ] **Step 3: Run both focused tests and confirm they fail**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run __tests__/lib/services/subscriptions-active-sync.test.ts __tests__/app/api/admin/users/sync.route.test.ts
```

Expected: FAIL because the bulk service and route do not exist yet.

- [ ] **Step 4: Implement the bulk sync service**

Implementation requirements:
- add `syncActiveSubscriptionsToRemnawave` to `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/lib/services/subscriptions.ts`
- query only subscriptions where:
  - `status === ACTIVE`
  - `expiresAt` is null or greater than `now`
- process users independently with a small fixed concurrency
- reuse the shared attach-or-create logic from Task 2
- classify results into `created`, `attached`, `alreadyLinked`, `skipped`, and `failed`
- include `userId`, `email`, `outcome`, and `message` in `items`

- [ ] **Step 5: Implement the new admin route**

In `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/app/api/admin/users/sync/route.ts`:
- require an admin session
- call `syncActiveSubscriptionsToRemnawave`
- write one `SYNC_ACTIVE_USERS` admin log with counts and failed/skipped ids
- return `apiOk(summary)` on success
- return `apiError(...)` on failure

- [ ] **Step 6: Run the focused tests again**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run __tests__/lib/services/subscriptions-active-sync.test.ts __tests__/app/api/admin/users/sync.route.test.ts
```

Expected: PASS for the bulk summary and admin route contract.

- [ ] **Step 7: Commit**

```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && git add __tests__/lib/services/subscriptions-active-sync.test.ts __tests__/app/api/admin/users/sync.route.test.ts app/api/admin/users/sync/route.ts lib/services/subscriptions.ts && git commit -m "feat: add bulk remnawave sync route"
```

### Task 4: Expose the Bulk Sync Action in Admin Users UI

**Files:**
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/components/admin/active-users-sync-button.tsx`
- Create: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/__tests__/components/admin/active-users-sync-button.test.ts`
- Modify: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/app/admin/users/page.tsx`

- [ ] **Step 1: Write the failing render test for the new button**

```ts
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ActiveUsersSyncButton } from "@/components/admin/active-users-sync-button";

describe("ActiveUsersSyncButton", () => {
  it("renders the admin bulk sync label", () => {
    const html = renderToStaticMarkup(React.createElement(ActiveUsersSyncButton));

    expect(html).toContain("Синхронизировать активных");
  });
});
```

- [ ] **Step 2: Run the focused render test and confirm it fails**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run __tests__/components/admin/active-users-sync-button.test.ts
```

Expected: FAIL because the button component does not exist yet.

- [ ] **Step 3: Implement the client button and mount it on the page**

Component requirements:
- use `"use client"`
- use `useTransition`
- POST to `/api/admin/users/sync`
- while pending, show a disabled loading label
- on success, show a compact `window.alert` summary using the returned counts and call `router.refresh()`
- on failure, show a compact error alert

Page requirements in `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/app/admin/users/page.tsx`:
- add the new button to the existing controls cluster near search
- keep the current search and reset controls intact
- do not move per-user actions out of the cards/table rows

- [ ] **Step 4: Run the focused render test**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run __tests__/components/admin/active-users-sync-button.test.ts
```

Expected: PASS for the button label render.

- [ ] **Step 5: Commit**

```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && git add components/admin/active-users-sync-button.tsx __tests__/components/admin/active-users-sync-button.test.ts app/admin/users/page.tsx && git commit -m "feat: add admin active sync button"
```

### Task 5: Run Full Verification and Manual Checks

**Files:**
- Review: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/docs/superpowers/specs/2026-03-22-remnawave-active-user-sync-design.md`
- Review: `/home/gickrede/remnashop/.worktrees/feat/remnashop-web/docs/superpowers/plans/2026-03-22-remnawave-active-user-sync.md`

- [ ] **Step 1: Run the focused new tests as one batch**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run __tests__/lib/services/remnawave-site-identities.test.ts __tests__/lib/services/subscriptions-active-sync.test.ts __tests__/app/api/admin/users/sync.route.test.ts __tests__/components/admin/active-users-sync-button.test.ts
```

Expected: PASS for all new targeted tests.

- [ ] **Step 2: Run repository verification**

Run:
```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm run lint
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npx tsc --noEmit
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm test -- --run
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && npm run build
```

Expected:
- `lint`: PASS
- `tsc`: PASS
- `vitest`: PASS
- `build`: PASS

- [ ] **Step 3: Run manual browser verification**

Manual checks:
1. Sign in as admin and open `/admin/users`.
2. Confirm the new `Синхронизировать активных` button is visible near the search controls.
3. Trigger bulk sync and verify the success alert summary shows counts.
4. Confirm a local user with a valid active subscription and no Remnawave record gets created with a `gs_*` username.
5. Confirm a remote non-`gs_` user with the same email is skipped and not attached.
6. Confirm per-user `Синхронизировать` still works after the shared recovery logic changed.

- [ ] **Step 4: Commit the verified final state**

```bash
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && git status --short
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && git add lib/services/remnawave.ts lib/services/subscriptions.ts lib/services/remnawave-site-identities.ts app/api/admin/users/sync/route.ts app/admin/users/page.tsx components/admin/active-users-sync-button.tsx __tests__/lib/services/remnawave-site-identities.test.ts __tests__/lib/services/subscriptions-active-sync.test.ts __tests__/app/api/admin/users/sync.route.test.ts __tests__/components/admin/active-users-sync-button.test.ts
cd /home/gickrede/remnashop/.worktrees/feat/remnashop-web && git commit -m "feat: add remnawave active user sync"
```
