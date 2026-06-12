# VastuPlan 2D — Changelog

All notable changes to VastuPlan 2D will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Versioning note (2026-06-11):** Earlier entries referenced `2.0.0` / `2.1.0` even though the code was pre-release. This CHANGELOG has been collapsed onto the actual release line (`0.1.x` alpha, per the `VERSION` file) so that `VERSION`, `package.json`, `CHANGELOG.md`, and `README.md` all agree. The P0 sweep, P1 quick-wins, P1 batch #2, and P2 hygiene batch are all rolled up under `0.1.0`. For the active backlog, see [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md) and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md).

## [Unreleased]

> The 2026-06-11 P2 refactor batch ships 5 P2 items in branch `fix/p2-refactor-batch` (commits `c40e621`..`f45745b`, awaiting PR). All refactors; no user-facing behaviour change. Test count grew from 55 to 97 (+42). Per-item detail below.

## [0.1.0] - 2026-06-11 — First alpha (with follow-up fixes)

> 2026-06-11: rolled up the 2026-06-07 alpha entry plus the P0 sweep (PR #28), P1 quick-wins (PR #39), P1 batch #2 (PR #43), and P2 hygiene batch (PR #44) into a single `0.1.0` line. `package.json` is now `0.1.0` (and renamed from `react-example` to `vastuplan-2d`), matching `VERSION` and `README.md`.

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

### Fixed — 2026-06-11 (P2 refactor batch, on `fix/p2-refactor-batch`, awaiting PR)

- **S-3**: `useFloorPlan` no longer exposes `setPlan` on its public return. Internal `setPlan` retained for the 4 history-aware callers (`undo` / `redo` / `resetPlan` / `commitHistory`). `useFloorPlan.test.ts` (4 tests) pins the public-API shape so a future re-exposure fails CI.
- **S-8**: New `src/constants/geometry.ts` centralizes the TOLERANCE_FT, INCHES_PER_FOOT, DEFAULT_WALL_THICKNESS_IN, SNAP_GRID_FT / SUB_FT, MIN/MAX_ROOM_SIZE_FT, PIXELS_PER_FOOT, and FT_PER_METER constants. Replaced 14 hard-coded values across 4 callers (`App.tsx`, `useCanvasDrag.ts`, `Room.tsx`, `lib/exports.ts`). `geometry.test.ts` (17 tests) is the regression catcher.
- **S-12**: New `getErrorMessage(error: unknown)` helper in `src/utils.ts` (12 tests) replaces the unsafe `error.message` access. Switched 3 `catch (error: any)` sites in `App.tsx` and 2 `err.message` sites in `useCollaboration.ts`. Lint rule `@typescript-eslint/no-explicit-any` flipped `off` → `warn` (promotion to `error` is a follow-up once the 30+ pre-existing `any` uses are cleaned up).
- **Q-9**: New `src/types/shared.ts` is the single source of truth for the `PlanUpdateEvent` type shared between client and the collaboration server. `data: any` → `data: unknown` on both sides. The server's `tsconfig.json` was widened to allow the cross-package import.
- **Q-12**: `src/lib/exports.ts` split into 5 per-concern modules: `exportPng.ts`, `exportSvg.ts`, `exportJson.ts`, `shareLink.ts`, `printPlan.ts`. The original `exports.ts` is now a 22-line back-compat barrel. Plus a `compressPlan` / `decompressPlan` pure-function pair in `shareLink.ts` (9 round-trip tests).

### Changed

- `.env.example`: added the `VITE_ANALYTICS_*` env-var template and documented the `VITE_GEMINI_API_KEY` precedence.
- `package.json`: bumped to `0.1.0` and renamed to `vastuplan-2d` (was `react-example`).

### Planned

- Multi-select rooms with shift+click (B-8, requires a marquee-select or refactor of `selectedRoomIds`)
- `App.tsx` split into Sidebar / Properties / Toolbar modules (S-1, 8-12 h — the single biggest structural win)
- Vitest coverage for `useCanvasDrag` / `useFloorPlan` / `useCollaboration` (Q-1 / Q-2 / Q-3, ~13 h combined)
- Collaborative editing backend deployment automation
