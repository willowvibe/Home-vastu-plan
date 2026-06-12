# VastuPlan 2D — Claude Guide

> Loaded automatically by Claude Code, Copilot CLI, and the Claude API when working in this repo. Keep under 200 lines. Deep-dive docs are linked, not inlined.

## What this is

- VastuPlan 2D: React 19 + Vite 6 + Tailwind v4 SPA for Indian home design with Vastu compliance scoring. TypeScript strict. Optional Socket.io collab server in `server/`. See [README.md](./README.md).
- Version 0.1.0 (alpha). Production: Vercel (auto-deploys on push to main).

## Dev environment

- `npm run dev` / `test` / `lint` / `build`. Node >=20 (see `.nvmrc`).
- CI: lint + tsc + prettier + vitest + build + audit on every PR ([ci.yml](./.github/workflows/ci.yml)). Snyk step removed in PR #40.

## Git / repo

- `origin` = `willowvibe/Home-vastu-plan` (the active mirror).
- `harishconti/Home-vastu-plan` is stuck at April 2026 — don't push there.
- Branch off `main`. PR + green CI is the only path to merge. Don't force-push to `main` or `willowvibe/*` branches.
- Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`.

## Conventions

- TypeScript strict, no new deps without justification, tests-with-change.
- Where things live: types in `src/types/`, hooks in `src/hooks/`, services in `src/services/`, constants in `src/constants/`, components in `src/components/` (with subdirs `canvas/` and `layout/`), contexts in `src/contexts/`.
- Tests live next to source as `*.test.ts(x)`. Run with `npm test -- --run`.
- Tailwind v4: config is in `src/index.css`, not `tailwind.config.js`. The `dark:` variant is enabled via `@custom-variant dark (&:where(.dark, .dark *));` near the top of `index.css` and toggled by the `<html class="dark">` attribute. Don't add a `tailwind.config.js` — config-in-CSS is the v4 idiomatic way.
- The test setup file (`src/test/setup.ts`) installs a `vi.fn()`-based `localStorage` mock. Tests that need real `localStorage` persistence must install their own shim in the test file (see `src/hooks/useDarkMode.test.ts` for the pattern).

## Theme system

- `useTheme()` from `src/contexts/ThemeContext.tsx` returns `{ darkMode, toggle }`. Read it from any component instead of threading `darkMode` as a prop.
- Section-specific shades (per the post-deploy-polish spec):
  - Page background: `bg-slate-50 dark:bg-slate-900`
  - Top header: `bg-slate-100 dark:bg-slate-800`
  - Sidebar: `bg-white dark:bg-slate-900`
  - Properties panel: `bg-slate-50 dark:bg-slate-900`
  - Canvas frame: `bg-white dark:bg-slate-800`
  - Modal / dialog: `bg-white dark:bg-slate-800`
  - Form input: `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600`
  - Tooltip / popover: `bg-white dark:bg-slate-700`
- Use the `dark:` variant for theming. Don't reintroduce the `darkMode ? X : Y` ternary pattern — it's a maintenance smell.

## Known issues

- P0/P1: all resolved. P1 backlog: **B-8** (multi-select rooms with shift+click). P2: **S-1** (split `App.tsx` into Sidebar / Properties / Toolbar modules, 8-12h), **S-4** (property tests for the Vastu matrix, 4h). See [KNOWN_ISSUES.md](./docs/KNOWN_ISSUES.md) and [CODE_REVIEW.md](./docs/CODE_REVIEW.md).

## Things future Claude should know

- `App.tsx` is ~1,850 lines. **S-1 will split it.** Coordinate with the user before starting a 1,000+-line diff — its own branch.
- Wall thickness is in **inches**, not feet. Snap-to-grid is 1ft; sub-grid drag is 0.1ft. The `useCanvasDrag` hook early-returns on null `canvasRef.current` — silent. See [vital-pitfalls.md](./memory/vital-pitfalls.md).
- Floor labels are ordinals: `0th`, `1st`, `2nd`, …. Use `formatFloor(n)` from `src/constants/floorPlanConstants.ts`, not a hardcoded `Ground / First / Second` ternary.
- Deployed to Vercel via Git integration. `willowvibe` org admin did the one-time UI setup. Per-PR previews + main→Prod are automatic. See [vercel-deployment-shipped.md](./memory/vercel-deployment-shipped.md).
- The theme system uses `<html class="dark">` + Tailwind's `dark:` variant. Don't use the JS `prefers-color-scheme: dark` media query — the user wants the toggle to win.
