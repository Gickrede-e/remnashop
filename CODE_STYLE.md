# Code style

Conventions extracted from `app/`, `components/` and `lib/`. Match them in new and edited code. Tool settings live in `tsconfig.json` (`strict`, the `@/*` alias for the repo root) and `eslint.config.mjs` (Next.js core-web-vitals and TypeScript rules plus `no-console`); CI runs `npm run lint`, `npm run test` and `npm run test:integration`. There is no formatter, so format like the surrounding code: double quotes (single only to avoid escaping), semicolons, 2-space indent, no trailing commas, lines mostly under 100 characters (nothing enforces a limit), one argument or property per line once a call or literal wraps.

## Types and values

- Let TypeScript infer return types. Annotate one when inference would give `any` (`toJsonValue(): Prisma.InputJsonValue` around `JSON.parse`) or when an exported type is the contract (`calculateDurationPricing(): DurationPricing`).
- Object shapes, props and service inputs are `type`. Use `interface` only to extend or augment a library type (`ButtonProps extends React.ButtonHTMLAttributes`, the global `Window`) or for a contract of methods (`Logger`). Derive types instead of restating them: `Awaited<ReturnType<typeof validatePromoCode>>`, `z.infer<typeof loginSchema>`, `keyof typeof BUTTON_SIZES`, model types from `@prisma/client`.
- No `any`, `@ts-ignore`, `@ts-expect-error` or `eslint-disable`; the app has none. Narrow `unknown` with `instanceof`, `typeof` and `in`, cast once where data enters (`as ApiEnvelope<T> | null`), and check a literal against its type with `satisfies`.
- Constants that are fixed values or lookup tables are `UPPER_SNAKE`, object maps `as const` (`GC_INTERVAL_MS`, `BUTTON_VARIANTS`, `PAYMENT_STATUS_LABELS`). Shared ones live in `lib/constants.ts`; module-private ones stay unexported in their file. Zod schemas and mutable module state are camelCase (`planSchema`, `rateLimitStore`).
- The unit is in the name. Durations are milliseconds (`windowMs: 60_000`, `TOKEN_TTL_MS = 15 * 60 * 1000`); traffic is `trafficGB` as a `number` or `*Bytes` as a `bigint` (`gbToBytes`). Group long literals with `_`.
- Money is integer kopecks in a `number` (`Plan.price` and `Payment.amount` are `Int`). Rubles appear only at the edges: the admin form's `priceRubles` (stored as `Math.round(rubles * 100)`), YooKassa's string amounts (`parseYooKassaAmountToMinorUnits`), exports. Round discounts down with `Math.floor`; display with `formatPrice` from `lib/utils.ts`.
- `BigInt` columns can't pass through `JSON.stringify`: convert them with `toNumber` or `serializeBigInts` (`lib/server/bigint.ts`) before `apiOk`. Prisma JSON values go through `toJsonValue` (`lib/prisma.ts`).
- The current time is `new Date()` or `Date.now()`; `date-fns` is for calendar math (`startOfMonth`, `subDays`).
- Enums are the Prisma enums, imported as values from `@prisma/client` (`PaymentStatus.SUCCEEDED`, `z.enum(PaymentProvider)`). A closed set of local values is a string-literal union (`"create" | "edit"`). No TypeScript `enum`.

## Naming

- Files and folders are kebab-case (`payment-activation.ts`, `async-action-button.tsx`); Next.js files keep their framework names (`page.tsx`, `route.ts`, `[id]`).
- Components are PascalCase named function exports, with props typed inline or as `<Component>Props`. A page is `export default function <Name>Page()`, `async` when it loads data (`AdminPlansPage`, `FaqPage`); default exports exist only where Next.js requires them.
- Functions are camelCase and start with a verb. Service reads start with `get*` or `list*`; writes name the change (`createPlan`, `deactivatePlan`, `registerPromoUsage`); there is no `find*`. A guard that throws or redirects when its precondition fails is `require*` or `enforce*` (`requireApiSession`, `enforceRateLimit`).
- Booleans start with `is`, `has` or `can` (`isActive`, `canAccessAdmin`); a prop that mirrors a DOM or Radix prop keeps that name (`disabled`, `asChild`).
- Suffixes: `*Error` for error classes, `*Schema` for zod schemas (`paymentCreateSchema`), `*Props` for props types. Test doubles start with `mock` (`mockRequireApiSession`).
- Strings that machines read: log events are `domain.snake_event` (`payment.promo_rollback_failed`), rate-limit keys `<action>:<id>` (`payment-create:${userId}`), admin-log actions and targets `UPPER_SNAKE` (`UPDATE_PLAN`, `PLAN`), CSS classes semantic camelCase (`dashCardHead`).
- Domain words follow the glossary in `CONTEXT.md`.

## Imports

- `@/` absolute imports everywhere; relative only for a sibling CSS module (`./landing.module.css`) and inside `scripts/`, which has no alias. There are no barrel `index.ts` files: import from the module that defines the name.
- A file starts with `"use client"` or `import "server-only"` when it has one, then `node:` builtins (always with the prefix), packages, `@/` modules and CSS last, with a blank line between groups.
- Mark type-only names: `import type { ApiEnvelope }` or `import { type NextRequest, NextResponse }`.

## Layers

- `app/` holds the entry points: pages, layouts and `app/api/**/route.ts`. They call `lib/services`; a single one-off Prisma query may sit in the route or page itself (`app/dashboard/history/page.tsx`), anything reused or multi-step goes in a service.
- `lib/services/<domain>.ts` holds the business logic and the external clients (`remnawave.ts`, `yookassa.ts`, `turnstile.ts`, `notifications.ts`). Services take plain values, return Prisma rows or plain objects, throw on failure and know nothing about `Request` or `NextResponse`.
- `lib/server/` is request infrastructure (logger, metrics, rate limit, request utils), `lib/auth/` sessions and roles, `lib/schemas/` the zod request schemas (client forms import them too), `lib/payments/` pure pricing and provider config, `lib/utils.ts` formatters.
- Read configuration from `env` (`lib/env.ts`, validated at import) or `publicEnv` (`lib/public-env.ts`) rather than `process.env`, which only `lib/prisma.ts`, `lib/server/logger.ts` and `lib/constants.ts` read directly. A new variable goes into the zod schema in `lib/env.ts` and into `.env.example`.
- Client components never import `lib/services`, `lib/prisma` or `lib/env` (type-only imports are fine); they call `/api/*` with `fetch`. There are no server actions. A module that must never reach the client starts with `import "server-only"` (`lib/env.ts`, `lib/auth/roles.ts`).
- `components/ui/` holds the Radix-based primitives, `components/blocks/<area>/` the sections pages are built from, `components/shell/` navigation and layout, `components/<area>/` interactive client components (forms, action buttons).
- `scripts/*.mjs` is the background worker: plain Node ESM that calls the app's API (`APP_INTERNAL_URL`, `CRON_SECRET`) and logs through `scripts/worker-logger.mjs`.

## Patterns

Model new code on the nearest existing file.

**API route** (`app/api/<area>/<action>/route.ts`, model: `app/api/payments/create/route.ts`)
- One exported `async function` per HTTP method taking `request: Request`; `NextRequest` only when a helper needs it (`getClientIp`, `assertCronSecret`). Dynamic segments arrive as `{ params }: { params: Promise<{ id: string }> }` and are awaited. Every `GET` route exports `const dynamic = "force-dynamic"`.
- Inside one `try`: `requireApiSession()` or `requireApiAdminSession()` (`proxy.ts` doesn't cover `/api`); `enforceRateLimit({ key, max, windowMs })` on user-triggered writes, with its own `catch` that turns `RateLimitExceededError` into a 429; `parseRequestBody(request, schema)`; the service call; `apiOk(data)`.
- Return `apiError(message, status)` for an expected failure. The outer `catch` is `return apiErrorFrom(error, "<fallback>")` (`lib/http.ts`): it keeps a thrown error's `status`, so a 401 or 403 from the session check reaches the client, turns a `ZodError` into one readable message, and answers anything else with 400.
- Record each admin write with `logAdminAction({ adminId, action, targetType, targetId, details })`, in the route or in the admin-only service it calls (model: `app/api/admin/plans/[id]/route.ts`).
- A webhook treats its body as a hint and re-fetches the payment from the provider; cron and metrics endpoints check `assertCronSecret`. Wrap a critical route in `withApiLogging` so its log lines carry a request id (model: `app/api/webhook/yookassa/route.ts`).

**Service** (`lib/services/<domain>.ts`, model: `lib/services/plans.ts`; transactions: `lib/services/promos.ts`)
- Exported `async function`s. More than two inputs arrive as one object, typed inline or as `type <Name>Input`; private helpers are unexported functions in the same file.
- Writes that must land together run in `prisma.$transaction(async (tx) => ...)`, the interactive form only. A helper that may run inside a caller's transaction takes `db: DbClient = prisma` as its last parameter.
- Code that provisions a user in Remnawave first takes the per-user lock inside its transaction, `` await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'user_provision:' + userId}))` ``, so two activations for one user can't interleave (model: `lib/services/subscriptions.ts`; why: `docs/adr/0001-payment-activation-order.md`).
- Payment-provider calls stay outside transactions. When one fails after a local write, undo that write (mark the payment `FAILED`, release the promo reservation) and rethrow (model: `createPaymentForUser` in `lib/services/payments.ts`).

**Page** (`app/<area>/**/page.tsx`, model: `app/dashboard/history/page.tsx`)
- An async server component: it loads data from services (independent reads in one `Promise.all`) and passes it to blocks as props.
- `proxy.ts` guards `/admin` and `/dashboard`; a page that needs the user reads `getSession()` and calls `redirect("/login")` when there is none. Private sub-components go below the default export.

**Client component** (model: `components/admin/plan-form.tsx`)
- `"use client"` on the first line. State lives in `useState`; requests run in `startTransition` from `useTransition`, and its pending flag disables the button and swaps its label.
- A form that validates on the client uses `react-hook-form` with `zodResolver` over the same `lib/schemas` schema the route parses (model: `components/auth/login-form.tsx`); the admin forms keep plain `useState` values.
- Call the API with `fetch`, read the body with `readApiEnvelope(response)`, show `payload?.error` or a fallback message on failure, and `router.refresh()` or `router.push()` on success.

**UI and styling** (model: `components/ui/button.tsx`)
- Primitives wrap Radix in the shadcn shape: `React.forwardRef`, `displayName`, variants as `as const` maps of class names. Combine classes with `cn` from `lib/utils.ts`.
- Styles are plain CSS: semantic camelCase classes in `app/globals.css` and `app/styles/cabinet.css`, and a CSS module only for the landing page. There is no Tailwind, whatever the README says.

**Database** (`prisma/schema.prisma`)
- Models are singular PascalCase mapped to plural snake_case tables (`@@map("promo_codes")`). Fields are camelCase, ids `String @id @default(cuid())`, foreign keys `<model>Id`, timestamps `createdAt @default(now())` and `updatedAt @updatedAt`.
- Enums are PascalCase with `UPPER_SNAKE` values. Money columns are `Int` kopecks, byte counts `BigInt`.
- Change the schema with `npm run db:migrate`, which creates `prisma/migrations/<timestamp>_<snake_case>/`; never edit a migration that has shipped.

**Tests** (vitest; `__tests__/` mirrors the source tree)
- `__tests__/lib/services/promos.test.ts` tests `lib/services/promos.ts`. A route test is `__tests__/app/api/<path>.route.test.ts` with `describe("POST /api/<path>")`. `it` names are English sentences about behaviour (`"rejects ..."`, `"returns ..."`).
- Import `describe`, `it`, `expect` and `vi` from `vitest`. Declare doubles with `const { mockX } = vi.hoisted(() => ({ mockX: vi.fn() }))`, wire them with `vi.mock("@/lib/...", () => ({ ... }))`, then import the module under test. The config resets mocks between tests.
- Call a route handler directly with `new Request("http://localhost/api/...", { method, headers, body })` and assert `response.status` and the envelope. Render a component with `renderToStaticMarkup(React.createElement(Component, props))` and assert on the markup; test files are `.ts`, so there is no JSX.
- `__tests__/integration/` runs against the Postgres database in `TEST_DATABASE_URL` (`npm run test:integration`), with remote clients stubbed through `vi.mock(path, async (importOriginal) => ({ ...await importOriginal(), ... }))`. `e2e/` is Playwright.

## Logging

- `import { logger, serializeError } from "@/lib/server/logger"`. No `console`: ESLint's `no-console` exempts only `lib/env.ts`, `prisma/seed.mjs` and `scripts/worker-logger.mjs`.
- The message is an event name and the details go in a camelCase fields object, with errors through `serializeError`: `logger.error("payment.promo_rollback_failed", { paymentId, error: serializeError(error) })`.
- Inside `withApiLogging` every line gets `requestId`, `route` and `method` (plus `ip` for a `NextRequest`) without passing them. The logger redacts keys such as `password`, `token`, `secret`, `cookie` and `email`; still, never log credentials.
- Levels: `warn` for a rejected or suspicious request (`webhook.ip_forbidden`, `webhook.rate_limited`), `error` for a failure someone has to look at (`subscription.provision_failed`), `info` for a finished background step (`worker.sync_expired.done`), `debug` for tracing.

## Errors

- A service reports an expected failure with `throw new Error(message)`, worded in Russian for the user, because routes pass `error.message` to the client. Configuration and internal errors are English (`"DATABASE_URL is not configured"`).
- An error a caller must tell apart is a class ending in `Error`, declared next to the code that throws it, that sets `this.name` (`RateLimitExceededError` in `lib/server/rate-limit.ts`, `WebhookIntegrityError` in `lib/services/payments.ts`). If a route should answer it with a specific status, the class also carries `status` (`ApiSessionError`: 401 or 403).
- Catch the narrowest error and rethrow the rest (`if (error instanceof RateLimitExceededError) { ... } throw error;`). A bare `catch { return false; }` or `.catch(() => null)` is only for a best-effort step with an explicit fallback. A broad catch logs, then rethrows or returns a fallback; a wrapping error passes `{ cause: error }`.

## Comments

- English, though some older files still have Russian comments. A `//` comment says why the code is the way it is: a race, an ordering rule, a security reason (`lib/server/rate-limit.ts`, the promo rollback in `lib/services/payments.ts`). No JSDoc in new code; names and types carry the what. A module that needs context gets a short `//` header (`lib/api-envelope.ts`).
- Tags are `// TODO:` and `// NOTE:`.

## User-facing text

- The UI is Russian and has no i18n layer: copy is written inline in JSX, and enum labels live in the `*_LABELS` maps in `lib/constants.ts`.
- Format money, dates, traffic and day counts with the `ru-RU` helpers in `lib/utils.ts` (`formatPrice`, `formatDateTime`, `formatBytes`, `formatDayCount`).
- API error messages a person reads are Russian; responses that only machines read (webhooks, cron, metrics) are English.
