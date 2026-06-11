# VastuPlan 2D — Changelog

All notable changes to VastuPlan 2D will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Versioning note (2026-06-07):** Earlier entries referenced `2.0.0` / `2.1.0` even though the code was pre-release. This CHANGELOG has been collapsed onto the actual release line (`0.1.x` alpha, per the `VERSION` file) so that `VERSION`, `package.json`, `CHANGELOG.md`, and `README.md` all agree. The features shipped in those earlier drafts are all rolled up under `0.1.0`. See `docs/ARCHITECTURE.md` for the current state of the codebase.

## [0.1.0] - 2026-06-07 — First alpha

First tagged alpha. Captures everything that was previously advertised as the 2.0 / 2.1 preview line.

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
- Elements stay strictly inside room inner walls

#### Vastu Shastra

- Real-time Vastu score (0–100) on a color-coded 3×3 grid
- Brahmasthan (center) and 8 cardinal/ordinal zones that rotate with the North angle
- Per-room Vastu tips when a room is selected
- Ruler measurement tool with click-to-measure distance

#### AI features

- Gemini 2.5 Flash text analysis (`src/services/gemini.ts`) — "Analyze with AI"
- Gemini image generation in the AI Image Editor tab
- View-only and comment-mode share links that include AI analysis

#### Export

- PNG export (`html-to-image`)
- SVG export (`html-to-image`)
- PDF export (`jsPDF`) with floor numbers, client info, custom branding
- JSON import/export
- Print support

#### Projects & data

- Local projects and versioned saves with version comparison
- Plan templates (Small Apartment / Medium House / Large Villa)
- URL share links (compressed with `lz-string`)
- Optional Socket.io collaboration server in `server/`

#### Accessibility

- Skip link for keyboard navigation
- `tabIndex` / `aria-label` on interactive elements
- Focus-visible styles
- Keyboard shortcuts: `Ctrl+Z`/`Ctrl+Y` (undo/redo), `Delete` (delete room), `Ctrl+D` (duplicate), `R` (rotate), `G` (toggle grid), `Ctrl+S` (export PNG), `Ctrl+Plus`/`Ctrl+Minus` (zoom)

#### Telemetry

- Sentry error tracking (production only)
- Plausible analytics (self-hosted or cloud)

#### PWA

- Service worker for offline read access (see `src/services/sw.ts`)
- Responsive layout that collapses to tabs on small screens

### Known issues

This is an alpha. See [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md) for the active P0/P1 backlog, and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md) for the full review.

Highlights of items that ship un-fixed in `0.1.0`:

- `useCollaboration` reconnects the socket on every `plan` change (CODE_REVIEW §B-1)
- Shared-link URL is not cleared → refreshing reverts edits (§B-10)
- Ruler distance label hard-codes `' ft` even in metric mode (§B-7)
- `OfflineIndicator` SVG path is malformed (§B-11)
- Analytics reads `process.env.REACT_APP_*` (Vite-incompatible) (§S-5)
- `Room` `vastu` `useMemo` depends on the whole `plan` object, defeating memoization on every drag tick (§B-13)

## [Unreleased]

### Fixed

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

### Changed

- `.env.example`: added the `VITE_ANALYTICS_*` env-var template.

### Planned

- Multi-select rooms with shift+click (requires refactoring `selectedRoomIds`)
- Vitest coverage for `useFloorPlan` and `useCollaboration` socket lifecycle (Q-2 + Q-3, ~7 h combined)
- Collaborative editing backend deployment automation
