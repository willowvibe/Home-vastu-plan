# Known Issues & Improvements

> **Status:** Living tracker for the highest-priority items from `docs/CODE_REVIEW.md`.
> **Source of truth for "what's next":** the triage table at the bottom of `CODE_REVIEW.md`.
> **Last updated:** 2026-06-11

## Quick links

- Full review: [docs/CODE_REVIEW.md](./CODE_REVIEW.md)
- Architecture: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- E2E status: [memory/e2e-tests-completed.md](../memory/e2e-tests-completed.md)

---

## ✅ Recently Resolved

> The P0 sweep shipped in PR #28 ([merge commit `22224ac`](https://github.com/willowvibe/Home-vastu-plan/pull/28)) on 2026-06-08. All 9 P0 bugs from the 2026-06-07 review are now fixed. The full per-bug change log is in [`CHANGELOG.md`](../CHANGELOG.md) under `[Unreleased]`. Per-bug commit refs:

| ID   | Title                                                              | Fix commit                                 | Notes                                                                                 |
| ---- | ------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| B-1  | `useCollaboration` reconnects socket on every `plan` change        | `5c579e8`                                  | Stable deps on the socket effect; latest plan/userId read from refs.                  |
| B-2  | `applyRemoteUpdate` uses stale `plan` closure                      | `5c579e8`                                  | Functional `onPlanChange` setter; closes the stale-closure window.                    |
| B-5  | View/comment mode does not lock the entire UI                      | `6dda15e`, `e0c3df2`, `6608c72`, `85a234e` | Keyboard + drag + Canvas plumbing + App.tsx gates; `AppMode` extracted to `types.ts`. |
| B-10 | Shared-link URL never cleared — refresh silently reverts edits     | `85a234e`                                  | `history.replaceState` in `finally`; covered by Playwright `bb2c44c`.                 |
| B-11 | `OfflineIndicator` SVG path is malformed                           | `1c0686e`                                  | Replaced with `lucide-react` `WifiOff`.                                               |
| S-5  | Analytics reads `process.env.REACT_APP_*` (Vite-incompatible)      | `dbd6f4a`, `51190e4`                       | Reads `import.meta.env.VITE_ANALYTICS_*`; `.env.example` updated.                     |
| S-7  | Sentry `setUser` / `addBreadcrumb` on un-initialized Sentry in dev | `9f4b7a4`                                  | `isSentryInitialized()` guard added; public helpers no-op until init.                 |
| S-10 | `(window as any).showToast?.(...)` is a silent no-op               | `85a234e`                                  | `useToast()` hook in `App`; `<ToastProvider>` moved to `main.tsx`.                    |
| S-15 | `PresentationExport` logo upload doesn't validate MIME             | `7d0b359`                                  | Magic-byte sniff (PNG / JPEG) + 5 MB cap + error toast.                               |

Also fixed in the same PR: **Q-1** — `AppMode` string union extracted to `src/types.ts` (`7f3a0ad`).

**No regressions** in `npm run lint`, `npm test` (25/25), `npm run test:e2e` (8/8), or `npm run build`.

---

## 🔴 P0 — Fix now (data loss / correctness)

_All P0 items from the 2026-06-07 sweep are resolved. The next P0 will be filed here when a new severity-P0 bug is identified._

---

## 🟠 P1 — Fix this sprint (robustness)

| ID  | Title                                                       | File(s)                                             | Effort |
| --- | ----------------------------------------------------------- | --------------------------------------------------- | ------ |
| B-8 | Shift+click advertised but does nothing (no marquee select) | `src/components/Canvas.tsx:87-103`, `Header.tsx:94` | 2 h    |

---

## 🟡 P2 — Refactor (health)

| ID   | Title                                                                            | File(s)                               | Effort |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------- | ------ |
| S-1  | Split `App.tsx` (1,839 lines) into Sidebar / Properties / Toolbar / hook modules | `src/App.tsx`                         | 8-12 h |
| S-3  | Replace `setPlan` with a single `updatePlan` API                                 | `src/hooks/useFloorPlan.ts`           | 2 h    |
| S-4  | Add property tests for Vastu ideal-direction matrix                              | `src/services/vastu.ts`               | 4 h    |
| S-8  | Move geometry constants (TOLERANCE, wall defaults) to `constants/geometry.ts`    | multiple                              | 1 h    |
| S-12 | Replace `catch (error: any)` with `catch (error: unknown)` + type narrowing      | multiple                              | 2 h    |
| Q-2  | Add Vitest tests for `useFloorPlan` history                                      | `src/hooks/useFloorPlan.ts`           | 3 h    |
| Q-3  | Add Vitest tests for `useCollaboration` socket lifecycle                         | `src/hooks/useCollaboration.ts`       | 4 h    |
| Q-9  | Share `PlanUpdateEvent` type between client and server                           | `src/types.ts`, `server/src/index.ts` | 2 h    |
| Q-12 | Split `src/lib/exports.ts` (158 lines, 5 concerns) into 5 files                  | `src/lib/exports.ts`                  | 3 h    |

**Subtotal:** ~27 h

---

## 🟢 P3 — Polish (DX / features)

Selected items; see full list in `docs/CODE_REVIEW.md` §5.

- G-1, G-2, G-7 (multi-user undo, duplicate floor, arrow-key nudge)
- G-12 (replace `(window as any).showToast` with real API)
- Q-4 (extend E2E coverage)
- Q-18 (sync `CHANGELOG.md` to actual `VERSION` = `0.1.0`)

---

## ✅ Recently Resolved (P1 batch)

> The first P1 batch shipped in this branch (`fix/p1-quick-wins`). 4 of the 10 P1 items are fixed. Per-bug commit refs:

| ID   | Title                                                    | Fix commit   | Notes                                                                                |
| ---- | -------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| B-3  | "Clear floor" uses captured `plan` instead of functional | _on this PR_ | `updatePlan((prev) => ...)` + drops the now-unused `setPlan` import.                 |
| B-7  | Ruler distance label hard-coded to `' ft`                | _on this PR_ | `RulerOverlay` accepts `unit`; converts ft→m at 0.3048. Also fixes B-14 (half-foot). |
| S-16 | `ProjectManager` `localStorage.setItem` not in try/catch | _on this PR_ | Wraps setItem; toast for `QuotaExceededError` (and any other DOMException).          |
| B-17 | Dark mode + `prose-slate` produces white-on-white panel  | _on this PR_ | `dark:prose-invert` on the analysis panel container.                                 |

**No regressions** in `npm run lint`, `npm test` (33/33, +8 new), or `npm run build`.

---

## ✅ Recently Resolved (P1 batch #2)

> The second P1 batch shipped on branch `fix/p1-batch-2`. 5 of the remaining 6 P1 items and 1 P2 item are fixed. Per-bug commit refs:

| ID   | Title                                                                            | Fix commit | Notes                                                                                                                              |
| ---- | -------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| S-2  | Three `useEffect` dep arrays ignored (collaboration, App share loader)           | `eb58370`  | Resolved-by-design. The two remaining disables (App.tsx:182, Room.tsx:56) are load-bearing; structural test pins the count.        |
| S-9  | `useCanvasDrag` element placement uses full wall thickness for shared-wall rooms | `09ac625`  | New `getEffectiveWalls(room, otherRooms)` helper; element-drag uses per-side effective walls (shared = `wallFt/2`).                |
| S-17 | `Onboarding` modal lacks `aria-modal` and focus trap                             | `32497a0`  | Full WAI-ARIA dialog: `role`/`aria-modal`/`aria-labelledby`, Esc-to-close, Tab/Shift+Tab focus trap, focus restore on close.       |
| S-21 | Pick one of Sentry.ErrorBoundary vs custom ErrorBoundary (nested)                | `a8ab03f`  | Dropped `Sentry.ErrorBoundary`; the custom one already calls `captureError` in `componentDidCatch`, so was double-reporting.       |
| Q-10 | Extract `AppMode` type to a single source of truth                               | `84cbaf8`  | `Header.tsx` now imports `AppMode` from `../../types` (was the last offender; `src/types.ts:146` was already the source of truth). |

**No regressions** in `npm run lint`, `npm test`, or `npm run build`. New tests: `useCanvasDrag.test.ts` (+4), `useCollaboration.test.ts` (S-2 structural), `Onboarding.test.tsx` (extended to 4 cases).

---

## ✅ Recently Resolved (P2 hygiene batch)

> The P2/P3 hygiene batch shipped on branch `fix/p2-hygiene-batch`. 7 P2/P3 items fixed: S-22 (proper CACHE_NAME bump), Q-5 (coverage thresholds), Q-6 (allowJs), Q-7+Q-14 (re-include sw.ts + setup.ts in tsc), Q-15 (drop 3 unused deps), Q-20 (Node engine), Q-25 (VITE_GEMINI_API_KEY). Also resolves the missed S-21 row from the P1 batch #2 docs (the code change shipped then; the doc row was missed). Per-bug commit refs:

| ID   | Title                                                                              | Fix commit | Notes                                                                                                                                                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-21 | Pick one of Sentry.ErrorBoundary vs custom ErrorBoundary (nested)                  | `a8ab03f`  | Shipped in P1 batch #2 (commit `a8ab03f`); missed from the previous docs sweep. Now closed.                                                                                                                                                                      |
| S-22 | Service worker `CACHE_NAME` should bump on deploys                                 | `b3507ca`  | Per-deploy SHA-256 of `index.html` injected via Vite `define` → `__VASTUPLAN_CACHE_NAME__`. Also fixes a latent bug: the SW was never bundled in production (only served from dev), so users never got a SW. Now bundled to `dist/sw.js` and registered in prod. |
| Q-5  | Add coverage thresholds to `vitest.config.ts` (70% lines)                          | `3d9e050`  | v8 provider, text+html reporter, thresholds set just below the current measured coverage so the gate doesn't fail CI. Tighten in a follow-up.                                                                                                                    |
| Q-6  | `tsconfig.json` has `allowJs: true` but no `.js` files in `src/`                   | `5995965`  | Dropped the unused option.                                                                                                                                                                                                                                       |
| Q-7  | `tsconfig.json` excludes `src/services/sw.ts` from type-checking                   | `2d46c40`  | Re-included in tsc. SW typed properly now (addEventListener overloads pick up ExtendableEvent / FetchEvent via `ServiceWorkerGlobalScope` cast).                                                                                                                 |
| Q-14 | `tsconfig.json` lists `src/test/setup.ts` in `exclude` but `vitest.config` uses it | `2d46c40`  | Re-included; added `types: ["vitest/globals"]` so `vi`, `afterEach`, `expect.extend` are typed.                                                                                                                                                                  |
| Q-15 | `package.json` has `motion` + `autoprefixer` but no usage in source                | `83c3c42`  | Also dropped `@sentry/tracing` (already replaced by `@sentry/react` built-in tracing per S-5). 12 packages removed from `node_modules`.                                                                                                                          |
| Q-20 | `package.json` doesn't declare Node engine version                                 | `d21eaed`  | `engines.node: ">=20.0.0"` + `.nvmrc` (20).                                                                                                                                                                                                                      |
| Q-25 | `gemini.ts` reads `process.env.GEMINI_API_KEY` instead of Vite's `import.meta.env` | `4bd8a94`  | Flipped precedence to `import.meta.env.VITE_GEMINI_API_KEY`; added type augmentation in `src/vite-env.d.ts`.                                                                                                                                                     |

**No regressions** in `npm run lint`, `npm test` (55/55, +4 S-22 hash tests), or `npm run build`. CI must now also pass the new coverage threshold gate.

---

## ✅ Recently Resolved (Test coverage batch — Q-1)

> The 2026-06-11 test-coverage batch (Q-1) shipped on branch `fix/q-1-use-canvas-drag-tests` (pending PR). 1 P2 item fixed (Q-1: `useCanvasDrag` behavioural tests). The remaining P2 hooks-test work (Q-2, Q-3) is still on the backlog. Per-bug commit refs:

| ID  | Title                                | Fix commit | Notes                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Add Vitest tests for `useCanvasDrag` | `3a1c0c9`  | Three new describe blocks: room drag (snap-to-grid 1ft / 0.1ft, plot-bounds clamp, same-floor collision clamp x/y, other-floor rooms ignored, pointerup lifecycle), room resize (SE/SW handles, 2ft min, plot clamp, pointerup), element drag (`draggingElement` state, half-foot rounding, inner-room clamp, Door opening overhang, pointerup). The 4 pre-existing B-5 + S-9 tests are retained. |

**No regressions** in `npm run lint` (0 errors, 2 pre-existing warnings unchanged), `npm test` (78/78, +23 new), or `npm run build`.

---

## Triage (mirroring `CODE_REVIEW.md` §6)

| Bucket | Items | Effort  | Status                           |
| ------ | ----- | ------- | -------------------------------- |
| P0     | 0     | —       | ✅ All resolved (PR #28)         |
| P1     | 1     | ~2 h    | 🟡 5 resolved (#43), 1 remaining |
| P2     | 9     | ~27 h   | 🟡 1 resolved (Q-1), 9 remaining |
| P3     | many  | ongoing | 🔲 Not started                   |

See [✅ Recently Resolved](#-recently-resolved) above for P0 commit refs, [✅ Recently Resolved (P1 batch #2)](#-recently-resolved-p1-batch-2) above for the P1 batch #2 fixes, [✅ Recently Resolved (P2 hygiene batch)](#-recently-resolved-p2-hygiene-batch) above for that batch, and [✅ Recently Resolved (Test coverage batch — Q-1)](#-recently-resolved-test-coverage-batch--q-1) above for Q-1.

**Suggested next batch:** **Q-2 + Q-3** (remaining untested complex hooks, 7 h combined) or **S-3 + S-8 + S-12** (the smallest structural refactor trio, 5 h combined).

## How to use this document

1. Pick an item from the table.
2. Create a branch: `git checkout -b fix/b-1-collab-socket-reconnect`.
3. Update the `Status` column to `🟡 In progress` and add your name/date.
4. When merged, move the row to a `## ✅ Resolved` section at the bottom of this file with the PR link.
