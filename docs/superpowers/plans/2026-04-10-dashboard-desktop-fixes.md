# Dashboard Desktop Layout Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Target executor:** chatgpt-5.4.
>
> **Context:** The previous dashboard redesign (commits `1e55bc6`..`4b13241`) shipped the new monochrome `dashSidebar` shell. The sidebar visual is correct, but on desktop the user dashboard is broken in two specific ways. This plan fixes both with minimum-blast-radius changes and adds tests so the regressions cannot return. Do **not** redesign anything else and do **not** touch dashboard page bodies.

**Goal:**
1. Make `/dashboard` and every nested dashboard route render across the **full viewport width** on desktop instead of being squeezed into the sidebar column (currently the page content paints inside the ~16rem sidebar strip).
2. Eliminate the **giant white circle** that appears below `LOG OUT` in the sidebar footer on every dashboard route.

**Architecture:** All fixes are isolated to `app/globals.css` (the `.dashShell`, `.dashShellMain`, `.dashSidebar`, `.dashSidebarFooter`, `.dashSidebarCta` rules and their `@media (max-width: 768px)` overrides). No component, no nav config, no test renderer changes. One regression test is added against `app/globals.css` source so the broken pattern cannot reappear.

**Tech Stack:** Next.js 16 App Router, React 19, global CSS, Vitest, Node toolchain via `npm run lint` / `npx vitest run`.

---

## Root-cause analysis (read before touching code)

Open `app/globals.css` and look at the rules around line 582. The current state is:

```css
.dashShell {
  display: grid;
  grid-template-columns: clamp(15rem, 18vw, 16.5rem) minmax(0, 1fr);
  /* ... */
}

.dashShellMain {
  margin-left: clamp(15rem, 18vw, 16.5rem);
  /* ... */
}

.dashSidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: clamp(15rem, 18vw, 16.5rem);
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  /* ... */
}

.dashSidebarFooter {
  display: grid;
  gap: 0.85rem;
  /* ... */
}

.dashSidebarCta {
  display: inline-flex;
  /* ... */
  border-radius: 999px;
  /* ... */
}
```

### Bug 1 — desktop renders as mobile

`.dashShell` declares a 2-column grid (`16.5rem | 1fr`).
`.dashSidebar` is `position: fixed`, so it is removed from the grid flow entirely and **does not occupy column 1**.
`.dashShellMain` has no explicit `grid-column`, so the grid auto-places it into the first available cell — **column 1, the 16.5rem one**.
On top of that, `.dashShellMain` adds `margin-left: 16.5rem`, which pushes its already-16.5rem-wide cell content further right and triggers horizontal overflow.

Net effect: every dashboard page renders inside a ~16rem column (the same width as the sidebar). It looks identical to the mobile layout because the cards are forced to wrap into a single narrow column. Column 2 (`1fr`) stays empty.

### Bug 2 — white circle in the sidebar

`.dashSidebar` declares `grid-template-rows: auto auto auto 1fr auto` — five rows. But `DashboardSidebar` only renders **four** direct children when `otherItems` is empty (which is the default `dashboard` case for non-admin users):

1. `.dashSidebarBrand`
2. `.dashSidebarNav`
3. *(no `.dashSidebarOther` because `otherItems.length === 0`)*
4. `.dashSidebarFooter`

Even when `otherItems` is non-empty there are only 4 children, because the brand+nav+other+footer = 4. Either way, the auto-placement maps the **footer** into the explicit row that has `1fr`. That row stretches to fill the remaining sidebar height.

`.dashSidebarFooter` is itself `display: grid` with no `align-content`, so its implicit auto rows stretch to fill the now-tall footer. Inside it, `.dashSidebarCta` is an `<a>` with `border-radius: 999px` and no row-axis sizing — it inherits `align-self: stretch` from the grid item default and grows vertically to ~600px. A 256×600 element with `border-radius: 999px` paints as a giant white pill, which on the screenshot reads as a "white circle".

**Both bugs share the same root cause family:** the previous author tried to use `position: fixed` for the sidebar **and** a CSS grid for the shell, which is mutually exclusive — the fixed sidebar should not be a grid item, but then `.dashShellMain` cannot rely on grid placement.

The fix is to drop `position: fixed` and use the grid columns the way they were declared. The sidebar becomes `position: sticky` with `height: 100dvh`, which keeps the "always visible" behavior without taking it out of flow.

---

## File Map

### Modify

- `app/globals.css`
  - Rewrite the `.dashShell`, `.dashShellMain`, `.dashSidebar`, `.dashSidebarFooter`, `.dashSidebarCta` rules around lines 582–760.
  - Update the `@media (max-width: 768px)` block around line 3452 so the new layout collapses cleanly on mobile.

### Create

- `__tests__/components/shell/dashboard-shell-layout.test.ts`
  - Static regression test that reads `app/globals.css` and asserts the broken patterns are absent and the fixed patterns are present.

### Do not touch

- `components/shell/dashboard-sidebar.tsx`
- `components/shell/dashboard-sidebar-other-group.tsx`
- `components/shell/app-shell.tsx`
- `lib/ui/app-shell-nav.ts`
- Any file under `app/dashboard/`, `components/blocks/dashboard/`, or `app/admin/`.

If you find yourself wanting to edit any of those, stop and re-read the goal — the bugs are 100% in `app/globals.css`.

---

## CSS contract (what the fixed rules MUST look like)

The rules below are the source of truth. Copy them exactly into `app/globals.css`, replacing the existing definitions in place. Keep them inside the same `@layer components { ... }` block they currently live in. Preserve the existing 2-space indentation that surrounds them.

```css
.dashShell {
  display: grid;
  grid-template-columns: clamp(15rem, 18vw, 16.5rem) minmax(0, 1fr);
  min-height: 100dvh;
  background: var(--canvas-0);
  color: var(--text-primary);
  font-family: var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.dashShellMain {
  min-width: 0;
  grid-column: 2;
  padding: clamp(1.75rem, 3vw, 2.75rem);
  display: grid;
  gap: clamp(1.5rem, 2.5vw, 2rem);
  align-content: start;
}

.dashSidebar {
  position: sticky;
  top: 0;
  grid-column: 1;
  align-self: start;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem 1rem 1.25rem;
  background: var(--canvas-0);
  border-right: 1px solid var(--surface-line);
  z-index: 50;
  overflow-y: auto;
}

.dashSidebarFooter {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 1rem;
  border-top: 1px solid var(--surface-line);
}

.dashSidebarCta {
  flex: 0 0 auto;
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.6rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  background: var(--text-primary);
  color: var(--canvas-0);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-decoration: none;
  transition: background-color 140ms ease, transform 140ms ease;
}
```

Things you must NOT change:

- The `:hover` rules for `.dashSidebarLink`, `.dashSidebarCta`, `.dashSidebarLogoutBtn` (lines around 244 and 676/756/783).
- The `.dashSidebarLink`, `.dashSidebarLink.is-active`, `.dashSidebarBrand*`, `.dashSidebarNav`, `.dashSidebarOther*`, `.dashSidebarLogout*` rules.
- The `.dashSkipLink` rules.
- Any colour token, font token, or typography rule.

### Mobile breakpoint

Find the existing block around line 3452 (`@media (max-width: 768px) { ... .dashShell { grid-template-columns: 1fr; } ... }`) and replace it with:

```css
@media (max-width: 768px) {
  .dashShell {
    grid-template-columns: 1fr;
  }

  .dashShellMain {
    grid-column: 1;
    padding: 1.25rem;
  }

  .dashSidebar {
    position: static;
    grid-column: 1;
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--surface-line);
  }

  .dashSidebarFooter {
    margin-top: 0;
  }
}
```

Reason for each mobile override:

- `grid-template-columns: 1fr` collapses to a single-column stack so sidebar and main render top-to-bottom.
- `dashShellMain.grid-column: 1` aligns the main into the (now only) column.
- `dashSidebar.position: static` cancels desktop sticky so it does not pin during scroll on small screens, and `height: auto` lets it size to its content instead of forcing 100dvh.
- `dashSidebarFooter.margin-top: 0` cancels the desktop `margin-top: auto` push so the footer sits naturally after `OTHER STUFF` instead of being shoved to the bottom of the viewport on mobile.

Do not introduce any other media queries. Do not touch the `@media (min-width: 80rem)` block.

---

## Test contract

Create `__tests__/components/shell/dashboard-shell-layout.test.ts` with the following exact content. The tests are static (read the CSS file as a string) so they run without spinning up jsdom layout.

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCssPath = path.resolve(process.cwd(), "app/globals.css");

function readCss() {
  return fs.readFileSync(globalsCssPath, "utf8");
}

function extractRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`,
    "m"
  );
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`CSS rule for ${selector} not found`);
  }
  return match[2];
}

describe("dashboard shell layout", () => {
  it("places dashShellMain into the second grid column without margin hacks", () => {
    const rule = extractRule(readCss(), ".dashShellMain");

    expect(rule).toContain("grid-column: 2");
    expect(rule).not.toContain("margin-left:");
  });

  it("keeps dashSidebar in the grid flow as a sticky flex column", () => {
    const rule = extractRule(readCss(), ".dashSidebar");

    expect(rule).toContain("position: sticky");
    expect(rule).not.toContain("position: fixed");
    expect(rule).toContain("grid-column: 1");
    expect(rule).toContain("display: flex");
    expect(rule).toContain("flex-direction: column");
    expect(rule).not.toContain("grid-template-rows:");
  });

  it("pins the sidebar footer to the bottom via margin-top auto", () => {
    const rule = extractRule(readCss(), ".dashSidebarFooter");

    expect(rule).toContain("margin-top: auto");
    expect(rule).toContain("display: flex");
    expect(rule).toContain("flex-direction: column");
  });

  it("locks the sidebar CTA height so it cannot stretch into a circle", () => {
    const rule = extractRule(readCss(), ".dashSidebarCta");

    expect(rule).toContain("flex: 0 0 auto");
    expect(rule).toContain("min-height: 2.6rem");
  });

  it("collapses the dashboard shell to a single column on narrow viewports", () => {
    const source = readCss();
    const mobileBlockMatch = source.match(
      /@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\s{2}\}/
    );
    expect(mobileBlockMatch, "expected the existing 768px media block").not.toBeNull();
    const mobile = mobileBlockMatch![1];

    expect(mobile).toContain(".dashShell");
    expect(mobile).toContain("grid-template-columns: 1fr");
    expect(mobile).toContain(".dashShellMain");
    expect(mobile).toContain("grid-column: 1");
    expect(mobile).toContain(".dashSidebar");
    expect(mobile).toContain("position: static");
    expect(mobile).toContain(".dashSidebarFooter");
    expect(mobile).toContain("margin-top: 0");
  });
});
```

The `extractRule` helper deliberately matches the **first** definition in the file. If you keep the original `@layer components` ordering this will hit the desktop rule, not the mobile-block override, because the desktop rule is defined before the `@media` block. Do not reorder the file.

---

## Tasks

### Task 1 — Add the regression test (red)

- [ ] Create `__tests__/components/shell/dashboard-shell-layout.test.ts` with the exact content from the **Test contract** section above.
- [ ] Run the suite and confirm the new test fails against the current `app/globals.css`:

```bash
npx vitest run __tests__/components/shell/dashboard-shell-layout.test.ts
```

Expected: at least four of the five tests fail (the existing CSS still uses `position: fixed`, `margin-left`, and `grid-template-rows`).

- [ ] Commit:

```
test(shell): describe dashboard shell layout contract
```

### Task 2 — Apply the CSS fixes (green)

- [ ] Open `app/globals.css`. Locate the `.dashShell`, `.dashShellMain`, `.dashSidebar`, `.dashSidebarFooter`, `.dashSidebarCta` rules around lines 582–760 and replace each one in place with the exact block from the **CSS contract** section. Do not move them, do not reorder them, do not delete the surrounding rules.
- [ ] Locate the `@media (max-width: 768px)` block around line 3452 and replace its body with the exact block from the **Mobile breakpoint** section.
- [ ] Re-run the regression test and confirm all five assertions pass:

```bash
npx vitest run __tests__/components/shell/dashboard-shell-layout.test.ts
```

- [ ] Run the full Vitest suite to make sure nothing else regressed (the existing `mobile-visual-primitives.test.ts` only checks that `.dashSidebar` exists in the file, which it still does):

```bash
npx vitest run
```

Expected: green.

- [ ] Run lint:

```bash
npm run lint
```

Expected: green.

- [ ] Commit:

```
fix(shell): restore dashboard desktop layout and stop sidebar CTA stretch
```

### Task 3 — Manual verification

You do not have a browser, so verify by reading the CSS rules back and confirming the following invariants by inspection. Do **not** run a dev server.

- [ ] `app/globals.css` contains exactly **one** definition of `.dashSidebar` outside the `@media (max-width: 768px)` block, and that definition uses `position: sticky` (not `fixed`).
- [ ] `app/globals.css` contains **zero** occurrences of `margin-left: clamp(15rem` (the broken main-area margin is gone):

```bash
rg -n "margin-left: clamp\(15rem" app/globals.css
```

Expected: zero hits.

- [ ] `app/globals.css` contains **zero** occurrences of `grid-template-rows: auto auto auto 1fr auto`:

```bash
rg -n "grid-template-rows: auto auto auto 1fr auto" app/globals.css
```

Expected: zero hits.

- [ ] `app/globals.css` still contains exactly **one** `.dashSidebarCta` rule and it includes `min-height: 2.6rem`:

```bash
rg -n "min-height: 2.6rem" app/globals.css
```

Expected: one hit, inside the `.dashSidebarCta` block.

- [ ] `components/shell/dashboard-sidebar.tsx` is **unchanged** since `4b13241`:

```bash
git diff 4b13241 -- components/shell/dashboard-sidebar.tsx
```

Expected: empty.

- [ ] `components/shell/app-shell.tsx` is **unchanged** since `4b13241`:

```bash
git diff 4b13241 -- components/shell/app-shell.tsx
```

Expected: empty.

### Task 4 — Final sweep

- [ ] `git status` is clean except for the two files this plan touches (`app/globals.css`, `__tests__/components/shell/dashboard-shell-layout.test.ts`).
- [ ] `git log --oneline -3` shows exactly the two commits from Task 1 and Task 2 on top of `4b13241 chore: verify overrrides sidebar redesign`.
- [ ] Do not push. Leave the branch at `main` for the user to push manually.

---

## Anti-goals (do not do any of these)

- Do not redesign or restyle the sidebar visually. The colour, font, spacing, brand block, OTHER STUFF group, and LOG OUT row are all correct and must be left alone.
- Do not edit any file under `app/dashboard/`, `app/admin/`, `components/blocks/dashboard/`, `components/blocks/admin/`. The desktop layout will fix itself once the shell grid is repaired.
- Do not introduce a new component, hook, utility, or CSS file. The fix is five rule rewrites in `app/globals.css` plus one test file.
- Do not add Tailwind classes, CSS variables, or new tokens. Use the existing `var(--...)` tokens already in the rules.
- Do not change the navigation config in `lib/ui/app-shell-nav.ts`.
- Do not touch the auth pages or the public pages.
- Do not bump dependencies, do not run `npm install`, do not regenerate `package-lock.json`.
- Do not amend, squash, force-push, or rebase. Leave the two commits as they are.
- Do not add `position: absolute` or `position: fixed` anywhere — the sidebar must stay in the grid flow as a sticky flex column.
