# VastuPlan 2D — Changelog

All notable changes to VastuPlan 2D will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Versioning note (2026-06-11):** Earlier entries referenced `2.0.0` / `2.1.0` even though the code was pre-release. This CHANGELOG has been collapsed onto the actual release line (`0.1.x` alpha, per the `VERSION` file) so that `VERSION`, `package.json`, `CHANGELOG.md`, and `README.md` all agree. The P0 sweep, P1 quick-wins, P1 batch #2, and P2 hygiene batch are all rolled up under `0.1.0`. For the active backlog, see [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md) and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md).

## [Unreleased]

### Added

- **Marquee drag-select** (B-8). `Canvas.tsx` now supports click-and-drag selection boxes on the canvas background. Plain drag replaces the selection with intersected rooms; shift+drag merges them. Measuring mode and non-`edit` app modes skip marquee. `useSelection.ts` gained `selectMany(ids, shiftKey)` for batch replace/merge. `App.tsx` wires `selectMany` into `<Canvas>`. Includes 6 new unit tests in `Canvas.test.tsx`, 2 new `useSelection.test.ts` tests, 1 new Playwright E2E test, and a `data-testid="canvas"` marker on the canvas root.
- **E2E tests in CI** (Q-4). New `e2e` job in `.github/workflows/ci.yml` installs Playwright Chromium deps and runs `npm run test:e2e` on every PR. Playwright report is uploaded as an artifact on failure. `playwright-report/` and `test-results/` are now ignored by git; previously tracked generated files were removed from the index.
- **Vastu matrix property tests** (S-4). New property-style tests in `src/services/vastu.test.ts` enumerate every `RoomType × direction` combination against the exported `IDEAL_ZONES` matrix, pinning scores (100/good, 60/average, 20/poor) and verifying `northAngle` rotation shifts the evaluated direction. `IDEAL_ZONES` is now exported from `src/services/vastu.ts` so tests verify the canonical rule set.

### Fixed

- **E2E selectors post-0.1.1** (`tests/e2e/basic.spec.ts`). Updated the dynamic-floor-selector assertion for U-13 (the "+ Add floor" button moves `currentFloor` to the next slot, so the previous floor button disappears). Hardened the B-10 shared-link autosave test by clearing `vastuplan_autosave` before adding the verification room, making the 144 sq ft built-up assertion deterministic.
- **Vastu matrix completeness** (S-4). The new property tests found three directions missing from `IDEAL_ZONES`: Kitchen was missing `W` (now neutral), Bathroom was missing `N` (now neutral), and Balcony was missing `CENTER` (now avoid). All 9 directions are now covered for every room type without overlap.

_Nothing else in flight. Last release: **0.1.1** (2026-06-15)._

## [0.1.1] - 2026-06-15 — Polish & UX sweep

> Five PRs merged between 2026-06-12 and 2026-06-15: Vercel deployment, post-deploy polish (theme system + floor labels), the room-props-and-drag-freeze P1 batch, and the P2/P3 UX batch (8 findings from the 2026-06-14 UX walkthrough). Cumulative scope: 1 feature extraction (`RoomPropertiesPanel`), 1 P0 fix (U-6 export ref collision), 4 P1 fixes (U-1, U-2, U-3, U-5), 2 P2 fixes (U-8, U-11), and 5 P3 fixes (U-4, U-7, U-10, U-12, U-13, U-15 — 6 P3s). Test count grew from 200 → 223 (+23 new tests). Per-bug resolutions are in [`docs/ux-audit/2026-06-14-ux-walkthrough.md`](./docs/ux-audit/2026-06-14-ux-walkthrough.md) and [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md).

### Added

- **Vercel deployment** (PR #48). `vercel.json` + `vercel-build.sh` + a README pointer. Every push to `main` → Production; every PR → Preview URL. The willowvibe org admin did the one-time UI setup on 2026-06-12. See `docs/superpowers/specs/2026-06-12-vercel-deployment-design.md`.
- **Theme system** (PR #49). New `<ThemeProvider>` + `useTheme()` in `src/contexts/ThemeContext.tsx`; new `useDarkMode()` hook in `src/hooks/useDarkMode.ts`. 53 ternary class strings migrated to Tailwind v4's `dark:` variant. Section-specific light/dark shades for visual sectioning (header / sidebar / canvas / properties / modals each get their own shade). `<html class="dark">` toggles the whole app. `App.tsx`'s local `darkMode` state is gone.
- **`RoomPropertiesPanel`** (PR #50, P1). The right-sidebar room properties card is now a focused component (`src/components/Properties/RoomPropertiesPanel.tsx`) instead of inlined into `App.tsx`. Public props: `selectedRoomIds`, `plan`, `appMode`, `onUpdateRoom`, `onCommitHistory`, `onDuplicate`, `onRotate`, `onDelete`, `onStaleSelection`, `onClearSelection`, `addRoomElement`, `updateRoomCategory`. `App.tsx` is now ~1,850 lines (still S-1's biggest target).
- **`useSelection` hook** (PR #50, P2). New reducer-based selection hook (`src/hooks/useSelection.ts`) replacing `useState<string[]>` in `App.tsx`. Returns `{selectedRoomIds, select, clear, replace}`. Paves the way for the remaining B-8 multi-select work.
- **`useExportWithClearSelection` hook** (PR #50, P2). Replaces the `setTimeout(50)`-based clear-selection-then-restore dance in `handleExport` with a `requestAnimationFrame`-synchronized `runExport` that detects deleted-mid-export rooms via `isRoomStillPresent`.
- **`clampRoomToBuildableArea` helper** (PR #52, U-11). New pure helper in `src/utils.ts` — never mutates, returns a new room with `w`/`h` clamped to the buildable area and `x`/`y` shifted to stay inside the setbacks. Wired into BOTH the width/length number inputs in `RoomPropertiesPanel` (with `max={buildableWidth}` and a `title` tooltip) AND the drag-handle branch in `useCanvasDrag` (defensive final pass).
- **`copyToClipboardWithFallback` helper** (PR #52, U-10). New helper in `src/utils.ts` — awaits `navigator.clipboard.writeText`, falls back to a hidden textarea + `document.execCommand('copy')`, returns `{ok: false}` on total failure. `App.tsx`'s `handleShare` is now async; the "Copied!" toast only fires on `{ok: true}`; on failure shows "Couldn't copy the link. Here's the URL: …".
- **`replacePlanPreservingHistory` on `useFloorPlan`** (PR #52, U-8). New hook method that lands a plan-replacement at the top of the undo stack (the existing `resetPlan` was wiping history). `App.tsx`'s `handleImportJSON` now uses it, so JSON imports are undoable.
- **Dynamic floor selector** (PR #52, U-13). `App.tsx`'s floor selector now derives its button set from the union of `currentFloor` and `plan.rooms.map(r => r.floor)` (sorted ascending), capped at floor 9 with a "+ Add floor" button. A JSON import with `room.floor: 4` now shows a "4th" button.
- **8-direction resize handles** (PR #52, U-15). `Room.tsx` renders 4 corners (28 px hit area, 20 px visual, `data-testid="resize-handle-{nw,ne,sw,se}"`) + 4 edge handles (20 px hit area, 12 px visual, `cursor-ns-resize`/`ew-resize`, `data-testid="resize-handle-{n,s,e,w}"`). The `ResizeHandle` type widened from 4 → 8 directions; the existing `.includes('e' | 's' | 'w' | 'n')` axis-resize branches in `useCanvasDrag` handle 8 directions with no per-direction code.
- **`Canvas.test.tsx`** (PR #52, U-12). New test file for the empty-state hint regression — 2 tests pin the contract.

### Changed

- **Floor labels** (PR #49). `Ground / First / Second` → `0th / 1st / 2nd / …` via the new `formatFloor()` helper in `src/constants/floorPlanConstants.ts`. 5 call sites in `App.tsx` + 1 in `types.ts` (doc comment) updated.
- **`App.tsx` is now ~1,850 lines** (was ~1,655 before PR #50). The `RoomPropertiesPanel` extraction is the partial P1/P2 step; S-1 (full Sidebar / Properties / Toolbar split) is the next structural pass.
- **README** — added a Vercel deployment section pointing at the Vercel UI and the GitHub integration.
- **`CLAUDE.md` (new, at the repo root)** — project conventions, theme system rules, section-shade table, things-future-Claude-should-know (wall thickness in inches, `formatFloor()` semantics, the Vercel deploy context).

### Fixed

- **U-6 (P0)**: PDF Export always failed with cryptic "Failed to export PDF" alert. The print-only `<div>` in `App.tsx` had bound `canvasContainerRef` redundantly; `toPng()` on the 0×0 hidden print div returned an empty dataURL. Removed the redundant ref — `window.print()` captures the DOM directly. **Bonus:** the same ref collision made PNG export silently produce 6-byte empty files; the single fix repairs both flows.
- **U-3 (P0)**: Clicking a room on the canvas did not select it. `Room.tsx`'s room-body `onPointerDown` only fired the drag branch, never `onSelectRoom`. Fix: added optional `onSelectRoom?: (roomId, isShiftKey) => void` prop, called from the room-body handler (guarded by `e.target === e.currentTarget` so child clicks still bail). 5 new tests in `Room.test.tsx`.
- **U-1 (P1)**: All new rooms spawned at the same position (60px, 60px), completely overlapping. New pure `computeInitialRoomPosition(plan, rooms, currentFloor)` helper in `src/utils.ts`; each new room is offset by 0.5 ft on both axes (a pure diagonal cascade). 6 new tests.
- **U-2 (P1)**: "Add Rooms" panel was below the fold; users could add a room but not see the canvas. Two CSS-only changes to `App.tsx`: (a) root container `min-h-screen` → `h-screen`; (b) left sidebar `flex-col` → `flex flex-col-reverse min-h-0`. `flex-col-reverse` inverts the visual order so Add Rooms renders at the top of the sidebar.
- **U-5 (P1)**: View-only / comment-mode share buttons were collapsed into one icon. Split into a 2-button group: view (Share2) and comment (MessageSquare). Both carry explicit `title` tooltips.
- **U-9 (P1)**: Analyze button fired and failed with a generic error when the Gemini API key was missing. Disabled with a helpful tooltip when `VITE_GEMINI_API_KEY` is absent.
- **U-8 (P2)**: Imported JSON plan could not be undone. Fixed via the new `replacePlanPreservingHistory()` (see Added).
- **U-11 (P2)**: Width/Length number inputs and resize handles could produce rooms larger than the buildable area. Fixed via the new `clampRoomToBuildableArea()` (see Added).
- **U-4 (P3)**: Icon-only Duplicate / Rotate / Delete buttons in Room Properties — function invisible without a hover title. Added inline text labels (button keeps the `title` attribute for the long form).
- **U-7 (P3)**: "PDF Export" button label was misleading; opens a "Presentation Export" modal. Renamed the button to match the modal title.
- **U-10 (P3)**: "Copied!" toast on Share fired even when clipboard write was rejected. Fixed via the new `copyToClipboardWithFallback()` (see Added).
- **U-12 (P3)**: 2nd-floor was selectable but rendered no rooms; no empty-state hint. New hint block in `Canvas.tsx` keyed on `floorRooms.length === 0`, names the lowest-used floor via `formatFloor()`. 2 new tests in `Canvas.test.tsx`.
- **U-13 (P3)**: Floor buttons were a fixed `[0, 1, 2]` set. Fixed via the dynamic floor selector (see Added).
- **U-15 (P3)**: 4 tiny corner resize handles with no edge companions. Fixed via 8-direction handles (see Added).
- **B-20**: `Room.tsx`'s outer `onPointerDown` no longer fires the drag branch on child clicks (label / element / resize handle). Guard: `e.target === e.currentTarget`.
- **D1/D2/D3**: `useCanvasDrag` now cleans up on `pointercancel`, `blur`, and `visibilitychange` so a drag in flight doesn't leave the canvas stuck in a dragged state.

### Test count

- **200 → 223** (+23 new tests across the batch). All passing. 0 tsc errors. Build clean.

## [0.1.0] - 2026-06-11 — First alpha (with follow-up fixes)

> 2026-06-11: rolled up the 2026-06-07 alpha entry plus the P0 sweep (PR #28), P1 quick-wins (PR #39), P1 batch #2 (PR #43), and P2 hygiene batch (PR #44), and the P2 refactor batch (PR #45) into a single `0.1.0` line. `package.json` is now `0.1.0` (and renamed from `react-example` to `vastuplan-2d`), matching `VERSION` and `README.md`.

### Added

#### Floor plan designer

- Interactive 2D floor plan designer with drag-and-drop rooms (Bedroom, Kitchen, Living, Pooja, etc.)
- Smart corner-handle resizing with collision detection
- Multi-floor support (Ground / First / Second)
- Zoom (10 % – 300 %) and pan
- Clear floor, duplicate room, delete, rotate
- Snap-to-grid toggle (1 ft when on, 0.1 ft when off)

#### Plot & setbacks

- Custom plot width / length with linked or independent top/bottom/left/right setbacks
- Buildable-area highlight and auto calculation
- Road-facing direction and custom North angle

#### Rooms, elements & furniture

- Context-aware furniture (beds in bedrooms, stoves in kitchens, cars in parking)
- Element duplication and 90° rotation
- 5 standard wall thicknesses (4.5", 6", 9", 12", 14")
- Elements stay strictly inside room inner walls (shared-wall aware: see S-9 below)

#### Vastu Shastra

- Real-time Vastu score (0–100) on a color-coded 3×3 grid
- Brahmasthan (center) and 8 cardinal/ordinal zones that rotate with the North angle
- Per-room Vastu tips when a room is selected
- Ruler measurement tool with click-to-measure distance (metric-aware, half-foot rounding)

#### AI features

- Gemini 2.5 Flash text analysis (`src/services/gemini.ts`) — "Analyze with AI"
- Gemini image generation in the AI Image Editor tab
- View-only and comment-mode share links that include AI analysis (read-only mode locks canvas + keyboard)

#### Export

- PNG export (`html-to-image`)
- SVG export (`html-to-image`)
- PDF export (`jsPDF`) with floor numbers, client info, custom branding, and aspect-fit for non-square plots
- JSON import/export
- Print support

#### Projects & data

- Local projects and versioned saves with version comparison
- Plan templates (Small Apartment / Medium House / Large Villa)
- URL share links (compressed with `lz-string`, stripped after load)
- Optional Socket.io collaboration server in `server/`

#### Accessibility

- Skip link for keyboard navigation
- `tabIndex` / `aria-label` on interactive elements
- Focus-visible styles
- Keyboard shortcuts: `Ctrl+Z`/`Ctrl+Y` (undo/redo), `Delete` (delete room), `Ctrl+D` (duplicate), `R` (rotate), `G` (toggle grid), `Ctrl+S` (export PNG), `Ctrl+Plus`/`Ctrl+Minus` (zoom)
- Full WAI-ARIA dialog pattern (role, aria-modal, focus trap, Esc-to-close) on Onboarding, Project Manager, etc.

#### Telemetry

- Sentry error tracking (production only, with `isSentryInitialized()` guards)
- Plausible analytics (self-hosted or cloud, Vite-compatible `VITE_ANALYTICS_*` env vars)

#### PWA

- Service worker for offline read access (per-deploy `CACHE_NAME` from SHA-256 of `index.html`, bundled to `dist/sw.js`)
- Responsive layout that collapses to tabs on small screens

### Fixed — 2026-06-08 (P0 sweep, PR #28)

- **B-1**: `useCollaboration` no longer reconnects the socket on every `plan` change. The subscription effect now has stable deps and reads the latest plan / userId from refs.
- **B-2**: `applyRemoteUpdate` no longer closes over a stale `plan`. It uses a functional `onPlanChange` setter.
- **B-5**: View and comment modes now lock canvas pointer events (`useCanvasDrag`) and all keyboard shortcuts (`useKeyboardShortcuts`). Every mutating handler in `App.tsx` early-returns when `appMode !== 'edit'`. The `AppMode` type is extracted to `src/types.ts`.
- **B-10**: After loading a shared `?plan=…` URL, the query string is stripped via `history.replaceState` in a `finally` block. A subsequent refresh loads from `localStorage`, not the shared plan, preventing silent edit loss.
- **B-11**: `OfflineIndicator`'s hand-rolled malformed SVG path is replaced with the `lucide-react` `WifiOff` icon.
- **S-5**: Analytics now reads `VITE_ANALYTICS_*` env vars (Vite-compatible) instead of `REACT_APP_ANALYTICS_*`.
- **S-7**: Sentry's `setUser`, `clearUser`, `setTag`, and `addBreadcrumb` are no-ops when `initSentry` was not called, instead of throwing on an uninitialized SDK. `isSentryInitialized()` is exported for callers that want to check.
- **S-10**: `(window as any).showToast?.(...)` in `App.tsx` is replaced with the real `useToast()` hook. `ToastProvider` is moved to `main.tsx` so the hook can resolve in `App`.
- **S-15**: `PresentationExport` logo upload validates the file with a magic-byte sniff (PNG / JPEG) and a 5 MB cap; non-image files are rejected with an error toast.
- **Q-1**: `useCanvasDrag` (the most fragile untested hook — drag/resize/element math, plot-bounds clamp, collision detection, shared walls) is now covered by 23 behavioural tests in `src/hooks/useCanvasDrag.test.ts`. Pins: snap-to-grid on/off, plot-bounds clamping (all 4 setbacks), same-floor collision clamping (x and y), other-floor rooms ignored, SE/SW resize with 2ft min, element half-foot rounding, inner-room clamp, Door opening overhang, pointerup lifecycle. The 4 pre-existing B-5 + S-9 tests are retained. Test count: 78 (was 55, +23).

### Fixed — 2026-06-09 (P1 quick-wins, PR #39)

- **B-3**: "Clear floor" now uses a functional `updatePlan((prev) => ...)` instead of a captured `plan`. The now-unused `setPlan` import was dropped.
- **B-7**: `RulerOverlay` honors `plan.unit` — converts ft→m at 0.3048. (B-14 also fixed: half-foot precision in `Math.round(x * 2) / 2`.)
- **B-9**: `PresentationExport` PDF uses aspect-fit scaling for non-square plots.
- **B-13**: `Room`'s `vastu` `useMemo` now depends only on plot primitives (`plan.plotWidth`, `plan.plotHeight`, `plan.northAngle`) instead of the whole `plan` object, so it no longer recomputes on every drag tick.
- **S-16**: `ProjectManager` wraps `localStorage.setItem` in `try/catch`; `QuotaExceededError` (and any other DOMException) surfaces a toast.
- **B-17**: `dark:prose-invert` on the analysis panel container — the markdown no longer renders as white-on-white in dark mode.

### Fixed — 2026-06-11 (P1 batch #2, PR #43)

- **S-2**: Pinned the `react-hooks/exhaustive-deps` disable count to ≤ 2 in a structural test (`useCollaboration.test.ts`). The two remaining disables are load-bearing and now CI-enforced.
- **S-9**: `useCanvasDrag` element placement accounts for shared walls via the new `getEffectiveWalls(room, otherRooms)` helper — shared sides get `wallFt/2` so elements stay inside the visible canvas.
- **S-17**: `Onboarding` modal is now a full WAI-ARIA dialog — `role` / `aria-modal` / `aria-labelledby` (via `useId`), Esc-to-close, Tab/Shift+Tab focus trap, focus restore on close.
- **S-21**: Dropped the outer `Sentry.ErrorBoundary` in `main.tsx`; the custom `ErrorBoundary` already calls `captureError` in `componentDidCatch`, so the Sentry wrapper was double-reporting.
- **Q-10**: `Header.tsx` now imports `AppMode` from `src/types.ts` (was the last file declaring the union inline).

### Fixed — 2026-06-11 (P2 hygiene batch, PR #44)

- **S-22**: Service worker `CACHE_NAME` is now a per-deploy SHA-256 of `index.html`, injected via Vite `define` as `__VASTUPLAN_CACHE_NAME__`. The SW is now bundled to `dist/sw.js` and registered in production (latent prod bug: the SW was previously dev-only).
- **Q-5**: `vitest.config.ts` now has coverage thresholds (v8 provider, text+html reporter). Thresholds set just below the current measured coverage so the gate doesn't immediately fail CI.
- **Q-6**: Dropped the unused `allowJs: true` from `tsconfig.json`.
- **Q-7** + **Q-14**: `src/services/sw.ts` and `src/test/setup.ts` are re-included in `tsc`. SW types are now declared locally (the DOM lib doesn't ship `ServiceWorkerGlobalScope` / FetchEvent).
- **Q-15**: Dropped unused dependencies `motion`, `autoprefixer`, and `@sentry/tracing` (12 packages removed from `node_modules`).
- **Q-20**: `engines.node: ">=20.0.0"` + `.nvmrc` (20).
- **Q-25**: `gemini.ts` now prefers `import.meta.env.VITE_GEMINI_API_KEY`; `vite-env.d.ts` declares the type.

### Fixed — 2026-06-11 (P2 refactor batch, PR #45)

- **S-3**: `useFloorPlan` no longer exposes `setPlan` on its public return. Internal `setPlan` retained for the 4 history-aware callers (`undo` / `redo` / `resetPlan` / `commitHistory`). `useFloorPlan.test.ts` (4 tests) pins the public-API shape so a future re-exposure fails CI.
- **S-8**: New `src/constants/geometry.ts` centralizes the TOLERANCE_FT, INCHES_PER_FOOT, DEFAULT_WALL_THICKNESS_IN, SNAP_GRID_FT / SUB_FT, MIN/MAX_ROOM_SIZE_FT, PIXELS_PER_FOOT, and FT_PER_METER constants. Replaced 14 hard-coded values across 4 callers (`App.tsx`, `useCanvasDrag.ts`, `Room.tsx`, `lib/exports.ts`). `geometry.test.ts` (17 tests) is the regression catcher.
- **S-12**: New `getErrorMessage(error: unknown)` helper in `src/utils.ts` (12 tests) replaces the unsafe `error.message` access. Switched 3 `catch (error: any)` sites in `App.tsx` and 2 `err.message` sites in `useCollaboration.ts`. Lint rule `@typescript-eslint/no-explicit-any` flipped `off` → `warn` (promotion to `error` is a follow-up once the 30+ pre-existing `any` uses are cleaned up).
- **Q-9**: New `src/types/shared.ts` is the single source of truth for the `PlanUpdateEvent` type shared between client and the collaboration server. `data: any` → `data: unknown` on both sides. The server's `tsconfig.json` was widened to allow the cross-package import.
- **Q-12**: `src/lib/exports.ts` split into 5 per-concern modules: `exportPng.ts`, `exportSvg.ts`, `exportJson.ts`, `shareLink.ts`, `printPlan.ts`. The original `exports.ts` is now a 22-line back-compat barrel. Plus a `compressPlan` / `decompressPlan` pure-function pair in `shareLink.ts` (9 round-trip tests).

### Fixed — 2026-06-11 (Test-coverage batch, on `fix/q-2-q-3-hook-tests`, awaiting PR)

- **Q-2**: `useFloorPlan` history is now covered by 15 behavioural tests (`useFloorPlan.test.ts`). Pins: the `commitHistory` identical-state guard, the MAX_HISTORY_SIZE cap, undo/redo at the head and the tail, the "new commit after undo truncates the redo branch" invariant, `resetPlan`, and the functional-form `updatePlan`.
- **Q-3**: `useCollaboration` socket lifecycle is now covered by 20 new tests (`useCollaboration.test.ts`). Pins: the B-1 stable-deps effect, the B-2 functional `onPlanChange` setter, the S-12 `getErrorMessage` error-narrowing path (Error / string / number fallbacks), the room-joined plan-sync fallback, the local-echo guard on `plan-updated`, the `plan-synced` echo guard, `joinRoom` / `leaveRoom` / `broadcastUpdate` public-API behaviour, and the unmount cleanup.

### Changed

- `.env.example`: added the `VITE_ANALYTICS_*` env-var template and documented the `VITE_GEMINI_API_KEY` precedence.
- `package.json`: bumped to `0.1.0` and renamed to `vastuplan-2d` (was `react-example`).

### Planned

- Multi-select rooms with shift+click (B-8, requires a marquee-select or refactor of `selectedRoomIds`)
- `App.tsx` split into Sidebar / Properties / Toolbar modules (S-1, 8-12 h — the single biggest structural win)
- Collaborative editing backend deployment automation
