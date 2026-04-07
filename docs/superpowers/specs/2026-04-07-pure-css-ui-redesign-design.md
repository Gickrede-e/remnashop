# Pure CSS UI Redesign

## Summary

Replace the current Tailwind-driven visual layer with a custom design system built on plain CSS. The new interface should feel like a dark operational console rather than a generic SaaS dashboard or `shadcn` starter kit.

The redesign keeps the current routing, data flow, server logic, and Radix behavior where useful, but replaces the visual foundation, base UI primitives, shared shell, and all user-facing screens with a unified custom CSS layer.

## Goals

- Remove Tailwind CSS as the styling foundation for the application.
- Remove `shadcn`-style visual language from primitives and screen composition.
- Build a unique dark technical aesthetic with cold signal accents, dense panel rhythm, and stronger operator-console hierarchy.
- Rebuild the shared app shell so dashboard and admin feel like parts of one product system.
- Migrate all screens to the new visual layer without breaking routes, data, or form behavior.

## Non-Goals

- No business-logic rewrite.
- No route restructuring unless needed for layout integrity.
- No data model or API redesign as part of this work.
- No temporary hybrid long-term state where old Tailwind surfaces remain inside migrated screens.

## Visual Direction

### Core Mood

The product moves toward a dark, technical control-surface aesthetic:

- Deep graphite and blue-black backgrounds.
- Cyan, steel, and amber signal accents instead of purple Tailwind gradients.
- Strong contrast between command actions, telemetry panels, and passive surfaces.
- Dense layout rhythm with purposeful spacing instead of soft generic card stacks.
- Typography that reads as operational and deliberate rather than “template dashboard”.

### UX Principles

- Primary actions should feel like commands, not generic CTA buttons.
- Inputs should feel like controlled system fields, with explicit focus and status states.
- Overview pages should privilege telemetry, status, and next actions above decorative content.
- Admin surfaces should feel more supervisory and data-dense than end-user dashboard surfaces.
- Auth should feel like entry into a managed system, not a standard login card.

## CSS System Architecture

### Foundation Layer

Introduce a plain CSS foundation in `app/globals.css` and adjacent CSS files with:

- Root design tokens for color, type, spacing, radii, shadows, outlines, motion, and layout widths.
- Explicit semantic tokens for shell, panels, command surfaces, status tones, overlays, and form controls.
- Shared typography scale for headings, telemetry values, labels, helper text, and dense data rows.
- Global interaction states for hover, focus-visible, active, disabled, loading, and destructive actions.
- Shared animation rules for surface reveal, dialog transitions, nav emphasis, and loading placeholders.

This layer must not rely on:

- `@import "tailwindcss"`
- `@apply`
- Tailwind config tokens
- utility-class composition as the core styling mechanism

### Component Styling Strategy

Prefer a split between:

- global foundation CSS for tokens and cross-cutting rules
- component-level CSS modules for shell and larger composite blocks
- lightweight semantic class names in JSX instead of utility chains

This keeps JSX readable and prevents the redesign from collapsing into another utility-driven system.

## Primitive Layer

Rebuild the current base UI primitives to preserve usage compatibility where reasonable, but replace their styling model completely.

### Primitives in Scope

- `Button`
- `Input`
- `Textarea`
- `Card`
- `Badge`
- `Label`
- `Select`
- `Dialog`
- `Tabs`
- `Table`
- `Separator`
- `Skeleton`
- `Accordion`
- `Switch`
- `Tooltip`
- `DropdownMenu`

### Primitive Requirements

- Remove dependency on `class-variance-authority` for the new visual system.
- Remove dependency on `tailwind-merge` and avoid utility-driven variant composition.
- Keep ergonomic APIs where it reduces migration cost, but restyle via semantic classes and CSS modules.
- Retain Radix only as headless behavior where it provides real value, especially for `Dialog`, `Select`, `Tabs`, `Tooltip`, and `DropdownMenu`.
- Standardize state styling across primitives so buttons, inputs, tabs, and overlays feel like one system.

## Shell Redesign

### Shared Shell

Rebuild the shared shell around a cohesive operator-console layout:

- topbar with stronger system identity and better action zoning
- bottom navigation that feels intentional on mobile, not like a generic tab bar
- more-sheet/dialog surfaces that match the new shell language
- screen headers that align with telemetry-heavy layouts
- better distinction between main work area and side/support surfaces

### Shell Goals by Area

#### Dashboard

- Present user state as access/connection telemetry.
- Keep fast actions close to status blocks.
- Reduce the “list of rounded cards” feel.

#### Admin

- Present metrics, provider states, and actions as supervisory control panels.
- Increase visual density without sacrificing scanability.
- Make the overview page feel more like an operational center than a marketing-style dashboard.

## Screen Migration Plan

### Phase 1: Foundation and Primitives

Build the new CSS foundation and replace the core primitive layer first.

Primary files likely involved:

- `app/globals.css`
- `components/ui/*`
- `components/shell/*`
- `lib/utils.ts`
- `package.json`
- `postcss.config.mjs`
- `tailwind.config.mjs`

Expected result:

- New visual tokens exist.
- New primitives render correctly.
- Shared shell can host migrated pages without relying on Tailwind.

### Phase 2: Anchor Screens

Migrate the screens that define the product language:

- auth entry and auth pages
- dashboard overview
- admin overview

Primary files likely involved:

- `app/page.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `components/blocks/auth/auth-entry-panel.tsx`
- `app/dashboard/page.tsx`
- `components/blocks/dashboard/dashboard-overview-blocks.tsx`
- `app/admin/page.tsx`
- `components/blocks/admin/admin-overview-blocks.tsx`

Expected result:

- The new design is visible immediately in the highest-traffic product areas.
- The core language is set before migrating secondary surfaces.

### Phase 3: Secondary Surfaces

Migrate all remaining user-facing and admin-facing screens onto the same system:

- buy / checkout
- history
- referrals
- devices
- users
- plans
- promos
- payments
- logs
- export
- form-driven create/edit pages

This phase should also absorb any remaining old page-level utility styling into the new CSS layer.

### Phase 4: Tailwind Removal

Once all screens are migrated:

- remove Tailwind imports and config usage
- remove Tailwind-specific dependencies
- remove `cva` / `tailwind-merge` if no longer needed
- verify there are no lingering utility-class dependencies in JSX

The project should end with plain CSS as the styling foundation, not a partial migration.

## Migration Rules

- Do not mix old Tailwind-heavy surfaces with migrated custom-CSS surfaces inside the same screen.
- Prefer migrating entire screen zones rather than doing scattered cosmetic edits.
- Keep accessibility behavior intact while changing layout and styling.
- Keep route behavior, data loading, and form submission semantics unchanged unless a clear UX issue requires adjustment.
- Preserve mobile and desktop usability across all migrated surfaces.

## Testing Strategy

### Before Implementation

Add or update tests around critical shell structure and primitive behavior before rewriting implementation details.

### During Migration

Verify at least:

- shell structure still renders expected navigation
- modal/sheet triggers still work
- critical buttons and form controls preserve behavior
- dashboard/admin overview blocks still expose expected content

### After Tailwind Removal

Run a final verification pass covering:

- lint
- targeted Vitest suites for shell and UI primitives
- targeted page/block tests for auth, dashboard, and admin anchor screens
- production build

## Risks

### Visual Drift

Risk: screens end up mixing old SaaS-kit patterns with the new operator-console system.

Mitigation: migrate by screen zones and replace primitives early.

### API-Compatible but Stylistically Generic Primitives

Risk: primitives preserve API shape but still feel like reskinned `shadcn`.

Mitigation: redesign spacing, surfaces, emphasis, borders, states, and layout behavior rather than only recoloring.

### Hidden Tailwind Coupling

Risk: page and block components rely on utility classes more deeply than expected.

Mitigation: audit utility-heavy files early and treat shell, auth, dashboard overview, and admin overview as migration reference implementations.

### Accessibility Regression

Risk: deeper custom styling weakens focus states, contrast, or keyboard flows.

Mitigation: keep Radix behavior where useful, define explicit focus-visible states in the new foundation, and preserve semantic structure.

## Acceptance Criteria

- All user-facing and admin-facing screens render through the new custom CSS system.
- The interface no longer looks recognizably Tailwind or `shadcn`.
- Tailwind is no longer required for runtime styling.
- Tailwind-specific config/imports are removed after migration.
- Base primitives and shell share one coherent design language.
- Auth, dashboard, and admin feel like parts of a single product family with role-specific density.
- Desktop and mobile layouts both remain functional.
