# Known Issues & Improvements

> **Status:** Living tracker for the highest-priority items from `docs/CODE_REVIEW.md`.
> **Source of truth for "what's next":** the triage table at the bottom of `CODE_REVIEW.md` §6.
> **Last updated:** 2026-06-12 (post-deploy polish batch on `fix/post-deploy-polish`, 3 commits, pending PR; this branch resolves Q-1 (floor labels) and Q-2 (theme system) from the post-deploy findings)

## Quick links

- Full review: [docs/CODE_REVIEW.md](./CODE_REVIEW.md)
- Changelog: [CHANGELOG.md](../CHANGELOG.md)
- E2E status: [memory/e2e-tests-completed.md](../memory/e2e-tests-completed.md)

---

## ✅ Recently Resolved (U-3 click-to-select + B-8 multi-select)

> **2026-06-14 — `fix/room-props-and-drag-freeze` (pending PR).** The 2026-06-14 UX walkthrough surfaced 1 P0 (U-3) and 1 P1 (B-8) on the same code path: `Room.tsx`'s room-body `onPointerDown` only ever fired the drag branch, never `onSelectRoom`. The fix adds an optional `onSelectRoom?: (roomId, isShiftKey) => void` prop to `Room.tsx`, calls `onSelectRoom?.(room.id, e.shiftKey)` from the room-body handler (guarded by `e.target === e.currentTarget` so child clicks still bail), and passes the existing `Canvas.tsx` `onSelectRoom` prop down to `<Room>`. The shift path goes through the existing `useSelection` toggle branch, which was already implemented — it just had no UI affordance to invoke it.

| ID  | Title                                                                                                                        | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-3 | Clicking a room on the canvas does not select it (P0 from [2026-06-14 walkthrough](./ux-audit/2026-06-14-ux-walkthrough.md)) | ✅ Resolved | `Room.tsx` + `Canvas.tsx` wiring only — 2-line behavioural change plus 5 new tests in `Room.test.tsx` (plain click → `onSelectRoom(id, false)`; shift+click → `onSelectRoom(id, true)`; resize handle click → does NOT call `onSelectRoom`; label span click → does NOT call `onSelectRoom`; optional-prop safety — `onSelectRoom?.(…)`). 194/194 tests pass (was 189), 0 lint errors, build clean. Manual repro: add Bedroom → click on it in canvas → ROOM PROPERTIES populates. |
| B-8 | Shift+click advertised but does nothing (no marquee select)                                                                  | 🟡 Partial  | The shift+click **toggle** path is now wired (B-8 was waiting on this UI affordance). **Marquee select** (drag-to-select a rectangle) is still unimplemented and remains a separate P1 — see the [P1 table](#-p1--fix-this-sprint-robustness) below.                                                                                                                                                                                                                               |

---

## ✅ Recently Resolved (U-6 export ref collision)

> **2026-06-14 — `fix/room-props-and-drag-freeze` (pending PR).** The 2026-06-14 UX walkthrough flagged a P0 (U-6) on the PDF export flow: clicking "Generate PDF" produced `Failed to export PDF.` because `jsPDF.addImage` rejected `imgData` as `'UNKNOWN'`. The audit traced it to a React ref collision: `App.tsx:1248` and `App.tsx:1276` both bound `canvasContainerRef` to different `<div>` elements, and the second mount — the print-only div, which lives inside `<div class="hidden print-area print:block">` and so is `display: none` outside print — won. `toPng()` on a 0×0 hidden element returned an empty dataURL, and the export chain crashed inside the catch at `PresentationExport.tsx:131`. A dev-server recheck with an `HTMLAnchorElement.click()` hook confirmed the same ref collision also made the **PNG export silently produce a 6-byte `data:,` file** (not a crash, but a useless download). The fix removes the redundant `ref={canvasContainerRef}` from the print-only div — `window.print()` captures the DOM directly and never needed the ref. The visible canvas container (line 1248) is now the sole owner of the ref, so both export flows operate on the live, rendered canvas.

| ID  | Title                                                                                                                                         | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| U-6 | PDF Export always fails with cryptic "Failed to export PDF" alert (P0 from [2026-06-14 walkthrough](./ux-audit/2026-06-14-ux-walkthrough.md)) | ✅ Resolved | One-line fix in `App.tsx`: removed `ref={canvasContainerRef}` from the print-only `<div class="print-only">` (line 1276). The print-only div was rendered for `window.print()`, which doesn't need a programmatic ref. `toPng()` and `pdf.addImage()` now operate on the live canvas, not a 0×0 hidden clone. **Bonus: PNG export** — same ref collision silently produced 6-byte empty PNGs; the single fix repairs both flows. 1 new test in `PresentationExport.test.tsx` (passes a real `<div>` as `canvasRef.current` and asserts `toPng` is called with that exact element, `pdf.addImage` receives a real `data:image/png;base64,…` URL, and `pdf.save` is called with the user-supplied client name). 195/195 tests pass (was 194), 0 lint errors, build clean. Manual repro: add Bedroom → PDF Export → fill modal → Generate PDF → PDF downloads, modal closes, no `Failed to export PDF.` alert. Manual repro: PNG → real ~250 KB PNG downloads, not a 6-byte stub. |

---

## ✅ Recently Resolved (U-1 room stacking)

> **2026-06-14 — `fix/room-props-and-drag-freeze` (pending PR).** The 2026-06-14 UX walkthrough flagged a P1 (U-1) on the room-add flow: clicking "+ Bedroom", "+ Kitchen", "+ Living Room", "+ Bathroom" in quick succession placed all four rooms at `left: 60px, top: 60px` in the canvas, completely overlapping. The user could only see the most-recently-added room — the other three were hidden behind it. Combined with U-3 (rooms were not click-to-select), the user had no way to "uncover" the buried rooms. The fix extracts a pure `computeInitialRoomPosition(plan, rooms, currentFloor)` helper to `src/utils.ts` and uses it in `App.tsx`'s `addRoom` handler. Each new room is offset by `0.5 ft` on both axes (a pure diagonal cascade) so the user always sees the new room and can snap-drag it to its final position. The 0.5 ft step is intentionally _off-grid_ (snap-to-grid is 1 ft) so it never lands on a snapped position by accident.

| ID  | Title                                                                                                                                        | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-1 | All new rooms spawn at the same position, completely overlapping (P1 from [2026-06-14 walkthrough](./ux-audit/2026-06-14-ux-walkthrough.md)) | ✅ Resolved | Pure helper in `src/utils.ts`; `App.tsx` `addRoom` (line ~220) now uses it. 6 new tests in `utils.test.ts`: first room lands at setback origin; 2nd room is offset by 0.5 ft on both axes; 4th room is offset by 1.5 ft on both axes; rooms on other floors do not affect the current floor's offset; diagonal cascade wraps to origin after 48 rooms (min of x/y max-steps); uses plan setbacks (not hard-coded zeros). Wrap behaviour: when the diagonal would push past the buildable area, snaps back to origin — covers the 40+ rooms-on-one-floor edge case. 201/201 tests pass (was 195), 0 tsc errors, build clean. Manual repro: open app → add Bedroom 12x12 → Kitchen 10x10 → Living Room 16x16 → Bathroom 6x8 → four rooms visible in a diagonal cascade from the setback origin, none stacked. |

---

## ✅ Recently Resolved (U-2 sidebar below the fold)

> **2026-06-14 — `fix/room-props-and-drag-freeze` (pending PR).** The 2026-06-14 UX walkthrough flagged a P1 (U-2) on the layout: the left sidebar (~1755px tall) was taller than the viewport (~829px) and the Add Rooms section — the most-frequent interaction — was at the _bottom_ of the sidebar's source order, so the user had to scroll the entire page to click an Add Room button (which then scrolled the canvas out of view, compounding the U-1 invisibility issue). The fix has two parts: (a) constrain the root container to `h-screen` (was `min-h-screen`) so the page is exactly viewport-tall and `main`'s `flex-1` constrains its height to (viewport − header); the left sidebar's `overflow-y-auto` then fires because the content (1755px) is taller than the constrained sidebar (~753px). (b) Add `flex flex-col-reverse min-h-0` to the left sidebar — `flex-col-reverse` inverts the visual order so Add Rooms (the last source-order child) renders at the _top_ of the sidebar, where the user looks first; `min-h-0` is the standard "flexbox won't shrink past content" fix that lets `overflow-y-auto` work on a flex child.

| ID  | Title                                                                                                                                                      | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| U-2 | "Add Rooms" panel is below the fold; you can add a room but not see the canvas (P1 from [2026-06-14 walkthrough](./ux-audit/2026-06-14-ux-walkthrough.md)) | ✅ Resolved | Two CSS-only changes to `App.tsx`: (1) root container `min-h-screen` → `h-screen`; (2) left sidebar `flex-col` → `flex flex-col-reverse min-h-0`. No new tests — the fix is a layout change that would not be exercised by unit tests; manual repro documented. 201/201 tests pass (unchanged), 0 tsc errors, build clean. Manual repro: open app at 1830×829 → Add Rooms panel is visible at the top of the left sidebar without scrolling → sidebar scrolls internally (sidebarHeight 753, sidebarScrollHeight 1755) to reveal Plot Settings / Data Management / Floor / Layers below. Page no longer scrolls — pageHeight matches viewportHeight exactly. |

---

## ✅ Recently Resolved (U-5 view/comment mode unreachable)

> **2026-06-14 — `fix/room-props-and-drag-freeze` (pending PR).** The 2026-06-14 UX walkthrough flagged a P1 (U-5) on the sharing flow: the export toolbar had a single "Share View-Only Link" button that wired only to `handleShare('view')`, even though the `handleShare(mode)` handler supported both `view` and `comment` modes. A user who wanted to share a comment-mode link had no UI affordance — the `?mode=comment` mode was reachable only by manually editing the URL. The fix splits the single icon button into a 2-button group inside a single rounded container: left button (Share2 icon) calls `handleShare('view')`, right button (MessageSquare icon) calls `handleShare('comment')`. Both buttons get a `title` attribute that spells out the mode ("Share View-Only Link (read-only)" / "Share Comment-Enabled Link (reviewers can add notes)") so the icon-only affordance is discoverable on hover.

| ID  | Title                                                                                                                      | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-5 | View / Comment mode is unreachable from the UI (P1 from [2026-06-14 walkthrough](./ux-audit/2026-06-14-ux-walkthrough.md)) | ✅ Resolved | One change in `App.tsx` export toolbar (~line 1203): the single "Share View-Only Link" icon button becomes a 2-button group (Share2 + MessageSquare icons, both `w-10 h-10`, in a flex container with a `border-l` divider). New `MessageSquare` import from `lucide-react`. The wiring to `handleShare(mode)` was already in place — only the UI was missing. No new unit tests — the click handler is internal to App; an isolated test would require extracting the buttons to a small component, which is out of scope for this one-line wiring fix. 201/201 tests pass (unchanged), 0 tsc errors, build clean. Manual repro: open app → add Bedroom → click right-side MessageSquare icon → alert "Share link (comment mode) copied to clipboard!" and URL has `?mode=comment`; left-side Share2 icon still works for `?mode=view`. |

---

## ✅ Recently Resolved (Post-deploy polish batch)

> The post-deploy polish batch ships on branch `fix/post-deploy-polish` (3 commits, pending PR). 2 P3/Q-items fixed: Q-1 (floor labels) and Q-2 (theme system duplicate state). Also adds a Vercel deployment config and a project-root `CLAUDE.md`. Per-bug commit refs:

| ID  | Title                                                                  | Fix commit | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Floor labels are words ("Ground / First / Second"), not ordinals       | `17e38fa`  | Renames to `0th / 1st / 2nd / …` via the new `formatFloor()` helper in `src/constants/floorPlanConstants.ts` (15 assertions in `floorPlanConstants.test.ts` cover the 11/12/13 special case, two-digit, three-digit). 5 call sites in `App.tsx` + 1 in `types.ts` (doc comment) updated. No regressions in any of the 159 tests.                                                                                                                                                    |
| Q-2 | Theme system duplicates state: `App.tsx` has local `useState<boolean>` | `e6b44f4`  | New `<ThemeProvider>` + `useTheme()` in `src/contexts/ThemeContext.tsx`, plus `useDarkMode()` in `src/hooks/useDarkMode.ts` (4 tests cover toggle, localStorage persistence, and the "no stored value → honor current `<html class>`" path). 53 ternary class strings in `App.tsx`/`Header.tsx`/`LayerManager.tsx` migrated to Tailwind v4's `dark:` variant. Linchpin: `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css` (41 `.dark` rules in dist CSS, was 0). |

**No regressions** in `npm run lint`, `npm test` (159/159, +4 new `useDarkMode` tests), or `npm run build`. Also includes:

- **Vercel deployment** — `vercel.json` + `vercel-build.sh` + a README pointer. Every push to `main` → Production; every PR → Preview URL. See `docs/superpowers/specs/2026-06-12-vercel-deployment-design.md`. (Coordinate with the willowvibe org admin to wire the project in the Vercel UI after merge — 5 min.)
- **Project conventions doc** — new `CLAUDE.md` at the repo root (under 200 lines) covering project overview, dev environment, git/mirror note, conventions (incl. the localStorage-shim pattern for tests), theme system rules + section-shade table, and the things-future-Claude-should-know (wall thickness is in inches, `formatFloor()` semantics, the Vercel deploy context).

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

| ID  | Title                                                       | File(s)                                                | Effort |
| --- | ----------------------------------------------------------- | ------------------------------------------------------ | ------ |
| B-8 | Shift+click toggle works; marquee drag-select still missing | `src/components/Canvas.tsx` (marquee), `Header.tsx:94` | 2-3 h  |

---

## 🟡 P2 — Refactor (health)

| ID  | Title                                                                            | File(s)                 | Effort |
| --- | -------------------------------------------------------------------------------- | ----------------------- | ------ |
| S-1 | Split `App.tsx` (1,839 lines) into Sidebar / Properties / Toolbar / hook modules | `src/App.tsx`           | 8-12 h |
| S-4 | Add property tests for Vastu ideal-direction matrix                              | `src/services/vastu.ts` | 4 h    |

**Subtotal:** ~12-16 h

---

## 🟢 P3 — Polish (DX / features)

Selected items; see full list in `docs/CODE_REVIEW.md` §5.

- G-1, G-2, G-7 (multi-user undo, duplicate floor, arrow-key nudge)
- G-12 (replace `(window as any).showToast` with real API)
- Q-4 (extend E2E coverage)
- Q-18 (sync `CHANGELOG.md` to actual `VERSION` = `0.1.0`)

---

## ✅ Recently Resolved (P1 batch #1 — P1 quick-wins)

> The first P1 batch shipped in PR #39 (merge commit `1694af7`) on 2026-06-09. 4 of the 10 P1 items are fixed. Per-bug commit refs:

| ID   | Title                                                    | Fix commit | Notes                                                                                |
| ---- | -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| B-3  | "Clear floor" uses captured `plan` instead of functional | `db30f60`  | `updatePlan((prev) => ...)` + drops the now-unused `setPlan` import.                 |
| B-7  | Ruler distance label hard-coded to `' ft`                | `3f115f1`  | `RulerOverlay` accepts `unit`; converts ft→m at 0.3048. Also fixes B-14 (half-foot). |
| S-16 | `ProjectManager` `localStorage.setItem` not in try/catch | `9b54d86`  | Wraps setItem; toast for `QuotaExceededError` (and any other DOMException).          |
| B-17 | Dark mode + `prose-slate` produces white-on-white panel  | `db30f60`  | `dark:prose-invert` on the analysis panel container.                                 |

**No regressions** in `npm run lint`, `npm test` (33/33, +8 new), or `npm run build`.

---

## ✅ Recently Resolved (P1 batch #2)

> The second P1 batch shipped in PR #43 (merge commit `36b67ca`) on 2026-06-11. 5 of the remaining 6 P1 items and 1 P2 item are fixed. Per-bug commit refs:

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

> The P2/P3 hygiene batch shipped in PR #44 (merge commit `bf2c214`) on 2026-06-11. 7 P2/P3 items fixed: S-22 (proper CACHE_NAME bump), Q-5 (coverage thresholds), Q-6 (allowJs), Q-7+Q-14 (re-include sw.ts + setup.ts in tsc), Q-15 (drop 3 unused deps), Q-20 (Node engine), Q-25 (VITE_GEMINI_API_KEY). Also resolves the missed S-21 row from the P1 batch #2 docs (the code change shipped then; the doc row was missed). Per-bug commit refs:

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

> The 2026-06-11 test-coverage batch (Q-1) shipped on branch `fix/q-1-use-canvas-drag-tests` (this PR). 1 P2 item fixed (Q-1: `useCanvasDrag` behavioural tests). Per-bug commit refs:

| ID  | Title                                | Fix commit | Notes                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Add Vitest tests for `useCanvasDrag` | `3a1c0c9`  | Three new describe blocks: room drag (snap-to-grid 1ft / 0.1ft, plot-bounds clamp, same-floor collision clamp x/y, other-floor rooms ignored, pointerup lifecycle), room resize (SE/SW handles, 2ft min, plot clamp, pointerup), element drag (`draggingElement` state, half-foot rounding, inner-room clamp, Door opening overhang, pointerup). The 4 pre-existing B-5 + S-9 tests are retained. |

**No regressions** in `npm run lint` (0 errors, 2 pre-existing warnings unchanged), `npm test` (78/78, +23 new), or `npm run build`.

---

## ✅ Recently Resolved (P2 refactor batch)

> The 2026-06-11 P2 refactor batch shipped in PR #45. 5 P2 items fixed. Test count grew from 55 to 97 (+42), mostly from pinning the new constants / helpers to regression tests. Per-bug commit refs:

| ID   | Title                                                                         | Fix commit | Notes                                                                                                                                                                                                                                                                                                                               |
| ---- | ----------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-3  | Replace `setPlan` with a single `updatePlan` API                              | `f45745b`  | `setPlan` removed from `useFloorPlan`'s public return; internal `setPlan` retained for the 4 history-aware callers. `useFloorPlan.test.ts` (4 tests) pins the public-API shape.                                                                                                                                                     |
| S-8  | Move geometry constants (TOLERANCE, wall defaults) to `constants/geometry.ts` | `c40e621`  | New `src/constants/geometry.ts` centralizes TOLERANCE_FT (0.1), INCHES_PER_FOOT (12), DEFAULT_WALL_THICKNESS_IN (9), SNAP_GRID_FT (1), SNAP_GRID_SUB_FT (0.1), MIN/MAX_ROOM_SIZE_FT, PIXELS_PER_FOOT, FT_PER_METER, etc. Replaced 14 hard-coded values across 4 callers. `geometry.test.ts` (17 tests) is the regression catcher.   |
| S-12 | Replace `catch (error: any)` with `catch (error: unknown)` + type narrowing   | `6063d3c`  | New `getErrorMessage(error: unknown)` in `src/utils.ts` (12 tests). Switched 3 catch sites in `App.tsx` + 2 `err.message` sites in `useCollaboration.ts`. Lint rule `@typescript-eslint/no-explicit-any` flipped `off` → `warn` (with a follow-up comment to promote to `error` once the 30+ pre-existing any uses are cleaned up). |
| Q-9  | Share `PlanUpdateEvent` type between client and server                        | `91606a1`  | New `src/types/shared.ts` is the single source of truth. `data: any` → `data: unknown` (forced 3 narrow-back sites in `useCollaboration.ts`). Server's `tsconfig.json` widened to allow the import.                                                                                                                                 |
| Q-12 | Split `src/lib/exports.ts` (158 lines, 5 concerns) into 5 files               | `ace86aa`  | Split into `exportPng.ts`, `exportSvg.ts`, `exportJson.ts`, `shareLink.ts`, `printPlan.ts`. The original `exports.ts` is now a 22-line back-compat barrel. Plus a `compressPlan` / `decompressPlan` pure-function pair in `shareLink.ts` (9 round-trip tests).                                                                      |

**No regressions** in `npm run lint` (0 errors, 36 warnings — 35 pre-existing `any` uses, 1 react-refresh), `npm test` (97/97, +42 new), or `npm run build`. Server `tsc --noEmit` also passes — Q-9's cross-package type now typechecks on the server side.

---

## ✅ Recently Resolved (Test coverage batch)

> The 2026-06-11 test-coverage batch ships 2 P2 items in branch `fix/q-2-q-3-hook-tests` (PR #46, merged). Test count grew from 97 to 128 (+31) — both complex hooks are now covered by behavioural tests. Per-bug commit refs:

| ID  | Title                                                    | Fix commit | Notes                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-2 | Add Vitest tests for `useFloorPlan` history              | `bc86b00`  | 15 behavioural tests in `useFloorPlan.test.ts` covering the `commitHistory` identical-state guard, the `MAX_HISTORY_SIZE` cap, undo/redo at the head and the tail, the "new commit after undo truncates the redo branch" invariant, `resetPlan`, and the functional-form `updatePlan`. The 4 pre-existing S-3 structural tests are retained.                                                                           |
| Q-3 | Add Vitest tests for `useCollaboration` socket lifecycle | `bc86b00`  | 20 new tests in `useCollaboration.test.ts` covering the B-1 stable-deps effect, the B-2 functional `onPlanChange` setter, the S-12 `getErrorMessage` error-narrowing path (Error / string / number fallbacks), the `room-joined` plan-sync fallback, the local-echo guard on `plan-updated`, the `plan-synced` echo guard, `joinRoom` / `leaveRoom` / `broadcastUpdate` public-API behaviour, and the unmount cleanup. |

**No regressions** in `npm run lint` (0 new warnings), `npm test` (128/128, +31 new), or `npm run build`. The diff is test-only — no source-code changes.

---

## Triage (mirroring `CODE_REVIEW.md` §6)

> **State as of 2026-06-12 (post Q-1 + Q-2 + Q-3 test-coverage batches, all P2 hook tests resolved; post-deploy polish batch on `fix/post-deploy-polish`, pending PR).** All 9 P0s and 9 of 10 P1s resolved. P1: only B-8 remains. P2: 2 items / ~12-16 h. P3/Q: 16 resolved, 2 remaining (Q-1 + Q-2 from the post-deploy polish batch — both fixed in this branch, awaiting PR).

| Bucket | Items | Effort   | Status                                                                     |
| ------ | ----- | -------- | -------------------------------------------------------------------------- |
| P0     | 0     | —        | ✅ All resolved (PR #28)                                                   |
| P1     | 1     | ~2 h     | 🟡 5 resolved (#43), 1 remaining (B-8)                                     |
| P2     | 2     | ~12-16 h | 🟡 14 resolved (#43 + #44 + #45 + Q-2 + Q-3 + Q-1), 2 remaining (S-1, S-4) |
| P3 / Q | many  | ongoing  | 🟡 16 resolved, 2 remaining (Q-1, Q-2) — both shipped on this branch       |

See [✅ Recently Resolved (Post-deploy polish batch)](#-recently-resolved-post-deploy-polish-batch) for the most recent resolutions, [✅ Recently Resolved (Test coverage batch — Q-1)](#-recently-resolved-test-coverage-batch--q-1) for Q-1 hook tests, [✅ Recently Resolved (Test coverage batch)](#-recently-resolved-test-coverage-batch) for Q-2 + Q-3, and the [✅ Recently Resolved](#-recently-resolved) section above for the P0 sweep.

**Suggested next batch:** No more P2 hooks-test work remains (Q-1, Q-2, Q-3 all done). The next move is **S-1** (split `App.tsx`, 8-12 h) — the single biggest structural win in the backlog. Coordinate with the user before starting since a 1,000+-line diff benefits from its own branch. Alternative low-risk small wins: **S-4** (4 h, property tests for Vastu matrix).

## How to use this document

1. Pick an item from the table.
2. Create a branch: `git checkout -b fix/b-1-collab-socket-reconnect`.
3. Update the `Status` column to `🟡 In progress` and add your name/date.
4. When merged, move the row to a `## ✅ Resolved` section at the bottom of this file with the PR link.
