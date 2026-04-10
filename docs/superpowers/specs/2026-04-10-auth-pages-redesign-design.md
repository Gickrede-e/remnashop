# Auth Pages Redesign

## Summary

Redesign the `login` and `register` pages so they feel close to the user-provided standalone auth mockup, while using the restrained dark palette of `https://overrrides.com/terms`.

The result should no longer look like the current shared auth panel with tabs. Instead, both routes should become separate centered-card screens with simpler composition, stricter visual hierarchy, and direct text links between entry flows.

Business logic, routing behavior, and server-side auth contracts stay intact:

- login remains `email + password`
- register remains `email + password + optional referral code`
- existing redirects and request flows remain unchanged

## Goals

- Replace the current tabbed auth presentation with standalone `login` and `register` screens.
- Adapt the simple centered-card structure from the provided HTML/CSS sample to the existing Next.js auth flow.
- Re-theme the auth screens around the `overrrides.com/terms` palette direction:
  - near-black matte page background
  - light card surface
  - restrained grayscale support colors
  - selective accent usage without glow effects
- Remove Telegram login from the login page.
- Keep the UI compact, readable, and mobile-safe.

## Non-Goals

- Do not change auth APIs, schema validation, session behavior, or redirect logic.
- Do not introduce username-based authentication.
- Do not add a password recovery flow.
- Do not redesign dashboard, admin, or the shared non-auth shell as part of this work.
- Do not introduce neon glow, ambient acid lighting, or decorative effects that were not approved.

## Current Constraints

The current implementation uses:

- `app/login/page.tsx` and `app/register/page.tsx` as route entrypoints
- `components/auth/login-form.tsx` and `components/auth/register-form.tsx` for client-side form behavior
- `components/blocks/auth/auth-entry-panel.tsx` for the current shared tabbed auth container
- `app/globals.css` for auth scene styling

The redesign must preserve:

- `sanitizeNextPath()` behavior
- `getSession()` redirects for already authenticated users
- existing `POST /api/auth/login` and `POST /api/auth/register`
- `referralCode` handling on register

## Approved Visual Direction

### Composition

Both auth routes use the same family of layout:

- full-page standalone auth scene
- one centered card
- no sidebar
- no split hero/auth layout
- no top navigation tabs

The card should feel structurally close to the provided sample:

- vertically stacked title, fields, primary button, helper link row
- compact overall width
- generous rounding
- clear form rhythm

### Palette

The visual system should reference `https://overrrides.com/terms`, but in a restrained way.

Approved direction:

- page background uses almost-black matte tones such as `#090909` / `#030303`
- card uses a light surface for strong contrast and clean form readability
- secondary text and borders use quiet grays close to `#CFCFCF`
- accent color may draw from the `overrrides` yellow family, but only for focused CTA and state emphasis
- no colored page glow
- no neon aura
- no purple gradient button from the original user CSS sample

### Interaction Style

- Inputs should be rounded and calm rather than system-console harsh.
- The primary CTA should feel bold and obvious, but not glossy.
- Links should be text-first and understated.
- Error states should remain visible and clear without turning into loud alert banners.

## Route Design

### Login Page

The login route becomes a dedicated centered-card page.

Content order:

1. short brand line using the site name
2. title
3. short explanatory sentence
4. `Email` field
5. `Пароль` field
6. primary submit button
7. secondary helper row: `Нет аккаунта? Зарегистрироваться`

Rules:

- no tabs
- no Telegram block
- no fake `Забыли пароль?` link
- no extra marketing copy below the form

### Register Page

The register route mirrors the login page and uses the same composition.

Content order:

1. short brand line using the site name
2. title
3. short explanatory sentence
4. `Email` field
5. `Пароль` field
6. `Реферальный код` field
7. primary submit button
8. secondary helper row: `Уже есть аккаунт? Войти`

Rules:

- `Реферальный код` remains optional
- if a referral code is present in the URL, it remains prefilled
- the register card may be slightly taller than the login card, but it should stay in the same visual family

## Component Architecture

### Page Routes

`app/login/page.tsx` and `app/register/page.tsx` should stop relying on the current tabbed auth panel structure.

Instead, each route should render a simpler standalone auth page wrapper around its respective form.

### Forms

`components/auth/login-form.tsx` and `components/auth/register-form.tsx` keep their behavioral responsibilities:

- form state
- validation
- pending state
- fetch submission
- redirect after success
- error display

But their markup should be adjusted to fit the new card structure:

- remove Telegram section from `LoginForm`
- replace current hint blocks with direct auth-navigation links
- keep errors close to the action area
- keep labels and accessibility semantics intact

### Legacy Shared Auth Panel

`components/blocks/auth/auth-entry-panel.tsx` is no longer needed for `login` and `register`.

Implementation rule:

- stop using it from both auth routes
- run a usage check after the route migration
- remove the component only if it has no remaining consumers

The redesign should not force continued use of the tabbed abstraction just to preserve old structure.

## Styling Strategy

Primary styling work should live in `app/globals.css`, but the auth section should be treated as a dedicated standalone surface rather than a patch on top of the old tabbed scene.

Expected styling changes:

- new or rewritten auth scene container styles
- centered card sizing rules
- rounded input treatment
- updated button treatment
- subdued helper-link styling
- simpler spacing system for auth fields and footer links
- mobile-specific width and spacing adjustments

Styling rules:

- keep the auth screen visually distinct from dashboard/admin shell surfaces
- avoid large decorative backgrounds
- avoid overusing accent color
- preserve readability at narrow widths

## Behavioral Requirements

- Authenticated users visiting `login` or `register` still redirect to `/dashboard` or `/admin` based on role.
- Login success still respects `nextPath`.
- Register success still respects `nextPath` fallback behavior already implemented in the route and form.
- Register continues to accept `ref` query data and carry it into the form.
- Pending button labels remain visible during submission.
- Validation errors and API errors remain visible in-card.

## Mobile and Responsive Rules

- The auth card remains a card on mobile; it should not flatten into an edge-to-edge desktop-in-mobile clone unless spacing requires it.
- Narrow screens should reduce padding before reducing readability.
- Inputs and the primary button must remain comfortably tappable.
- The register page must remain usable without the CTA or helper row falling below awkward fold thresholds on common mobile heights.

## Testing Strategy

Verify at least:

- `login` renders without Telegram UI
- `login` and `register` still submit through their existing API flows
- auth links point to the opposite route correctly
- existing query-derived state such as `next` and `ref` still behaves correctly
- already authenticated users still redirect correctly
- layout remains usable on mobile and desktop widths

Recommended verification commands after implementation:

- `npm run lint`
- targeted `vitest` coverage for auth-related components or route behavior if structure-sensitive tests exist

## Risks

### Visual Literalism

Risk: a too-literal port of the sample HTML may look acceptable on desktop but degrade on mobile.

Mitigation: preserve the sample’s simplicity, not its brittle fixed-dimension assumptions.

### Hidden Dependence on Current Auth Structure

Risk: some tests or shared auth styles may assume the current tabbed panel exists.

Mitigation: audit route usage and update any structure-sensitive tests alongside the redesign.

### Misleading Secondary Actions

Risk: auth pages imply unsupported flows such as password recovery.

Mitigation: only show links to implemented routes. The approved login helper row is registration only.

## Implementation Boundaries

This redesign is complete when:

- `login` and `register` render as separate standalone centered-card screens
- tabs are gone
- Telegram login is removed
- opposite-route helper links are present at the bottom of each form
- the palette and atmosphere align with the restrained dark `overrrides` reference
- auth behavior remains unchanged
