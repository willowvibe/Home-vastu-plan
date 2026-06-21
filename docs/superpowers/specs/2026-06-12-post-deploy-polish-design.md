# Post-Deploy Polish — Design

**Date:** 2026-06-12
**Status:** Approved (pending user review of this spec)
**Scope:** Three logically independent changes bundled into a single batch on one branch (`fix/post-deploy-polish`, off `origin/main @ 99b8bf1`):

1. **Floor labels:** rename `Ground / First / Second` → `0th / 1st / 2nd`, with a single `formatFloor()` helper to kill the ternary smell.
2. **Theme system:** migrate the prop-drilled `darkMode` React state + 83 ternary class strings to Tailwind v4's `dark:` variant, with a `useDarkMode()` hook + `<ThemeProvider>` context. **Also** add section-specific light/dark shades so the UI doesn't read as "all white" or "all dark" — each major region (header, sidebar, canvas frame, properties panel) gets its own shade within the existing `slate` palette.
3. **Doc sweep:** add a new `CLAUDE.md` at the repo root, sync `CHANGELOG.md` / `docs/CODE_REVIEW.md` / `docs/KNOWN_ISSUES.md` to post-PR-#47 + post-Vercel + post-theme-fix state, and refresh the persistent memory index.

The branch has **three commits in dependency order** (floor → theme → docs) so the tree is green after each commit and any single commit is independently mergeable.

---

## 1. Context

### 1a. Floor labels (the easy one)

The floor labels are hardcoded in 4 ternary sites in `src/App.tsx` (lines 1002, 1010, 1277, 1821) and a stale comment in `src/types.ts:55`. They're user-facing — anyone using the app to plan a multi-floor home sees them. The current strings are `Ground / First / Second` (and a 4th floor would crash the ternary with a `Second` fallback that lies).

The smell isn't just the wording — it's that **the same logic is duplicated 4 times**. Adding a 3rd floor today means editing 4 sites. This spec adds a `formatFloor(n)` helper and removes the duplication.

### 1b. Theme system (the meaty one)

The current state is broken in three independent ways:

1. **The `dark:` Tailwind variant is not enabled.** Tailwind v4 requires `@custom-variant dark (&:where(.dark, .dark *));` in CSS to produce the `dark:bg-slate-800` CSS. The codebase has 7 places that use `dark:` classes (e.g., `Header.tsx:134`), but no `@custom-variant` declaration in `src/index.css` — so those classes compile to nothing. They look right in the code, they look right in DevTools, they don't actually paint.

2. **Dark mode is "working" only via ternary class strings.** `App.tsx:85` holds `darkMode` as React state, persists it to `localStorage` via `useEffect` at line 96, and threads it as a prop to `Header` and `LayerManager`. **Total darkMode references: 83** across the codebase. Most are `darkMode ? 'bg-slate-800' : 'bg-white'` ternaries. This works, but:
   - It conflates two responsibilities: "what color is this" and "is the user in dark mode"
   - It forces every new component to receive `darkMode` as a prop, or know how to read it
   - It can't be reused by anything that doesn't go through `<App>` (e.g., the PWA service worker, error boundaries, the toast system)

3. **Light and dark palettes are flat.** In light mode, the header, sidebar, canvas frame, and properties panel are all some combination of `bg-white` / `bg-slate-50`. In dark mode, they're all `bg-slate-800` / `bg-slate-900`. The user's complaint ("mostly all white") is correct — there is no visual sectioning. The fix is to give each major region its own shade within the existing `slate` family, which makes the UI feel less like a single rectangle.

### 1c. Doc sweep (the bookkeeping)

The repo's last big docs sync was on 2026-06-11 (the `docs-sync-2026-06-11.md` memory). Since then:

- PR #45 (P2 refactor) merged — S-3, S-8, S-12, Q-9, Q-12 done
- PR #46 (Q-2 + Q-3 test coverage) merged — 97 → 128 tests
- PR #47 (Q-1 test coverage) merged — 128 → 151 tests
- The Vercel deployment shipped (`b761d4f`) and is live (per user confirmation, deployed from main)
- The theme system bug (above) is being fixed in this very branch

`docs/CODE_REVIEW.md` and `docs/KNOWN_ISSUES.md` still have the pre-#45 references and don't mention the theme bug. `CHANGELOG.md` doesn't have the Vercel entry. There's no `CLAUDE.md` at the repo root, so a new Claude session loads nothing about VastuPlan conventions and has to rediscover them. The persistent memory at `/home/harish/.claude/projects/-mnt-data2-git-repos-Home-vastu-plan/memory/MEMORY.md` is correct but verbose — `CLAUDE.md` should distill the high-signal facts.

### Cross-cutting constraints

- **No new dependencies.** The `dark:` variant is built into Tailwind v4 (just needs the opt-in CSS line). `useDarkMode` is ~15 lines of code. No Redux, no `next-themes`, no theme library.
- **No `tailwind.config.js`.** Tailwind v4 config is in CSS. Adding a JS config would be a step backward.
- **No new top-level components moved between commits.** The three commits must produce a green test + lint + build at HEAD. The theme commit in particular must not ship a broken visual — the dev server will be the validator, not the test suite.
- **No design system overhaul.** Section-specific shades only, not a new color system. The plan deliberately stops short of CSS custom properties, dark/light design tokens, or `prefers-color-scheme: dark` auto-detection. Those are future work.

---

## 2. What changes

| File                                                             | Action                              | Why                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/constants/floorPlanConstants.ts`                            | **edit**                            | Add `formatFloor()` helper.                                                                        |
| `src/App.tsx`                                                    | **edit** (4 ternary → 4 call sites) | Floor label rename.                                                                                |
| `src/types.ts`                                                   | **edit** (1 comment)                | Update stale `// 0 = Ground, 1 = First, etc.` comment.                                             |
| `src/constants/floorPlanConstants.test.ts`                       | **create**                          | Unit test for `formatFloor()`.                                                                     |
| `src/index.css`                                                  | **edit** (1 line)                   | Add `@custom-variant dark (...)` to enable Tailwind v4's `dark:` variant.                          |
| `src/hooks/useDarkMode.ts`                                       | **create**                          | Hook that toggles `<html class="dark">` + persists to localStorage.                                |
| `src/hooks/useDarkMode.test.ts`                                  | **create**                          | Tests for the hook.                                                                                |
| `src/contexts/ThemeContext.tsx`                                  | **create**                          | `<ThemeProvider>` + `useTheme()` consumer hook.                                                    |
| `src/main.tsx` (or root)                                         | **edit** (1 wrap)                   | Wrap app in `<ThemeProvider>`.                                                                     |
| `src/App.tsx`                                                    | **edit** (delete state + effect)    | Remove the local `darkMode` state and the localStorage `useEffect`; consume `useTheme()` instead.  |
| `src/components/layout/Header.tsx`                               | **edit** (props + ternaries)        | Drop `darkMode` / `setDarkMode` props; migrate all ternaries to `dark:` + section-specific shades. |
| `src/components/LayerManager.tsx`                                | **edit** (props + ternaries)        | Same.                                                                                              |
| 13 other component files                                         | **edit** (ternaries only)           | Migrate 76 remaining ternaries + add section-specific shades where applicable.                     |
| `CLAUDE.md`                                                      | **create**                          | New repo-root file (≤200 lines) for future Claude sessions.                                        |
| `CHANGELOG.md`                                                   | **edit**                            | Add Vercel deploy entry + post-deploy-polish entry.                                                |
| `docs/CODE_REVIEW.md`                                            | **edit**                            | Bump header, mark theme-system item Resolved.                                                      |
| `docs/KNOWN_ISSUES.md`                                           | **edit**                            | Bump header, add to "Recently Resolved" list.                                                      |
| `docs/superpowers/specs/2026-06-12-post-deploy-polish-design.md` | **create** (this file)              | The design spec.                                                                                   |

**Net diff vs. `main @ 99b8bf1`:** 2 new files for the floor rename (test file + helper addition), 1 new file for `useDarkMode.ts` + its test, 1 new file for `ThemeContext.tsx`, 1 new file for `CLAUDE.md`, 1 new file for the spec, plus edits to 16 source files and 4 doc files. **No new dependencies. No new top-level packages.**

**Three commits on `fix/post-deploy-polish`:**

1. `chore(ui): rename floor labels to ordinals (formatFloor helper)` — 1 helper + 1 test + 5 edits
2. `refactor(theme): migrate to Tailwind dark: variant + section-specific shades` — 1 hook + 1 context + 1 CSS line + 16 component edits + 1 hook test
3. `docs(sync): refresh post-PR-#47 / post-Vercel / post-theme-fix state + CLAUDE.md` — 1 new CLAUDE.md + 3 doc syncs + memory updates

Each commit is independently green: `npm test` + `npm run lint` + `npm run build` pass at HEAD. If commit 2 has to be reverted or reworked, commit 1 still stands, and commit 3 (the doc sweep) can still land with a softer claim about theme status in `CLAUDE.md`.

---

## 3. Floor rename

### 3a. `formatFloor()` helper

Added to `src/constants/floorPlanConstants.ts` (which already exists and exports other floor-plan constants):

```ts
/**
 * Format a floor number as an English ordinal: 0 → "0th", 1 → "1st",
 * 2 → "2nd", 11 → "11th", 21 → "21st", etc. The 11/12/13 special case
 * (and 111/112/113, 211/212/213, …) is the only non-mechanical part.
 */
export function formatFloor(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
```

This is **not** just a rename — it removes the duplicated ternary smell, so future floor additions (a 4th floor, a basement `−1`, etc.) are a 1-line change.

### 3b. Call site replacements

In `src/App.tsx`, four sites currently look like:

```tsx
{
  floor === 0 ? 'Ground' : floor === 1 ? 'First' : 'Second';
}
```

All four become:

```tsx
{
  formatFloor(floor);
}
```

The 4 lines and their purpose:

- `App.tsx:1002` — `<option>` label in the floor selector dropdown
- `App.tsx:1010` — Confirmation dialog text ("Clear all rooms on X floor?")
- `App.tsx:1277` — Vastu score area header
- `App.tsx:1821` — Print header

Each replacement is mechanical: search for the `floor === 0 ? 'Ground'` pattern, replace with `{formatFloor(floor)}`. The 4 sites will all be replaced in the same commit.

### 3c. Type comment

`src/types.ts:55` currently says:

```ts
floor: number; // 0 = Ground, 1 = First, etc.
```

Becomes:

```ts
floor: number; // 0 = 0th, 1 = 1st, 2 = 2nd, … (see formatFloor() in src/constants/floorPlanConstants.ts)
```

### 3d. Test

New file `src/constants/floorPlanConstants.test.ts` (the directory has no existing test file). One `describe('formatFloor', ...)` block with cases:

```ts
expect(formatFloor(0)).toBe('0th');
expect(formatFloor(1)).toBe('1st');
expect(formatFloor(2)).toBe('2nd');
expect(formatFloor(3)).toBe('3rd');
expect(formatFloor(4)).toBe('4th');
expect(formatFloor(10)).toBe('10th');
expect(formatFloor(11)).toBe('11th'); // special case
expect(formatFloor(12)).toBe('12th'); // special case
expect(formatFloor(13)).toBe('13th'); // special case
expect(formatFloor(14)).toBe('14th');
expect(formatFloor(21)).toBe('21st'); // special case doesn't apply
expect(formatFloor(22)).toBe('22nd');
expect(formatFloor(100)).toBe('100th');
expect(formatFloor(111)).toBe('111th'); // 11 special case applies (111 % 100 = 11)
expect(formatFloor(121)).toBe('121st'); // 11 special case doesn't apply (121 % 100 = 21)
```

**Scope:** 1 new exported function + 1 new test file (15 assertions in 1 describe block). **Test count: 151 → 152.**

---

## 4. Theme system

This is the bulk of the work. The plan is to land it as a single commit (Commit 2), but the commit is internally ordered: CSS line first, then hook + context, then component migrations. If anything in the middle breaks, the file can be reverted to the previous commit's state without losing commit 1.

### 4a. The CSS line (the linchpin)

In `src/index.css`, add this line near the top (right after `@import 'tailwindcss';`):

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This is the **only** line of CSS that needs to change. It's the Tailwind v4 way to enable the `dark:` variant. Without it, `dark:bg-slate-800` produces no CSS, regardless of what's in the React tree. The 7 `dark:`-using sites scattered around the codebase (e.g., `Header.tsx:134`) will start working the moment this line lands.

### 4b. The hook

New file `src/hooks/useDarkMode.ts`:

```ts
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vastuplan-darkmode';

/**
 * Read the persisted dark-mode preference from localStorage. Falls back to
 * the current `<html class="dark">` state (so a manual toggle in DevTools
 * is respected), then to `false` for a fresh user.
 */
function readInitial(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return document.documentElement.classList.contains('dark');
}

/**
 * Dark mode as a hook. Returns `[isDark, toggle]` as a tuple. Writes to BOTH
 * `document.documentElement.classList` (for Tailwind's `dark:` variant) and
 * `localStorage` (for persistence) on every change.
 */
export function useDarkMode(): readonly [boolean, () => void] {
  const [dark, setDark] = useState<boolean>(readInitial);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(STORAGE_KEY, String(dark));
    } catch {
      // localStorage can throw in private-browsing or quota-exceeded scenarios.
      // The class is already toggled; failing to persist just means the
      // preference won't survive a reload. Silent, intentional.
    }
  }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}
```

Why the `try`/`catch` around localStorage: Safari private mode and quota-exceeded scenarios throw on `setItem`. The class is already toggled at that point; the failure just means the preference won't survive a reload. The error is silent because there's no actionable user behavior — the toggle still works in the current session.

### 4c. The context

New file `src/contexts/ThemeContext.tsx`:

```tsx
import { createContext, useContext } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

interface ThemeContextValue {
  darkMode: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  darkMode: false,
  toggle: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, toggle] = useDarkMode();
  return <ThemeContext.Provider value={{ darkMode, toggle }}>{children}</ThemeContext.Provider>;
};

/** Read the current dark-mode state and the toggle function. */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
```

### 4d. Wire it up at the root

In `src/main.tsx` (or whatever the React root file is — it's the file with `createRoot().render(<App />)`), wrap `<App />` in `<ThemeProvider>`:

```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

This is a 1-line wrap. After this, every component in the tree can call `useTheme()` to read or toggle the theme.

### 4e. Delete the local state from `App.tsx`

`src/App.tsx:85-100` currently has:

```tsx
const [darkMode, setDarkMode] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('vastuplan-darkmode') === 'true';
  }
  return false;
});
useEffect(() => {
  localStorage.setItem('vastuplan-darkmode', String(darkMode));
}, [darkMode]);
```

This entire block is deleted. The component consumes `useTheme()` instead.

The `darkMode` and `setDarkMode` props that `<App>` passes to `<Header>` and `<LayerManager>` (lines 638-639 and any other call sites) are removed. Those components consume the context themselves.

### 4f. Component migrations

This is the mechanical bulk. Pattern translations:

| Old (ternary)                                                                    | New (Tailwind `dark:` variant)                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `darkMode ? 'bg-slate-800' : 'bg-white'`                                         | `bg-white dark:bg-slate-800`                                              |
| `darkMode ? 'text-slate-100' : 'text-slate-900'`                                 | `text-slate-900 dark:text-slate-100`                                      |
| `darkMode ? 'border-slate-700' : 'border-slate-200'`                             | `border-slate-200 dark:border-slate-700`                                  |
| `darkMode ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'` | `bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700` |

**Section-specific shades.** Beyond just making the ternaries work, the spec gives each major region a consistent shade so the UI has visual sectioning:

| Region                            | Light shade | Dark shade  | Tailwind                         |
| --------------------------------- | ----------- | ----------- | -------------------------------- |
| **Page background**               | `slate-50`  | `slate-900` | `bg-slate-50 dark:bg-slate-900`  |
| **Top header bar**                | `slate-100` | `slate-800` | `bg-slate-100 dark:bg-slate-800` |
| **Sidebar (left rail)**           | `white`     | `slate-900` | `bg-white dark:bg-slate-900`     |
| **Properties panel (right rail)** | `slate-50`  | `slate-900` | `bg-slate-50 dark:bg-slate-900`  |
| **Canvas frame / canvas wrapper** | `white`     | `slate-800` | `bg-white dark:bg-slate-800`     |
| **Modal / dialog**                | `white`     | `slate-800` | `bg-white dark:bg-slate-800`     |
| **Input / form control**          | `white`     | `slate-800` | `bg-white dark:bg-slate-800`     |
| **Tooltip / popover**             | `white`     | `slate-700` | `bg-white dark:bg-slate-700`     |

**How this is enforced:** the migration is component-by-component. When migrating `<Header>`, the dev looks at the current `darkMode` ternary, picks the matching row from the table above, and writes the new className. There's no automatic enforcement — the rule is "follow the table."

**Components to migrate** (~15 files, ~83 sites — the count is precise; the 83 figure comes from `grep -rn "darkMode" src/ | wc -l`, and the file list comes from running `grep -lr "darkMode" src/ --include="*.tsx"` at implementation start):

- `src/components/layout/Header.tsx` (drop 2 props, ~20 sites)
- `src/components/LayerManager.tsx` (drop 2 props, ~7 sites)
- `src/App.tsx` (already cleaned up; the remaining 50+ sites are in the rest of the file)
- `src/components/Canvas.tsx`
- `src/components/CollaborationPanel.tsx`
- `src/components/Compass.tsx`
- `src/components/ImageEditor.tsx`
- `src/components/OfflineIndicator.tsx`
- `src/components/Onboarding.tsx`
- `src/components/PlanComparison.tsx`
- `src/components/PresentationExport.tsx`
- `src/components/ProjectManager.tsx`
- `src/components/RoadIndicator.tsx`
- `src/components/RoomElement.tsx`
- `src/components/RulerOverlay.tsx`
- `src/components/ShortcutHelp.tsx`
- `src/components/Toast.tsx`
- `src/components/VastuGrid.tsx`

**What stays ternary.** Some sites aren't class strings — they're icons (`{darkMode ? <Sun /> : <Moon />}`), values, or conditionals. These become `if (dark) return <Sun /> else return <Moon />` early returns, or stay as ternaries but read from `useTheme()` instead of a prop. The icon and value ternaries are not class strings; they keep their shape.

### 4g. Test for the hook

New file `src/hooks/useDarkMode.test.ts`. Four assertions in 1 describe block:

```ts
import { renderHook, act } from '@testing-library/react';
import { useDarkMode } from './useDarkMode';

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to false on a fresh load', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe(false);
  });

  it('reads persisted value from localStorage on init', () => {
    localStorage.setItem('vastuplan-darkmode', 'true');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe(true);
  });

  it('toggles document.documentElement.classList.dark on change', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current[1]());
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    act(() => result.current[1]());
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists the new value to localStorage on change', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current[1]());
    expect(localStorage.getItem('vastuplan-darkmode')).toBe('true');
    act(() => result.current[1]());
    expect(localStorage.getItem('vastuplan-darkmode')).toBe('false');
  });
});
```

The tests use `@testing-library/react` (already a devDependency, used by `useCanvasDrag.test.ts` and others).

**Test count after theme commit: 152 → 156.**

### 4h. Validation per the design

After Commit 2, before committing:

1. `npm run dev` and load `http://localhost:5173`
2. Click the dark-mode toggle in `<Header>` — confirm the whole UI flips, including the 7 components that already had `dark:` classes (they now work for the first time)
3. Reload the page — confirm the preference persists
4. Open DevTools → Elements → `<html>` — confirm the `dark` class is being added/removed
5. Eyeball each major region in both modes for visual sectioning (header / sidebar / canvas / properties panel should look distinct, not flat)
6. `npm test` + `npm run lint` + `npm run build` all pass

If any component looks broken in dark mode, **revert just that component** to the ternary style and add a `// TODO(theme-migration): revisit` comment. Don't ship a broken visual.

### 4i. What this does NOT do (YAGNI)

- No `prefers-color-scheme: dark` auto-detection. The user picks explicitly.
- No third "auto" or "system" mode. The toggle is binary.
- No design-token extraction (CSS custom properties for `--color-bg-primary` etc.). Tailwind utilities are the token system.
- No `tailwind.config.js` (Tailwind v4 doesn't need one; config is in CSS).
- No new top-level component for `<ThemeSwitcher>`. The toggle button in `<Header>` is the only switcher and stays in `<Header>`.
- No tests for individual component migrations (the 83 sites). The 4 hook tests + manual dev-server verification is the safety net.

---

## 5. Doc sweep

### 5a. New `CLAUDE.md` at the repo root

≤200 lines, structured as:

```markdown
# VastuPlan 2D — Claude Guide

> Loaded automatically by Claude Code, Copilot CLI, and the Claude API
> when working in this repo. Keep under 200 lines. Deep-dive docs are
> linked, not inlined.

## What this is

- VastuPlan 2D: React 19 + Vite 6 + Tailwind v4 SPA for Indian home
  design with Vastu compliance scoring. TypeScript strict. Optional
  Socket.io collab server in `server/`. See README.md.
- Version 0.1.0 (alpha). Production: Vercel (auto-deploys on push to main).

## Dev environment

- `npm run dev` / `test` / `lint` / `build`. Node >=20 (.nvmrc).
- CI: lint + tsc + prettier + vitest + build + audit on every PR
  (.github/workflows/ci.yml). Snyk step removed in PR #40.

## Git / repo

- `origin` = `willowvibe/Home-vastu-plan` (active mirror).
- `harishconti/Home-vastu-plan` is stuck at April 2026 — don't push there.
- Branch off `main`. PR + green CI is the only path to merge. Don't
  force-push to `main` or `willowvibe/*` branches.
- Conventional commits: feat:, fix:, chore:, test:, docs:, refactor:.

## Conventions

- TypeScript strict, no new deps without justification, tests-with-change.
- Where things live: see memory/naming-and-paths.md.
- Tests live next to source as \*.test.ts(x). Run with `npm test -- --run`.
- Tailwind v4: config is in src/index.css, not tailwind.config.js.
  `dark:` variant enabled via @custom-variant — see memory/theme-notes.md.

## Known issues

- P0/P1: all resolved. P1 backlog: B-8 (multi-select rooms). P2: S-1
  (split App.tsx, 8-12h), S-4 (Vastu matrix property tests, 4h).
  See docs/KNOWN_ISSUES.md and docs/CODE_REVIEW.md.

## Things future Claude should know

- App.tsx is 1,851 lines. S-1 will split it. Coordinate before starting
  a 1,000+-line diff — its own branch.
- Wall thickness is in INCHES, not feet. Snap-to-grid is 1ft; sub-grid
  drag is 0.1ft. The useCanvasDrag hook early-returns on null
  canvasRef.current — silent. See memory/vital-pitfalls.md.
- Light/dark theme: useTheme() hook + dark: Tailwind variant. Section
  shades per memory/theme-notes.md (don't make everything the same color).
- Deployed to Vercel via Git integration. willowvibe org admin did the
  one-time UI setup. Per-PR previews + main→Prod are automatic.
  See memory/vercel-deployment-shipped.md.
```

(Plus a few more lines as needed; final form ≤200 lines, written at implementation time.)

### 5b. `CHANGELOG.md` updates

Add a new dated entry above the existing `0.1.0` section:

```markdown
## [Unreleased] — 2026-06-12

### Added

- Vercel deployment via Git integration (vercel.json + README pointer).
  Every push to main → Production; every PR → Preview URL.
- New `formatFloor()` helper in `src/constants/floorPlanConstants.ts`.
  Floor labels now use ordinals: `0th / 1st / 2nd / …`.

### Changed

- **Theme system refactor:** migrated 83 ternary class strings to
  Tailwind v4's `dark:` variant. New `useDarkMode()` hook +
  `<ThemeProvider>` context. `<html class="dark">` toggles the whole
  app. Section-specific light/dark shades for visual sectioning
  (header / sidebar / canvas / properties / modals each get their
  own shade).
```

### 5c. `docs/CODE_REVIEW.md` updates

- Bump the "Last updated" header to **2026-06-12 (post PRs #45, #46, #47 + Vercel deploy + theme refactor on this branch)**
- In §6, mark the theme-system item as **Resolved** (it was the "light/dark theme is implemented twice" issue — see `code-review-bugs.md` for context). Add a one-line "Resolved in post-deploy polish" note.
- Update the "P2 backlog" counts if they've shifted (they shouldn't, but the dates are stale).

### 5d. `docs/KNOWN_ISSUES.md` updates

- Bump the "Last updated" header to match.
- In the "Recently Resolved" section, add a row for the post-deploy-polish batch (Vercel + floor + theme).

### 5e. Persistent memory updates

- `/home/harish/.claude/projects/-mnt-data2-git-repos-Home-vastu-plan/memory/MEMORY.md`:
  - Add a top-level pointer to `CLAUDE.md` (since the memory index is the entry point for the memory subsystem, and `CLAUDE.md` is the entry point for the repo).
  - Update `active-branches.md` reference to reflect the new `fix/post-deploy-polish` branch.
- `active-branches.md`:
  - Bump `main`'s hash to whatever it is after the Vercel PR merges (we don't know yet — the spec is being written before that PR lands; the memory update will happen after the PR merges).
  - Add `fix/post-deploy-polish` to the "pushed, awaiting PR" list.
  - Remove `fix/vercel-deployment` from the list once its PR is merged.
- `vercel-deployment-shipped.md`:
  - Bump status to MERGED (after the user confirms the PR is merged).
- Create new memory file `theme-system-refactored.md` describing the new design (one paragraph + "How to apply" for future Claude sessions).

---

## 6. Validation (the post-implementation checklist)

| Check                   | Command                            | Expected                                                                                                           |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Tests pass              | `npm test -- --run`                | 156/156 (was 151; +1 for `formatFloor`, +4 for `useDarkMode`)                                                      |
| Lint clean              | `npm run lint`                     | 0 errors, 58 warnings (baseline; the existing 35 `any` warnings + 21 carried over + 2 originally pre-existing)     |
| Build succeeds          | `npm run build`                    | Exit 0; `dist/sw.js`, `dist/index.html`, `dist/assets/index-[hash].{js,css}` all emitted                           |
| Dark mode toggle works  | `npm run dev`, click toggle        | Whole UI flips; `<html class="dark">` toggles; preference persists on reload                                       |
| Section-specific shades | `npm run dev`, eyeball             | Header / sidebar / canvas / properties / modals each have a distinct shade in both light and dark                  |
| Floor labels            | `npm run dev`, open floor selector | Shows `0th / 1st / 2nd`; "Clear all rooms on X floor?" uses `0th / 1st / 2nd`; print header uses `0th / 1st / 2nd` |
| `CLAUDE.md` readable    | open the file in an editor         | ≤200 lines; covers conventions, pitfalls, deploy state                                                             |
| Vercel preview          | push the branch                    | PR preview URL works; both light and dark modes look right in the preview                                          |

---

## 7. Failure modes

| Symptom                                                                   | Likely cause                                                                                                                         | Fix                                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `npm run build` fails with "tsc: cannot find useDarkMode"                 | Hook not yet created or import path wrong                                                                                            | Check that `src/hooks/useDarkMode.ts` exists and exports the function                                               |
| Dark mode toggle does nothing in the browser                              | `<ThemeProvider>` not wrapping the app                                                                                               | Check `src/main.tsx` (or root) — verify the wrap                                                                    |
| Some `dark:` classes still don't paint                                    | Component was migrated but its parent doesn't propagate the `darkMode` state (should be impossible after the context refactor, but…) | Verify the component uses `useTheme()` and not a stale prop                                                         |
| Section-specific shades look wrong in one region                          | Mismatch between the table in §4f and the actual code                                                                                | The migration is mechanical — re-check the source against the table                                                 |
| Floor labels show "0th / 1st / 2nd" but the 4th ternary site is still old | Missed a call site in `App.tsx`                                                                                                      | Re-grep for `Ground\|First\|Second`; should return nothing outside this spec's history                              |
| Vercel preview is stuck in light mode                                     | The CSS line `@custom-variant dark` didn't make it into the build                                                                    | Verify `src/index.css` has the line; `npm run build`; check `dist/assets/index-*.css` contains `dark` variant rules |

---

## 8. Out of scope

- **`prefers-color-scheme: dark` auto-detection.** The user picks explicitly. Adding this is a follow-up.
- **A third "auto" or "system" theme.** Not requested. YAGNI.
- **Design-token extraction** (CSS custom properties for `--color-bg-primary` etc.). Tailwind utilities are the token system. Adding a parallel token system would be redundant.
- **A `tailwind.config.js`.** Tailwind v4 config lives in CSS.
- **A `<ThemeSwitcher>` component** with a dropdown for theme choice. The toggle in `<Header>` is sufficient.
- **Lighthouse / performance audits on every PR.** Already a Vercel-UI possibility, deferred.
- **Tests for individual component migrations.** The 4 hook tests + manual dev-server verification is the safety net. Adding 83 component tests for "this className has `dark:foo`" would be busywork.
- **Re-organizing the `App.tsx` 1,851-line file.** That's S-1 (a separate batch, 8-12h). Out of scope here.
- **Updating the public `harishconti/Home-vastu-plan` repo** (which is stuck at April 2026). The mirror is the active one.

---

## 9. Open questions

None. The four design decisions (theme depth, floor wording, doc sweep scope, branching) and the two follow-up clarifications (light palette = section-specific shades, dark palette = match the section tints) were resolved before this spec was written.

---

## 10. Implementation order

The actual implementation is three commits, in this order, on the branch `fix/post-deploy-polish` (created off `origin/main @ 99b8bf1`):

1. **Commit 1 — `chore(ui): rename floor labels to ordinals (formatFloor helper)`:**
   - Add `formatFloor()` to `src/constants/floorPlanConstants.ts`
   - Replace 4 ternary sites in `src/App.tsx`
   - Update 1 comment in `src/types.ts`
   - Add `src/constants/floorPlanConstants.test.ts` (15 assertions)
   - **Validation:** `npm test` (151→152), `npm run lint`, `npm run build`

2. **Commit 2 — `refactor(theme): migrate to Tailwind dark: variant + section-specific shades`:**
   - Add the `@custom-variant dark` line to `src/index.css`
   - Create `src/hooks/useDarkMode.ts` + `src/hooks/useDarkMode.test.ts` (4 assertions)
   - Create `src/contexts/ThemeContext.tsx`
   - Wrap root in `<ThemeProvider>`
   - Delete `darkMode` state + `useEffect` from `App.tsx`
   - Migrate Header + LayerManager prop interfaces (drop 2 props each)
   - Migrate 83 ternaries across 15+ files to `dark:` variant + section-specific shades
   - **Validation:** `npm run dev` (eyeball each region in both modes), `npm test` (152→156), `npm run lint`, `npm run build`

3. **Commit 3 — `docs(sync): refresh post-PR-#47 / post-Vercel / post-theme-fix state + CLAUDE.md`:**
   - Create `CLAUDE.md` (≤200 lines)
   - Update `CHANGELOG.md`, `docs/CODE_REVIEW.md`, `docs/KNOWN_ISSUES.md`
   - Update `/home/harish/.claude/projects/-mnt-data2-git-repos-Home-vastu-plan/memory/MEMORY.md` and `active-branches.md`
   - Create new memory file `theme-system-refactored.md`
   - **Validation:** Prettier clean, no broken links in `CLAUDE.md` (spot-check)

The implementation plan (from the `writing-plans` skill) will spell out the exact diff and per-step validation.
