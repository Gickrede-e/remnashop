# Overrrides Sidebar Redesign

## Summary

Reframe the current pure-CSS redesign around the internal-page language of `overrrides.com`, specifically the sidebar and content architecture used on:

- `https://overrrides.com/faq`
- `https://overrrides.com/docs`
- `https://overrrides.com/terms`

This supersedes the earlier generic “dark operator console” direction for shell/auth composition. The application should now use a near-literal `overrrides`-style left sidebar across all areas of the product, while adapting the right-hand workspace for RemnaShop’s actual flows, data, and role-specific tasks.

The result should feel structurally close to `overrrides` on internal pages:

- fixed narrow left sidebar
- strong brand block at the top
- vertical navigation list in the middle
- compact system actions at the bottom
- restrained dark content canvas on the right

But it must remain a real product UI rather than a cloned marketing/documentation site.

## Goals

- Make the application shell visually and structurally resemble the internal pages of `overrrides.com`.
- Use one consistent left sidebar pattern across public, auth, dashboard, and admin surfaces.
- Simplify login into a centered card instead of the previously approved split auth layout.
- Keep dashboard and admin operational on the right side of the shell, not gallery-like.
- Preserve the current routes, business logic, data flow, and behavioral contracts while changing layout and styling.

## Non-Goals

- Do not turn dashboard or admin into a showcase grid like the `overrrides` home page.
- Do not introduce a long catalog-like landing page.
- Do not replicate `overrrides` copy, branding, or information architecture one-to-one.
- Do not add new product features as part of the redesign.

## Core Reference Interpretation

### What Is Being Copied Closely

The following elements should be intentionally close to the reference:

- sidebar width and fixed left-column presence
- dark matte background treatment
- compact brand lockup at the top of the sidebar
- vertically stacked nav items with subtle separators and active state emphasis
- bottom action cluster inside the sidebar
- narrow, restrained, documentation-like content framing on the right

### What Is Being Adapted

The following elements should be adapted to RemnaShop:

- nav labels and grouping
- role-aware routes
- right-side workspace composition
- button semantics
- status blocks, telemetry, forms, tables, and control panels
- login form contents and auth routing

### What Is Explicitly Not the Reference

- the `overrrides` home-page gallery and asset wall
- purchase CTA in the sidebar footer on internal pages
- content that feels like docs or marketing when it should feel operational

## Global Shell Architecture

### Single Sidebar System

All product areas should use the same left sidebar pattern:

- public entry pages
- login
- register
- dashboard
- admin
- supporting public pages such as pricing and FAQ if they remain in scope

The shell should stop switching between unrelated navigation paradigms. The sidebar becomes the primary spatial anchor of the whole application.

### Sidebar Structure

The sidebar is divided into three vertical zones.

#### 1. Brand Zone

Top block with:

- wordmark / logo
- short uppercase support line
- subtle divider below the brand block

This should feel very close to `overrrides` internal pages: compact, quiet, and slightly editorial rather than app-startup-like.

#### 2. Navigation Zone

Middle block with vertical nav groups.

Rules:

- role-aware sections are allowed, but the visual pattern stays consistent
- active item should be highlighted with a muted filled treatment and accent edge/tint
- inactive items should remain low-contrast but readable
- hover/focus states should be subtle, not neon-heavy
- nav groups may include compact section labels in small uppercase text

#### 3. System Actions Zone

Bottom block uses system actions instead of sales CTAs.

Required actions:

- Profile
- Switch role
- Logout

This zone should visually echo the bottom CTA zone on `overrrides`, but semantically it is product/system control, not checkout.

## Top-Level Layout Rules

### Desktop

Desktop uses:

- fixed-width sidebar on the left
- content workspace on the right
- no competing second sidebar unless a page truly needs it

The right workspace should feel calm and dense, with the first content column narrower than a typical dashboard app if that improves similarity to the reference.

### Mobile

Mobile may collapse the sidebar into a drawer or sheet, but:

- the drawer should still feel like the same sidebar, not a generic mobile tab bar
- do not reintroduce a standard bottom navigation bar if the sidebar/drawer can cover the need
- system actions must remain accessible within the mobile nav surface

## Public and Auth Surfaces

### Home Page

The home page should be a short entry page, not a long gallery.

Desired behavior:

- it uses the same sidebar language as the rest of the product
- the right side contains only a small entry-oriented composition
- copy remains short and functional
- the page acts as a product gateway, not a visual asset library

### Login Page

The login page is now intentionally simpler than the shared-shell mockups shown earlier.

Approved direction:

- centered login card
- no split hero/auth composition
- two fields
- one primary action
- one secondary recovery/help link

The structure should follow the user-provided simple HTML pattern:

- card centered on the page
- concise title
- rounded inputs
- rounded primary button
- small recovery link beneath

But the styling should use the `overrrides` internal-page palette and atmosphere:

- black / graphite background
- warm off-white text
- acid yellow primary action
- subtle violet accents only as depth or ambient glow
- no light-mode card styling
- no purple SaaS gradient button

### Register Page

Register should remain consistent with login:

- same centered-card family
- slightly taller form because of extra fields
- no return to the split auth layout

## Dashboard Workspace

### Structural Intent

Dashboard should live inside the `overrrides` sidebar shell, but the right side remains a product workspace.

The first screen should prioritize:

- subscription status
- current access state
- primary actions such as buy/renew/reissue
- referral and device shortcuts

### Composition Rules

- one strong top block is allowed
- below it, content should become operational panels, not decorative tiles
- panels should align to a disciplined grid, not a random card mosaic
- dashboard must still feel denser and more practical than the public/auth surfaces

## Admin Workspace

### Structural Intent

Admin uses the same sidebar pattern as dashboard, not a second admin-only shell.

The right workspace becomes a control canvas for:

- KPI summary
- provider status
- quick actions
- logs / payments / users / plans / promos flows

### Composition Rules

- the top block should frame control state and quick actions
- below it, secondary panels and tables should read as supervisory tools
- admin should remain denser than dashboard
- layout should never drift into a gallery or marketing mosaic

## Visual System

### Palette

The palette should shift from the earlier cyan-leaning operator system to something closer to `overrrides` internal pages:

- near-black background planes
- warm off-white text
- muted gray separators and surfaces
- acid yellow primary accents
- controlled violet ambient glow where useful

Color intent:

- yellow marks action and active state
- off-white carries typography
- violet is atmospheric, not dominant
- cyan is no longer the core accent

### Typography

Typography should feel closer to the editorial/monospace-adjacent tone of the reference than to a typical dashboard starter:

- compact uppercase labels
- strong headline weight where needed
- restrained body sizes
- more document-like rhythm on internal surfaces

Exact font choice can be adapted, but the feeling should move toward the internal `overrrides` pages rather than the earlier futuristic-console direction.

### Motion

Approved motion level is medium:

- hover emphasis on nav items and buttons
- soft reveal for blocks
- subtle shell state transitions
- no constant ambient animation

## Component and Primitive Implications

The existing pure-CSS primitive migration remains valid, but the visual tuning changes.

Impacted primitives:

- Button
- Input
- Card / panel surfaces
- Tabs
- Dialog / sheet
- Badge
- Table
- Skeleton

Key updates:

- buttons should align with the new yellow-accent system
- inputs should support the simpler auth-card layout cleanly
- panels should flatten toward matte dark blocks instead of “console glow”
- shell primitives should prioritize sidebar/document rhythm over dashboard chrome

## Navigation Mapping

The sidebar must adapt to product reality rather than mirroring the exact `overrrides` menu.

Expected mapping pattern:

- public/auth: entry routes
- dashboard: overview, buy, history, referrals, devices
- admin: overview, users, payments, plans, promos, logs, export, referrals as appropriate

Implementation may use grouped sections, but visual treatment should remain one coherent sidebar.

## Accessibility and Behavior

- Keep skip-link behavior intact even with the sidebar-first shell
- Preserve keyboard navigation through sidebar items and footer actions
- Keep `prefers-reduced-motion` handling
- Maintain semantic landmarks for main content
- Ensure active-route indication is available to assistive technologies

## Risks

### Over-Literal Copying

Risk: the application feels like a visual imitation rather than a product.

Mitigation: keep the sidebar pattern close, but make the right workspace decisively product-specific.

### Shell Dominance Over Utility

Risk: the shell becomes stronger than the content and harms scanability.

Mitigation: keep dashboard/admin content utilitarian, restrained, and hierarchy-first.

### Split Direction in Auth

Risk: login and register drift apart if login becomes a simple card while register remains more complex.

Mitigation: move both auth screens into the same centered-card family.

## Planning Notes

This spec should drive a fresh implementation plan that explicitly supersedes the earlier shell/auth direction in `2026-04-07-pure-css-ui-redesign-design.md`.

The implementation plan should treat the following as anchor tasks:

- rebuild shell around the unified `overrrides`-style sidebar
- simplify login and register to centered-card auth surfaces
- retune palette and primitives from cyan-console toward yellow/neutral `overrrides` language
- remap dashboard and admin into the new shell without turning them into gallery layouts
