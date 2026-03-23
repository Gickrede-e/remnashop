# Device Management & Subscription Reissue

## Summary

Add device management and subscription reissue capabilities to the user dashboard. Users can view connected devices, delete them, and reissue their subscription (generating a new connection URL).

## Navigation Changes

**Primary tabs** (top bar / bottom nav):
- Обзор (`/dashboard`)
- Купить (`/dashboard/buy`)
- Устройства (`/dashboard/devices`) — **new**, replaces История
- Ещё (`#more`)

**Secondary items** (inside "Ещё" dropdown):
- История (`/dashboard/history`) — **moved from primary**
- Рефералы (`/dashboard/referrals`)
- Админка (`/admin`) — if admin

**File to change:** `lib/ui/app-shell-nav.ts`

## Feature 1: Subscription Reissue

### Location

A new `ReissueSubscriptionButton` **client component** composed inside the existing server-rendered `SubscriptionSnapshot` card in `components/blocks/dashboard/dashboard-overview-blocks.tsx`. Visible only when subscription status is `ACTIVE` and `remnawaveUuid` exists.

### UI Flow

1. User clicks "Перевыпустить подписку" button (destructive style) in the subscription card on `/dashboard`
2. Confirmation dialog opens explaining consequences:
   - A new connection URL will be generated
   - The current URL will stop working
   - All devices need to be reconnected with the new URL
3. User confirms → API call → success toast with new URL info → `router.refresh()`
4. User cancels → dialog closes, no action

### API

**New route handler file:** `app/api/subscription/reissue/route.ts`
**HTTP endpoint:** `POST /api/subscription/reissue`

- Authenticates via session
- Loads user from DB, checks `remnawaveUuid` exists
- Calls Remnawave `POST /api/users/{uuid}/actions/revoke` with body `{}` (default: full revoke — new shortUuid + new passwords)
- Updates local `User.remnawaveShortUuid` with new `shortUuid` from response
- Returns `{ ok: true, subscriptionUrl: "..." }`

**New remnawave.ts function:**
```typescript
export async function revokeRemnawaveSubscription(uuid: string): Promise<RemnawaveUserSnapshot>
```
Calls `POST /api/users/${uuid}/actions/revoke` with body `{}`. The Remnawave API defaults `revokeOnlyPasswords` to `false`, so an empty body triggers a full revoke (new shortUuid + new passwords). The response is unwrapped by the existing `unwrap()` helper and normalized via `normalizeUser()`.

### Error States

- No active subscription → button not rendered
- No `remnawaveUuid` → button not rendered
- API error → toast with error message, dialog stays open
- Network error → toast with retry suggestion

### Follow-up: Rate Limiting

Reissue generates a new shortUuid on every call. A cooldown (e.g., once per hour) should be added as a follow-up to prevent abuse. Initial implementation does not include this.

## Feature 2: Device Management

### Location

New page at `/dashboard/devices` accessible via the "Устройства" primary tab.

### Page Structure

**Header:**
- Eyebrow: "Устройства"
- Title: "Подключённые устройства"
- Description: "Список устройств, привязанных к вашей подписке. Вы можете удалить ненужные."

**No-subscription guard:** If user has no `remnawaveUuid`, show empty state: "Оформите подписку, чтобы увидеть подключённые устройства." with a link to `/dashboard/buy`. Do not attempt to fetch devices.

**Device counter:** "N из M устройств" (N = current count, M = plan's `remnawaveHwidDeviceLimit`). If plan has no device limit, show just "N устройств".

**"Удалить все" button:** Destructive outline style, top-right. Visible only when devices > 0. Confirmation dialog before action.

**Device list:** Vertical stack of device cards, each containing:
- Platform icon (emoji based on platform: 📱 iOS/Android, 💻 Windows, 🖥 macOS, 🐧 Linux, 📟 unknown/null fallback)
- Device model (from `deviceModel` field, fallback to platform name, fallback to "Неизвестное устройство")
- Platform + OS version + date added (secondary text line)
- "Удалить" button per device (destructive outline, with confirmation)

**Empty state:** When no devices — message "Нет подключённых устройств. Устройства появятся автоматически при подключении."

### Data Flow

Page is a **server component** that:
1. Gets session, redirects to `/login` if none
2. Loads user from DB to get `remnawaveUuid`
3. If no `remnawaveUuid` → render no-subscription guard, stop
4. Calls Remnawave `GET /api/hwid/devices/{userUuid}` to fetch devices
5. Loads user's plan to get `remnawaveHwidDeviceLimit`
6. Passes data to **client component** `DeviceList` for interactive delete actions

### API Routes

**Fetch devices (server-side only):** Direct call from page server component via `remnawave.ts` — no API route needed.

**Delete single device:**
- File: `app/api/devices/delete/route.ts`
- HTTP endpoint: `POST /api/devices/delete`
- Authenticates via session
- Validates request body with Zod: `z.object({ hwid: z.string().min(1).max(512) })`
- Loads `remnawaveUuid` from DB (not from client)
- Calls Remnawave `POST /api/hwid/devices/delete` with `{ userUuid, hwid }`
- Returns `{ ok: true, total: number }`

**Delete all devices:**
- File: `app/api/devices/delete-all/route.ts`
- HTTP endpoint: `POST /api/devices/delete-all`
- Authenticates via session
- Loads `remnawaveUuid` from DB
- Calls Remnawave `POST /api/hwid/devices/delete-all` with `{ userUuid }`
- Returns `{ ok: true, total: number }`

### New remnawave.ts Functions

Note: All new functions use the existing `remnawaveRequest` helper which handles Bearer token auth, `cache: "no-store"`, and envelope unwrapping via `unwrap()`.

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

export async function getUserDevices(userUuid: string): Promise<{ devices: RemnawaveDevice[]; total: number }>

export async function deleteUserDevice(userUuid: string, hwid: string): Promise<{ devices: RemnawaveDevice[]; total: number }>

export async function deleteAllUserDevices(userUuid: string): Promise<{ total: number }>
```

### Client Interaction

Device deletion uses `useRouter().refresh()` after successful API call to re-fetch server data. Toast notifications for success/error states.

## Components

### New Files

| File | Type | Purpose |
|------|------|---------|
| `app/dashboard/devices/page.tsx` | Server component | Fetches devices, renders page |
| `components/blocks/dashboard/device-list.tsx` | Client component (`"use client"`) | Device cards with delete actions |
| `components/blocks/dashboard/reissue-subscription-button.tsx` | Client component (`"use client"`) | Reissue button + confirmation dialog |
| `app/api/devices/delete/route.ts` | API route | Delete single device |
| `app/api/devices/delete-all/route.ts` | API route | Delete all devices |
| `app/api/subscription/reissue/route.ts` | API route | Reissue subscription |

### Modified Files

| File | Change |
|------|--------|
| `lib/ui/app-shell-nav.ts` | Move История to secondary, add Устройства to primary |
| `lib/services/remnawave.ts` | Add `RemnawaveDevice` type, `revokeRemnawaveSubscription`, `getUserDevices`, `deleteUserDevice`, `deleteAllUserDevices` |
| `components/blocks/dashboard/dashboard-overview-blocks.tsx` | Compose `ReissueSubscriptionButton` into `SubscriptionSnapshot` |
| `app/dashboard/page.tsx` | Pass `remnawaveUuid` to subscription card for reissue button visibility |

## Security

- All API routes validate session authentication
- Device delete routes resolve `remnawaveUuid` from DB using session userId — never from client input
- Reissue route loads `remnawaveUuid` from DB, never from client input
- HWID input validated with Zod schema (`z.string().min(1).max(512)`)
- No user-supplied UUIDs passed to Remnawave — only server-resolved values
