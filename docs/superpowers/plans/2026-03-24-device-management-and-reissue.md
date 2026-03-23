# Device Management & Subscription Reissue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add device management (view/delete) and subscription reissue to the user dashboard.

**Architecture:** New `/dashboard/devices` page (server component) with `DeviceList` client component for interactive deletes. Reissue button as a standalone client component composed into the existing server-rendered subscription card on `/dashboard`. Three new API routes for device delete, device delete-all, and subscription reissue. Four new functions in the Remnawave client.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Zod, Prisma, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-device-management-and-reissue-design.md`

---

## File Map

### New Files

| File | Type | Responsibility |
|------|------|----------------|
| `lib/schemas/devices.ts` | Schema | Zod schema for device delete request |
| `lib/services/remnawave.ts` | Modified | Add 4 new functions + `RemnawaveDevice` type |
| `app/api/subscription/reissue/route.ts` | API route | Reissue subscription (revoke via Remnawave) |
| `app/api/devices/delete/route.ts` | API route | Delete single HWID device |
| `app/api/devices/delete-all/route.ts` | API route | Delete all HWID devices for user |
| `components/blocks/dashboard/reissue-subscription-button.tsx` | Client component | Reissue button + confirmation dialog |
| `components/blocks/dashboard/device-list.tsx` | Client component | Device cards with delete actions |
| `app/dashboard/devices/page.tsx` | Server component | Devices page |
| `__tests__/app/api/subscription/reissue.route.test.ts` | Test | Reissue route tests |
| `__tests__/app/api/devices/delete.route.test.ts` | Test | Device delete route tests |
| `__tests__/app/api/devices/delete-all.route.test.ts` | Test | Device delete-all route tests |

### Modified Files

| File | Change |
|------|--------|
| `lib/ui/app-shell-nav.ts` | Move История to secondary, add Устройства to primary |
| `__tests__/lib/ui/app-shell-nav.test.ts` | Update expected nav items for new layout |
| `lib/services/remnawave.ts` | Add `RemnawaveDevice`, `revokeRemnawaveSubscription`, `getUserDevices`, `deleteUserDevice`, `deleteAllUserDevices` |
| `components/blocks/dashboard/dashboard-overview-blocks.tsx` | Add `ReissueSubscriptionButton` + pass `remnawaveUuid` |
| `app/dashboard/page.tsx` | Pass `remnawaveUuid` to `DashboardOverviewBlocks` |

---

## Task 1: Remnawave Client — Device & Revoke Functions

**Files:**
- Modify: `lib/services/remnawave.ts`

- [ ] **Step 1: Add `RemnawaveDevice` type and `getUserDevices` function**

Add after the existing `getRemnawaveSubscriptionByShortUuid` function at the end of the file:

```typescript
export type RemnawaveDevice = {
  hwid: string;
  platform: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeDevice(payload: Record<string, unknown>): RemnawaveDevice {
  return {
    hwid: String(payload.hwid ?? ""),
    platform: toOptionalString(payload.platform),
    osVersion: toOptionalString(payload.osVersion),
    deviceModel: toOptionalString(payload.deviceModel),
    userAgent: toOptionalString(payload.userAgent),
    createdAt: String(payload.createdAt ?? ""),
    updatedAt: String(payload.updatedAt ?? "")
  };
}

export async function getUserDevices(userUuid: string): Promise<{ devices: RemnawaveDevice[]; total: number }> {
  const data = await remnawaveRequest<{ devices: Array<Record<string, unknown>>; total: number }>(
    `/api/hwid/devices/${userUuid}`
  );
  return {
    devices: data.devices.map(normalizeDevice),
    total: data.total
  };
}
```

- [ ] **Step 2: Add `deleteUserDevice` function**

```typescript
export async function deleteUserDevice(
  userUuid: string,
  hwid: string
): Promise<{ devices: RemnawaveDevice[]; total: number }> {
  const data = await remnawaveRequest<{ devices: Array<Record<string, unknown>>; total: number }>(
    "/api/hwid/devices/delete",
    {
      method: "POST",
      body: JSON.stringify({ userUuid, hwid })
    }
  );
  return {
    devices: data.devices.map(normalizeDevice),
    total: data.total
  };
}
```

- [ ] **Step 3: Add `deleteAllUserDevices` function**

```typescript
export async function deleteAllUserDevices(userUuid: string): Promise<{ total: number }> {
  const data = await remnawaveRequest<{ devices: Array<Record<string, unknown>>; total: number }>(
    "/api/hwid/devices/delete-all",
    {
      method: "POST",
      body: JSON.stringify({ userUuid })
    }
  );
  return { total: data.total };
}
```

- [ ] **Step 4: Add `revokeRemnawaveSubscription` function**

```typescript
export async function revokeRemnawaveSubscription(uuid: string): Promise<RemnawaveUserSnapshot> {
  const data = await remnawaveRequest<Record<string, unknown>>(
    `/api/users/${uuid}/actions/revoke`,
    {
      method: "POST",
      body: JSON.stringify({})
    }
  );
  return normalizeUser(data);
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in `remnawave.ts`

- [ ] **Step 6: Commit**

```bash
git add lib/services/remnawave.ts
git commit -m "feat: add device and revoke functions to remnawave client"
```

---

## Task 2: Zod Schema for Device Delete

**Files:**
- Create: `lib/schemas/devices.ts`

- [ ] **Step 1: Create schema file**

```typescript
import { z } from "zod";

export const deviceDeleteSchema = z.object({
  hwid: z.string().min(1).max(512)
});
```

- [ ] **Step 2: Commit**

```bash
git add lib/schemas/devices.ts
git commit -m "feat: add device delete Zod schema"
```

---

## Task 3: Subscription Reissue API Route

**Files:**
- Create: `app/api/subscription/reissue/route.ts`
- Create: `__tests__/app/api/subscription/reissue.route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiSession, mockGetUserById, mockRevokeRemnawaveSubscription, mockPrisma } = vi.hoisted(() => ({
  mockRequireApiSession: vi.fn(),
  mockGetUserById: vi.fn(),
  mockRevokeRemnawaveSubscription: vi.fn(),
  mockPrisma: {
    user: { update: vi.fn() }
  }
}));

vi.mock("@/lib/api-session", () => ({
  requireApiSession: mockRequireApiSession
}));

vi.mock("@/lib/services/auth", () => ({
  getUserById: mockGetUserById
}));

vi.mock("@/lib/services/remnawave", () => ({
  revokeRemnawaveSubscription: mockRevokeRemnawaveSubscription
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import { POST } from "@/app/api/subscription/reissue/route";

describe("POST /api/subscription/reissue", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireApiSession.mockRejectedValue(
      Object.assign(new Error("Требуется авторизация"), { status: 401 })
    );

    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("returns 400 when user has no remnawaveUuid", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: null });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it("revokes subscription and updates shortUuid on success", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-uuid-1" });
    mockRevokeRemnawaveSubscription.mockResolvedValue({
      uuid: "rw-uuid-1",
      shortUuid: "new-short",
      username: "user1",
      subscriptionUrl: "https://panel.example.com/api/sub/new-short"
    });
    mockPrisma.user.update.mockResolvedValue({});

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.subscriptionUrl).toContain("new-short");
    expect(mockRevokeRemnawaveSubscription).toHaveBeenCalledWith("rw-uuid-1");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { remnawaveShortUuid: "new-short" }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/app/api/subscription/reissue.route.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement the route**

```typescript
import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getUserById } from "@/lib/services/auth";
import { revokeRemnawaveSubscription } from "@/lib/services/remnawave";

export async function POST() {
  try {
    const session = await requireApiSession();
    const user = await getUserById(session.userId);

    if (!user?.remnawaveUuid) {
      return apiError("Подписка не привязана к панели", 400);
    }

    const snapshot = await revokeRemnawaveSubscription(user.remnawaveUuid);

    if (snapshot.shortUuid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { remnawaveShortUuid: snapshot.shortUuid }
      });
    }

    return apiOk({
      subscriptionUrl: snapshot.subscriptionUrl
    });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return apiError(error instanceof Error ? error.message : "Не удалось перевыпустить подписку", status);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/app/api/subscription/reissue.route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/subscription/reissue/route.ts __tests__/app/api/subscription/reissue.route.test.ts
git commit -m "feat: add subscription reissue API route with tests"
```

---

## Task 4: Device Delete API Route

**Files:**
- Create: `app/api/devices/delete/route.ts`
- Create: `__tests__/app/api/devices/delete.route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiSession, mockGetUserById, mockDeleteUserDevice } = vi.hoisted(() => ({
  mockRequireApiSession: vi.fn(),
  mockGetUserById: vi.fn(),
  mockDeleteUserDevice: vi.fn()
}));

vi.mock("@/lib/api-session", () => ({
  requireApiSession: mockRequireApiSession
}));

vi.mock("@/lib/services/auth", () => ({
  getUserById: mockGetUserById
}));

vi.mock("@/lib/services/remnawave", () => ({
  deleteUserDevice: mockDeleteUserDevice
}));

import { POST } from "@/app/api/devices/delete/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/devices/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/devices/delete", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireApiSession.mockRejectedValue(
      Object.assign(new Error("Требуется авторизация"), { status: 401 })
    );

    const response = await POST(makeRequest({ hwid: "abc" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 when hwid is missing", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-1" });

    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 when hwid exceeds max length", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-1" });

    const response = await POST(makeRequest({ hwid: "x".repeat(513) }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when user has no remnawaveUuid", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: null });

    const response = await POST(makeRequest({ hwid: "abc" }));
    expect(response.status).toBe(400);
  });

  it("deletes device and returns total on success", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-1" });
    mockDeleteUserDevice.mockResolvedValue({ devices: [], total: 0 });

    const response = await POST(makeRequest({ hwid: "device-hwid-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.total).toBe(0);
    expect(mockDeleteUserDevice).toHaveBeenCalledWith("rw-1", "device-hwid-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/app/api/devices/delete.route.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the route**

```typescript
import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { deviceDeleteSchema } from "@/lib/schemas/devices";
import { getUserById } from "@/lib/services/auth";
import { deleteUserDevice } from "@/lib/services/remnawave";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const { hwid } = await parseRequestBody(request, deviceDeleteSchema);
    const user = await getUserById(session.userId);

    if (!user?.remnawaveUuid) {
      return apiError("Подписка не привязана к панели", 400);
    }

    const result = await deleteUserDevice(user.remnawaveUuid, hwid);
    return apiOk({ total: result.total });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return apiError(error instanceof Error ? error.message : "Не удалось удалить устройство", status);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/app/api/devices/delete.route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/devices/delete/route.ts __tests__/app/api/devices/delete.route.test.ts
git commit -m "feat: add device delete API route with tests"
```

---

## Task 5: Device Delete-All API Route

**Files:**
- Create: `app/api/devices/delete-all/route.ts`
- Create: `__tests__/app/api/devices/delete-all.route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiSession, mockGetUserById, mockDeleteAllUserDevices } = vi.hoisted(() => ({
  mockRequireApiSession: vi.fn(),
  mockGetUserById: vi.fn(),
  mockDeleteAllUserDevices: vi.fn()
}));

vi.mock("@/lib/api-session", () => ({
  requireApiSession: mockRequireApiSession
}));

vi.mock("@/lib/services/auth", () => ({
  getUserById: mockGetUserById
}));

vi.mock("@/lib/services/remnawave", () => ({
  deleteAllUserDevices: mockDeleteAllUserDevices
}));

import { POST } from "@/app/api/devices/delete-all/route";

describe("POST /api/devices/delete-all", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireApiSession.mockRejectedValue(
      Object.assign(new Error("Требуется авторизация"), { status: 401 })
    );

    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("returns 400 when user has no remnawaveUuid", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: null });

    const response = await POST();
    expect(response.status).toBe(400);
  });

  it("deletes all devices on success", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-1" });
    mockDeleteAllUserDevices.mockResolvedValue({ total: 0 });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.total).toBe(0);
    expect(mockDeleteAllUserDevices).toHaveBeenCalledWith("rw-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/app/api/devices/delete-all.route.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the route**

```typescript
import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk } from "@/lib/http";
import { getUserById } from "@/lib/services/auth";
import { deleteAllUserDevices } from "@/lib/services/remnawave";

export async function POST() {
  try {
    const session = await requireApiSession();
    const user = await getUserById(session.userId);

    if (!user?.remnawaveUuid) {
      return apiError("Подписка не привязана к панели", 400);
    }

    const result = await deleteAllUserDevices(user.remnawaveUuid);
    return apiOk({ total: result.total });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return apiError(error instanceof Error ? error.message : "Не удалось удалить устройства", status);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/app/api/devices/delete-all.route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/devices/delete-all/route.ts __tests__/app/api/devices/delete-all.route.test.ts
git commit -m "feat: add device delete-all API route with tests"
```

---

## Task 6: Navigation — Add Устройства Tab

**Files:**
- Modify: `lib/ui/app-shell-nav.ts`
- Modify: `__tests__/lib/ui/app-shell-nav.test.ts`

- [ ] **Step 1: Update the existing nav test to expect new layout (TDD — test first)**

In `__tests__/lib/ui/app-shell-nav.test.ts`, update the first test to expect the new primary nav:

Replace:
```typescript
  it("keeps dashboard primary nav limited to four mobile destinations", () => {
    expect(getPrimaryNavItems("dashboard").map((item) => item.href)).toEqual([
      "/dashboard",
      "/dashboard/buy",
      "/dashboard/history",
      "#more"
    ]);
    expect(getPrimaryNavItems("dashboard").map((item) => item.label)).toEqual([
      "Обзор",
      "Купить",
      "История",
      "Ещё"
    ]);
  });
```

With:
```typescript
  it("keeps dashboard primary nav limited to four mobile destinations", () => {
    expect(getPrimaryNavItems("dashboard").map((item) => item.href)).toEqual([
      "/dashboard",
      "/dashboard/buy",
      "/dashboard/devices",
      "#more"
    ]);
    expect(getPrimaryNavItems("dashboard").map((item) => item.label)).toEqual([
      "Обзор",
      "Купить",
      "Устройства",
      "Ещё"
    ]);
  });
```

Update the secondary nav test to also verify История moved there:

Replace:
```typescript
  it("moves referrals into dashboard secondary nav", () => {
    expect(getSecondaryNavItems("dashboard").map((item) => item.href)).toContain("/dashboard/referrals");
    expect(getSecondaryNavItems("dashboard").map((item) => item.href)).not.toContain("/admin");
  });
```

With:
```typescript
  it("moves referrals and history into dashboard secondary nav", () => {
    const hrefs = getSecondaryNavItems("dashboard").map((item) => item.href);
    expect(hrefs).toContain("/dashboard/referrals");
    expect(hrefs).toContain("/dashboard/history");
    expect(hrefs).not.toContain("/admin");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/ui/app-shell-nav.test.ts`
Expected: FAIL (still has old nav values)

- [ ] **Step 3: Update dashboardPrimaryNavItems**

Replace the existing `dashboardPrimaryNavItems` array in `lib/ui/app-shell-nav.ts`:

```typescript
const dashboardPrimaryNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Обзор", slot: "primary" },
  { href: "/dashboard/buy", label: "Купить", slot: "primary" },
  { href: "/dashboard/devices", label: "Устройства", slot: "primary" },
  { href: "#more", label: "Ещё", slot: "primary" }
];
```

- [ ] **Step 4: Update dashboardSecondaryNavItems — add История**

Replace the existing `dashboardSecondaryNavItems` array:

```typescript
const dashboardSecondaryNavItems: AppNavItem[] = [
  { href: "/dashboard/history", label: "История", slot: "secondary" },
  { href: "/dashboard/referrals", label: "Рефералы", slot: "secondary" }
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/ui/app-shell-nav.test.ts`
Expected: PASS (all tests)

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add lib/ui/app-shell-nav.ts __tests__/lib/ui/app-shell-nav.test.ts
git commit -m "feat: add devices tab, move history to secondary nav"
```

---

## Tasks 7–9: UI Components (No Unit Tests)

Tasks 7, 8, and 9 create client/server components. These are tested via the API route tests (Tasks 3–5) for backend logic and manual verification for UI behavior. The codebase has no existing component-level tests — all existing tests target API routes and service functions.

---

## Task 7: Reissue Subscription Button Component

**Files:**
- Create: `components/blocks/dashboard/reissue-subscription-button.tsx`
- Modify: `components/blocks/dashboard/dashboard-overview-blocks.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Create ReissueSubscriptionButton client component**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export function ReissueSubscriptionButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleReissue() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/subscription/reissue", { method: "POST" });
        const payload = (await response.json().catch(() => null)) as {
          ok: boolean;
          error?: string;
        } | null;

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? "Не удалось перевыпустить подписку");
          return;
        }

        setOpen(false);
        router.refresh();
      } catch {
        setError("Не удалось выполнить запрос. Попробуйте ещё раз.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full justify-between">
          Перевыпустить подписку
          <span className="text-sm">↻</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перевыпуск подписки</DialogTitle>
          <DialogDescription className="space-y-2 pt-2 text-sm leading-6">
            <span className="block">
              Будет сгенерирована <strong className="text-white">новая ссылка для подключения</strong>.
            </span>
            <span className="block">Текущая ссылка перестанет работать.</span>
            <span className="block">
              Все устройства нужно будет подключить заново по новой ссылке.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 pt-2">
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}
          <Button
            variant="destructive"
            disabled={pending}
            onClick={handleReissue}
          >
            {pending ? "Перевыпуск..." : "Подтвердить перевыпуск"}
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add `remnawaveUuid` prop to `DashboardOverviewBlocks` and compose button**

In `components/blocks/dashboard/dashboard-overview-blocks.tsx`:

1. Add `remnawaveUuid: string | null` to `DashboardOverviewBlocksProps`
2. Pass it through to `SubscriptionSnapshot`
3. Import and render `ReissueSubscriptionButton` when subscription is `ACTIVE` and `remnawaveUuid` is not null

Update the `DashboardOverviewBlocksProps` type:

```typescript
type DashboardOverviewBlocksProps = {
  subscription: {
    status: SubscriptionStatus;
    planName: string | null;
    expiresAt: Date | null;
    trafficLimitBytes: bigint | null;
    trafficUsedBytes: bigint | null;
  } | null;
  referralLink: string;
  externalSubscriptionUrl: string | null;
  remnawaveUuid: string | null;
};
```

Add import at the top:

```typescript
import { ReissueSubscriptionButton } from "@/components/blocks/dashboard/reissue-subscription-button";
```

In the `SubscriptionSnapshot` function, update the props destructuring to include `remnawaveUuid` and add the button after the existing buttons block (inside the `<div className="grid gap-3">` that contains the "Продлить" and "Sub URL" buttons):

```typescript
{subscription?.status === "ACTIVE" && remnawaveUuid ? (
  <ReissueSubscriptionButton />
) : null}
```

Update `SubscriptionSnapshot` function signature to accept `remnawaveUuid`:

```typescript
function SubscriptionSnapshot({ subscription, externalSubscriptionUrl, remnawaveUuid }: Pick<DashboardOverviewBlocksProps, "subscription" | "externalSubscriptionUrl" | "remnawaveUuid">) {
```

Update `DashboardOverviewBlocks` to pass `remnawaveUuid`:

```typescript
<SubscriptionSnapshot subscription={props.subscription} externalSubscriptionUrl={props.externalSubscriptionUrl} remnawaveUuid={props.remnawaveUuid} />
```

- [ ] **Step 3: Update `app/dashboard/page.tsx` to pass `remnawaveUuid`**

Add `remnawaveUuid={activeUser?.remnawaveUuid ?? null}` prop to the `DashboardOverviewBlocks` component:

```typescript
<DashboardOverviewBlocks
  subscription={
    subscription
      ? {
            status: subscription.status,
            planName: subscription.plan?.name ?? null,
            expiresAt: subscription.expiresAt,
            trafficLimitBytes: subscription.trafficLimitBytes,
            trafficUsedBytes: subscription.trafficUsedBytes
          }
      : null
  }
  referralLink={referralLink}
  externalSubscriptionUrl={externalSubscriptionUrl}
  remnawaveUuid={activeUser?.remnawaveUuid ?? null}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/blocks/dashboard/reissue-subscription-button.tsx components/blocks/dashboard/dashboard-overview-blocks.tsx app/dashboard/page.tsx
git commit -m "feat: add subscription reissue button with confirmation dialog"
```

---

## Task 8: Device List Client Component

**Files:**
- Create: `components/blocks/dashboard/device-list.tsx`

- [ ] **Step 1: Create DeviceList client component**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

type Device = {
  hwid: string;
  platform: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  createdAt: string;
};

type DeviceListProps = {
  devices: Device[];
  total: number;
  deviceLimit: number | null;
};

function getPlatformIcon(platform: string | null) {
  if (!platform) return "📟";
  const p = platform.toLowerCase();
  if (p.includes("ios") || p.includes("android")) return "📱";
  if (p.includes("mac")) return "🖥";
  if (p.includes("linux")) return "🐧";
  if (p.includes("windows")) return "💻";
  return "📟";
}

function formatDeviceDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return "";
  }
}

function DeviceCard({ device, onDelete, deleting }: { device: Device; onDelete: (hwid: string) => void; deleting: boolean }) {
  const model = device.deviceModel ?? device.platform ?? "Неизвестное устройство";
  const details = [device.platform, device.osVersion, device.createdAt ? `Добавлено ${formatDeviceDate(device.createdAt)}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">
            {getPlatformIcon(device.platform)} {model}
          </p>
          {details ? (
            <p className="mt-1 truncate text-xs text-zinc-400">{details}</p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={deleting}
          className="shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={() => onDelete(device.hwid)}
        >
          {deleting ? "..." : "Удалить"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function DeviceList({ devices, total, deviceLimit }: DeviceListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingHwid, setDeletingHwid] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete(hwid: string) {
    if (!window.confirm("Удалить это устройство?")) return;

    setError(null);
    setDeletingHwid(hwid);
    startTransition(async () => {
      try {
        const response = await fetch("/api/devices/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hwid })
        });
        const payload = (await response.json().catch(() => null)) as { ok: boolean; error?: string } | null;

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? "Не удалось удалить устройство");
          return;
        }

        router.refresh();
      } catch {
        setError("Не удалось выполнить запрос");
      } finally {
        setDeletingHwid(null);
      }
    });
  }

  function handleDeleteAll() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/devices/delete-all", { method: "POST" });
        const payload = (await response.json().catch(() => null)) as { ok: boolean; error?: string } | null;

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? "Не удалось удалить устройства");
          return;
        }

        setDeleteAllOpen(false);
        router.refresh();
      } catch {
        setError("Не удалось выполнить запрос");
      }
    });
  }

  if (devices.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-zinc-400">
          Нет подключённых устройств. Устройства появятся автоматически при подключении.
        </CardContent>
      </Card>
    );
  }

  const counter = deviceLimit
    ? `${total} из ${deviceLimit} устройств`
    : `${total} устройств`;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">{counter}</p>
        <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              Удалить все
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Удалить все устройства</DialogTitle>
              <DialogDescription>
                Все привязанные устройства будут удалены. Это действие нельзя отменить.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 pt-2">
              <Button variant="destructive" disabled={pending} onClick={handleDeleteAll}>
                {pending ? "Удаление..." : "Подтвердить удаление"}
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => setDeleteAllOpen(false)}>
                Отмена
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid gap-2">
        {devices.map((device) => (
          <DeviceCard
            key={device.hwid}
            device={device}
            onDelete={handleDelete}
            deleting={deletingHwid === device.hwid}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/blocks/dashboard/device-list.tsx
git commit -m "feat: add device list client component with delete actions"
```

---

## Task 9: Devices Page

**Files:**
- Create: `app/dashboard/devices/page.tsx`

- [ ] **Step 1: Create the server component page**

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";

import { DeviceList } from "@/components/blocks/dashboard/device-list";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getUserDevices } from "@/lib/services/remnawave";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      remnawaveUuid: true,
      subscription: {
        select: {
          plan: {
            select: { remnawaveHwidDeviceLimit: true }
          }
        }
      }
    }
  });

  if (!user?.remnawaveUuid) {
    return (
      <div className="grid gap-4 sm:gap-6">
        <ScreenHeader
          eyebrow="Устройства"
          title="Подключённые устройства"
          description="Оформите подписку, чтобы увидеть подключённые устройства."
        />
        <Button asChild className="w-fit">
          <Link href="/dashboard/buy">Купить подписку</Link>
        </Button>
      </div>
    );
  }

  const { devices, total } = await getUserDevices(user.remnawaveUuid);
  const deviceLimit = user.subscription?.plan?.remnawaveHwidDeviceLimit ?? null;

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Устройства"
        title="Подключённые устройства"
        description="Список устройств, привязанных к вашей подписке. Вы можете удалить ненужные."
      />
      <DeviceList devices={devices} total={total} deviceLimit={deviceLimit} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/devices/page.tsx
git commit -m "feat: add devices page with server-side data fetching"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npx eslint app/dashboard/devices/ app/api/devices/ app/api/subscription/ components/blocks/dashboard/device-list.tsx components/blocks/dashboard/reissue-subscription-button.tsx lib/schemas/devices.ts lib/services/remnawave.ts lib/ui/app-shell-nav.ts`
Expected: No errors (or fix any issues)

- [ ] **Step 4: Commit any fixes if needed**
