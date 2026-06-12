# Next-Batch Work Plan — 2026-06-11 (post PR #44)

> **Status (2026-06-11):** Draft for the next concrete batch of fixes after the P2 hygiene batch shipped in PR #44. Source of truth for backlog: `docs/CODE_REVIEW.md` §6 and `docs/KNOWN_ISSUES.md`.

## TL;DR

Recommended **next batch** (≤ 1 day, low-risk, ≤ 5 commits):

| ID   | Title                                                                         | Effort | Risk    |
| ---- | ----------------------------------------------------------------------------- | ------ | ------- |
| S-8  | Move geometry constants (TOLERANCE, wall defaults) to `constants/geometry.ts` | 1 h    | Low     |
| S-12 | Replace `catch (error: any)` with `catch (error: unknown)` + type narrowing   | 2 h    | Low     |
| Q-9  | Share `PlanUpdateEvent` type between client and server                        | 2 h    | Low     |
| Q-12 | Split `src/lib/exports.ts` (158 lines, 5 concerns) into 5 files               | 3 h    | Low-Med |
| S-3  | Replace `setPlan` with a single `updatePlan` API                              | 2 h    | Low     |

Total: **~10 h.** These are all refactors / type-tightening. No behavior change expected. Sets the stage for the bigger follow-ups:

| ID      | Title                                                                            | Effort |
| ------- | -------------------------------------------------------------------------------- | ------ |
| **B-8** | **Shift+click advertised but does nothing (no marquee select)** — last P1        | 2 h    |
| S-1     | Split `App.tsx` (1,839 lines) into Sidebar / Properties / Toolbar / hook modules | 8-12 h |
| Q-1     | Add Vitest tests for `useCanvasDrag`                                             | 6 h    |
| Q-2     | Add Vitest tests for `useFloorPlan` history                                      | 3 h    |
| Q-3     | Add Vitest tests for `useCollaboration` socket lifecycle                         | 4 h    |
| S-4     | Add property tests for Vastu ideal-direction matrix                              | 4 h    |
| Q-4     | Extend E2E coverage (multi-floor, drag, undo, share)                             | 6-10 h |

## The recommended batch in detail

### 1. S-8 — Geometry constants → `src/constants/geometry.ts` (1 h)

**Why first:** Trivially mechanical, unblocks S-1 (App.tsx split) and any future refactor that needs to touch the wall-thickness defaults.

**Changes:**

- Create `src/constants/geometry.ts` with: `TOLERANCE = 0.1`, `WALL_DEFAULTS = { partition: 0.375, internal: 0.5, standard: 0.75, external: 1.0, loadBearing: 1.166 }` (in feet — see [[vital-pitfalls]]), `SNAP_GRID_FT = 1`, `SNAP_GRID_SUB_FT = 0.1`, `MIN_ROOM_SIZE_FT = 1`, `MAX_ROOM_SIZE_FT = 100`.
- Replace hard-coded values in `useCanvasDrag.ts`, `Room.tsx`, and any sidebar input defaults.
- Add a one-line `// units: feet, unless suffixed `\_M` then meters` comment at the top.

**Test:** Add a `geometry.test.ts` to assert the constant values (regression catcher).

### 2. S-12 — `catch (error: any)` → `catch (error: unknown)` (2 h)

**Why second:** Easiest win, makes the ESLint warning a real rule, and exposes a few real bugs where the `message` access assumed `any`.

**Changes:**

- In `App.tsx` (5+ occurrences: `handleShare`, `handleImportJSON`, `handleExportPDF`, etc.), `lib/exports.ts`, `server/src/index.ts`: switch to `catch (error: unknown) { if (error instanceof Error) { ... } else { ... } }`.
- Add `@typescript-eslint/no-explicit-any: 'error'` to `eslint.config.js` (currently off).
- For each site that was passing `error.message` to a toast, add a `(error as Error).message ?? 'Unknown error'` fallback (or use the new pattern).

**Test:** Existing tests should pass; new lint will catch any new `any`.

### 3. Q-9 — Share `PlanUpdateEvent` type (client + server) (2 h)

**Why third:** Currently the client and server have duplicate type defs (`src/types.ts:81-88` and `server/src/index.ts:54-60`). Drift will eventually bite. Server has no `tsc` in CI (see S-24) so the type would silently rot.

**Changes:**

- Create `shared/types/collab.ts` (or use the existing `src/types.ts` for client and have the server `import` from `../src/types.ts`).
- Update both sides to import the shared type.
- Add a tiny `shared/package.json` with `"main": "types.ts"` and `tsc --noEmit` so the server tsc CI can check it.

**Test:** The server `tsc` step (when added) will catch drift.

### 4. Q-12 — Split `src/lib/exports.ts` (3 h)

**Why fourth:** The file mixes 5 concerns (PNG, SVG, PDF, share-link, print) and is 158 lines. Splitting it surfaces shared helpers and makes the public API clearer.

**Changes:**

- Create `src/lib/exportPng.ts`, `src/lib/exportSvg.ts`, `src/lib/exportPdf.ts`, `src/lib/shareLink.ts`, `src/lib/printPlan.ts`.
- Move the existing functions into the appropriate file.
- Add a barrel `src/lib/exports.ts` that re-exports for backward compatibility (or update all call sites to import from the new files — check call sites first).
- `shareLink.ts` gets a unit test for the `compressPlan` / `decompressPlan` round-trip.

**Test:** Round-trip test for `shareLink`. The other modules' tests will need to move with them.

### 5. S-3 — `setPlan` → `updatePlan`-only API (2 h)

**Why last in this batch:** Slightly higher risk because it touches call sites throughout `App.tsx`. But the public-surface change is small.

**Changes:**

- Remove `setPlan` from the public return of `useFloorPlan`.
- Update all `setPlan(x)` call sites in `App.tsx` to `updatePlan(() => x)` or, better, refactor each site to be functional.
- If any site was relying on a non-functional update, change it to functional (and add a test if it's a tricky one).

**Test:** Existing `useFloorPlan.test.ts` (Q-2, not yet written) would catch this. Add at least one structural test that asserts `setPlan` is not in the public API of the hook.

## Branching + PR plan

- Branch: `fix/p2-refactor-batch` off `main @ bf2c214`.
- Commit order matches the table above (smallest first to keep bisect clean).
- 1 PR. Title: `refactor: S-8 + S-12 + Q-9 + Q-12 + S-3 (P2 batch)`. Body: list each item with the `CODE_REVIEW.md` link.
- Validation: `npm run lint` (0 errors expected — the 2 pre-existing warnings stay), `npm test` (55 + new tests), `npm run build`, `npm run test:coverage` (no regression).
- Docs commit at the end: mark all 5 items as `Resolved` in `KNOWN_ISSUES.md`, `CODE_REVIEW.md`, `CHANGELOG.md [Unreleased]`.

## What we're explicitly NOT doing in this batch

- **S-1 (App.tsx split)** is 8-12 h and a 1000+-line diff. Better as its own branch with its own review, or batched with S-3 (already in this PR) into a "refactor" PR.
- **B-8 (shift+click marquee)** is a design call (marquee select vs. explicit modifier + click) — the user should decide before code.
- **Q-1 / Q-2 / Q-3 (test coverage)** is 13 h combined. Should be its own batch, or pair with S-1 (test what you refactor).
- **S-4 (Vastu property tests)** is easy and ~4 h; could be a fast follow-up.

## Estimated calendar time

| Phase                   | Wall-clock |
| ----------------------- | ---------- |
| Read CODE_REVIEW + plan | 30 min     |
| S-8 (constants)         | 1 h        |
| S-12 (catch unknown)    | 2 h        |
| Q-9 (shared types)      | 2 h        |
| Q-12 (split exports)    | 3 h        |
| S-3 (updatePlan API)    | 2 h        |
| Docs commit             | 30 min     |
| Total (1 day, 1 PR)     | ~10 h      |

## How to use this plan

1. Read the CODE_REVIEW.md entries for each ID before starting.
2. Create the branch: `git checkout -b fix/p2-refactor-batch`.
3. Implement S-8 first (mechanical, low risk). Verify `npm test` + `npm run lint`.
4. Then S-12 (lint rule change is the loudest part). Verify lint.
5. Q-9 next (cross-package change).
6. Q-12 (file split + barrel re-exports).
7. S-3 last (call-site refactor).
8. Add a single docs commit at the end.
9. Open the PR. Expect the coverage threshold (Q-5) to either pass or need a tiny bump.
