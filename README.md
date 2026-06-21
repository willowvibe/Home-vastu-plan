# VastuPlan 2D

> **0.1.1 (alpha)** — see [`CHANGELOG.md`](./CHANGELOG.md) and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md) for the current state and the active backlog. Latest release: the P2/P3 UX sweep (5 PRs since `0.1.0`, 8 UX-walkthrough findings resolved).

VastuPlan 2D is a modern, interactive web application designed to help users create, visualize, and analyze floor plans based on traditional Indian Vastu Shastra principles. Built with React 19 and Tailwind CSS v4, it offers a seamless drag-and-drop interface combined with intelligent AI-driven analysis. This release includes bug fixes and usability improvements including keyboard navigation, multi-floor management, and enhanced export options.

## 🌟 Key Features

### 1. Interactive 2D Floor Plan Designer

- **Drag & Drop Interface**: Easily add rooms (Bedroom, Kitchen, Living Room, Pooja Room, etc.) to your plot and drag them into position.
- **Smart Resizing**: Resize rooms using intuitive corner handles.
- **Collision Detection**: Rooms automatically snap and slide against each other, preventing unrealistic overlaps.
- **Multi-Floor Support**: Design `0th / 1st / 2nd / …` floors independently. The floor selector is dynamic — it grows when you add rooms to higher floors, and exposes a "+ Add floor" button (capped at floor 9). Switching to an empty floor shows a hint pointing back to the lowest-used floor.
- **Zoom & Pan**: Zoom in and out of the canvas for precise detailing.
- **Room Management**: Clear entire floors, duplicate rooms, and manage elements with keyboard shortcuts.

### 2. Plot & Setback Management

- **Custom Dimensions**: Define the exact width and length of your plot.
- **Dynamic Setbacks**: Configure top, bottom, left, and right setbacks. Link them for uniform spacing or unlink for custom margins.
- **Buildable Area Calculation**: The app automatically calculates and visually highlights the remaining buildable area after setbacks.
- **Road Facing & North Angle**: Set the road direction and the exact angle of North to ensure accurate Vastu calculations.
- **Multi-Floor Duplication**: Duplicate an entire floor's rooms onto another floor with one click.

### 3. Room Elements & Furniture

- **Context-Aware Furniture**: Select a room to add specific elements (e.g., Beds in Bedrooms, Stoves in Kitchens, Cars in Parking).
- **Smart Fencing**: Elements are strictly constrained within the inner walls of the room.
- **Rotation**: Double-click any element to rotate it by 90 degrees.
- **Wall Thickness**: Choose from 5 standard wall thicknesses (4.5" Partition, 6" Internal, 9" Standard, 12" External, 14" Load Bearing).
- **Element Duplication**: Duplicate individual elements within rooms with a click of a button.

### 4. Vastu Shastra Integration

- **Real-time Vastu Scoring**: As you move rooms, the app calculates an overall Vastu score out of 100 based on their placement relative to the North angle.
- **Color-Coded Feedback**: Rooms glow Green (Good), Yellow (Average), or Red (Poor) based on their Vastu compliance.
- **Vastu Zone Explanations**: Hover over zones to understand Vastu principles.
- **Vastu Grid Overlay**: Toggle a 3x3 grid over your buildable area to instantly see the 8 Vastu zones (North, North-East, East, South-East, South, South-West, West, North-West) and the Brahmasthan (Center). The grid dynamically adjusts based on your custom North angle.
- **Detailed Room Analysis**: Select any room to see specific Vastu tips (e.g., "Kitchen is best in South-East").

### 5. AI-Powered Features

- **Gemini AI Analysis**: Click "Analyze with AI" to send your entire floor plan to Google's Gemini AI. It provides a comprehensive, personalized review of your layout, highlighting strengths and suggesting improvements based on architectural and Vastu principles.
- **AI Image Generation**: Switch to the "AI Image Editor" tab to generate realistic 3D renders or conceptual sketches of your floor plan using Google's Imagen models.
- **Share Plans**: Generate view-only or comment mode links to share your floor plans with others.
- **Projects & Versions**: Manage multiple project versions locally with save/load functionality.

### 6. Export & Responsive Design

- **Export to PNG**: Download a high-resolution image of your floor plan with a single click.
- **PDF Export**: Generate professional PDFs with floor numbers, client info, and custom branding.
- **SVG Export**: Generate clean vector SVG files for scaling without quality loss.
- **JSON Import/Export**: Export and import floor plans as JSON for backup and sharing.
- **Fully Responsive**: The app works seamlessly on desktops, tablets, and mobile phones. On smaller screens, the interface adapts into a clean, tabbed layout (Settings, Canvas, Properties).

## 🛠️ Technical Stack

- **Frontend Framework**: React 19 + TypeScript (strict)
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: Lucide React
- **AI Integration**: `@google/genai` (Gemini 2.5 Flash for text analysis, Imagen for image generation)
- **Utilities**: `html-to-image` for PNG/SVG export, `jsPDF` for PDF export, `lz-string` for URL-compressed plan sharing, `uuid` for unique identification.
- **Backend (optional)**: Node + Express + Socket.io collaboration server in [`server/`](./server/README.md)
- **Tooling**: Vitest + React Testing Library for unit/integration, Playwright for E2E, ESLint + Prettier, Sentry (prod), Plausible (analytics)
- **Runtime requirement**: Node.js >= 22 (see [`.nvmrc`](./.nvmrc))

## 🚀 How to Use

1.  **Setup Plot**: Start by adjusting the Plot Width, Length, and North Angle in the left sidebar (or "Settings" tab on mobile).
2.  **Adjust Setbacks**: Set your required margins from the plot boundary.
3.  **Add Rooms**: Click on room types in the left sidebar to add them to the canvas.
4.  **Arrange**: Drag rooms into the green buildable area. Resize them using the 8 corner + edge handles (4 corners for two-axis resize, 4 edge handles for one-axis-only). Rooms are clamped to the buildable area, so a resize that would push a room past a setback is automatically shifted.
5.  **Add Furniture**: Click a room to select it. In the right sidebar (or "Properties" tab on mobile), click elements to add them. Drag them around or double-click to rotate.
6.  **Keyboard Shortcuts**: Use shortcuts for faster workflow:
    - `Ctrl+Z` / `Ctrl+Y` for Undo/Redo
    - `Delete` to remove rooms
    - `Ctrl+D` to duplicate rooms
    - `R` to rotate selected rooms
    - `↑` `↓` `←` `→` to nudge selected rooms 1 ft
    - `G` to toggle Vastu Grid
    - `Ctrl+Plus` / `Ctrl+Minus` to zoom in/out
    - `Ctrl+S` to save as PNG
7.  **Check Vastu**: Toggle the "Vastu Grid" on the canvas toolbar to see the zones. Watch the overall Vastu Score update as you move rooms.
8.  **Analyze**: Click "Analyze with AI" in the right sidebar for a detailed review.
9.  **Export**: Click "Export PNG" to save your design, "Presentation Export" to generate a branded PDF with project name / client / consultant / logo, or "Export JSON" for a portable backup. JSON exports are undoable on re-import (so you can revert an accidental import with `Ctrl+Z`).

## 🧠 Vastu Logic Explained

The app uses a coordinate system relative to the center of the buildable area. It calculates the angle of each room from the center, adjusts it by the user-defined North Angle, and maps it to one of the 8 cardinal/ordinal directions.

For example, a Kitchen placed in the South-East zone will receive a high score, while a Kitchen in the North-East will receive a lower score and a warning, adhering to traditional Vastu guidelines.

## 🆕 What's in 0.1.1 (alpha)

The five PRs since `0.1.0` are all polish / UX-sweep work — no new features, no breaking changes, no new dependencies. Highlights:

### UX walkthrough fixes (PRs #50, #51, #52)

- **P0 — Click-to-select rooms** (U-3): clicking a room now selects it. Shift+click is the multi-select toggle (B-8 hook contract).
- **P0 — PDF Export** (U-6): the print-only `<div>` had a redundant `canvasContainerRef` binding, so `toPng()` ran on a 0×0 hidden element. One-line fix repairs both PDF and PNG export.
- **P1 — Room stacking** (U-1): new rooms are now offset by 0.5 ft on a diagonal cascade, so adding four rooms in a row puts them in a visible cascade rather than all at (60, 60).
- **P1 — Sidebar layout** (U-2): the "Add Rooms" panel is now at the top of the left sidebar; the page itself is `h-screen` (was `min-h-screen`) and the sidebar scrolls internally.
- **P1 — Share buttons** (U-5): the single Share button is now a view / comment pair, each with an explicit tooltip.
- **P1 — Analyze button** (U-9): the button is disabled with a helpful tooltip when the Gemini API key is missing.
- **P2 — JSON import is undoable** (U-8): imports land at the top of the undo stack via the new `replacePlanPreservingHistory()`.
- **P2 — Room size clamp** (U-11): width/length inputs and drag handles share a single `clampRoomToBuildableArea()` helper; rooms can no longer be resized past the setbacks.
- **P3 — Icon-button labels** (U-4): Duplicate / Rotate / Delete in Room Properties now have inline text labels.
- **P3 — Button rename** (U-7): "PDF Export" → "Presentation Export" (matches the modal title the button opens).
- **P3 — Share fallback** (U-10): the share handler now awaits `navigator.clipboard.writeText` and falls back to a hidden-textarea `execCommand('copy')` if it rejects; the "Copied!" toast only fires on real success.
- **P3 — Empty-floor hint** (U-12): switching to a floor with no rooms shows a hint pointing back to the lowest-used floor.
- **P3 — Dynamic floor selector** (U-13): the selector grows when you add rooms to higher floors; "+ Add floor" caps at floor 9.
- **P3 — 8-direction resize handles** (U-15): 4 corners (28 px hit area) + 4 edge handles (20 px hit area) for one-axis-only resize.

### Architecture

- **`RoomPropertiesPanel`** extracted from `App.tsx` (~195 lines out of the ~1,850-line monolith; S-1 is the next structural pass).
- **`useSelection`** hook — reducer-based, paves the way for the remaining B-8 multi-select work.
- **`useExportWithClearSelection`** — replaces the `setTimeout(50)`-based clear-then-restore dance in `handleExport`.

### Tooling

- `formatFloor()` helper in `src/constants/floorPlanConstants.ts` — `0th / 1st / 2nd / …` everywhere.
- `<ThemeProvider>` + `useTheme()` + Tailwind v4 `dark:` variant — 53 ternary class strings migrated, section-shade table documented in `CLAUDE.md`.
- Test count: **200 → 223** (+23 new tests across the batch).

For the full per-PR commit list, see [`CHANGELOG.md`](./CHANGELOG.md) §`[0.1.1]`.

## 🆕 What's in 0.1.0 (alpha)

This alpha release includes the full feature set advertised in earlier preview builds, plus the bug fixes and hygiene changes from the 2026-06-08 / 2026-06-09 / 2026-06-11 batches (see [`CHANGELOG.md`](./CHANGELOG.md) and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md)). Highlights:

### Keyboard & Accessibility

- Full keyboard navigation with skip links and focus styles
- Keyboard shortcuts for common actions (Undo, Redo, Delete, Duplicate, Rotate, Grid toggle, Save, Zoom)
- ARIA labels on interactive elements for screen readers

### Workflow Improvements

- **Clear Floor**: Instantly remove all rooms from a specific floor with a single click
- **Element Duplication**: Duplicate individual elements within rooms (not just rooms)
- **Share Plans**: Generate view-only or comment mode links to share floor plans (now includes AI analysis)
- **Projects & Versions**: Manage multiple project versions locally with version comparison
- **Snap to Grid Toggle**: Control whether rooms snap to grid or allow fractional positioning
- **Ruler Measurement Tool**: Click two points on canvas to measure distance between them
- **Plan Templates**: Select from predefined templates (Small Apartment, Medium House, Large Villa)

### Export & Customization

- **PDF Export**: Generate professional PDFs with floor numbers, client info, and custom branding
- **SVG Export**: Generate clean vector SVG files for scaling without quality loss
- **JSON Export**: Export floor plans as JSON with optional AI analysis included
- **Zoom Limits**: Improved zoom range (10% - 300%) for better precision
- **Print Support**: Export floor plans directly to printer with clean UI

### Bug Fixes

- Fixed undo/redo history issues with room and element deletion
- Fixed element rotation bounds constraint
- Fixed Vastu grid overlay rotation with north angle
- Fixed wall thickness changes not adjusting element positions
- Fixed share links not including AI analysis results
- Fixed large plan handling with size validation and clear error messages

## ♿ Accessibility

VastuPlan 2D is built to be usable without a mouse:

- **Skip link** — a "Skip to canvas" link is the first focusable element so keyboard users can jump straight to the main workspace.
- **ARIA labels** — interactive controls (toolbar buttons, room add buttons, resize handles, layer toggles, etc.) carry stable `aria-label` attributes.
- **Focus management** — all focusable elements show a visible `focus-visible` outline. Modals (`Onboarding`, `Project Manager`, `Presentation Export`, `Compliance Report`, and the keyboard-shortcut help dialog) use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, an internal focus trap, and `Esc` to close. Focus is restored to the trigger when a modal closes.
- **Keyboard shortcuts** — common actions are keyboard-driven:
  - `Ctrl+Z` / `Ctrl+Y` for Undo/Redo
  - `Delete` / `Backspace` to remove selected rooms or elements
  - `Ctrl+D` to duplicate rooms
  - `R` to rotate selected rooms
  - `↑` `↓` `←` `→` to nudge selected rooms 1 ft
  - `G` to toggle the Vastu grid
  - `Ctrl+Plus` / `Ctrl+Minus` to zoom in/out
  - `Ctrl+S` to save the canvas as PNG
  - `?` to open the shortcut help dialog
- **Read-only modes** — when a plan is opened in `view` or `comment` mode, the canvas, sidebars, and keyboard shortcuts are locked so the plan is read-only.
- **Reduced motion** — the app honors `prefers-reduced-motion`; there are no decorative motion animations in core flows.

Known gaps: the SVG canvas itself is a single focusable region; rooms and elements are currently navigated via click/keyboard shortcuts rather than as individually tabbable shapes. Screen-reader announcements for spatial relationships (e.g., "Kitchen is in the South-East") are not yet implemented.

## 🌍 Internationalization

The app is currently **English-only**. All user-facing strings are hardcoded in source files.

When the project is ready to support additional languages, the recommended path is to centralize strings in a `messages.ts` (or `react-i18next`) catalog and replace inline labels with a typed `t('key')` helper. At that point we will also need:

- Locale-aware number formatting for dimensions and costs.
- Unit conversion between feet/meters that follows the active locale.
- RTL layout review (the canvas coordinate system assumes left-to-right).

Until then, all docs, UI labels, AI prompts, and exported PDFs are produced in English.

## 🤖 `metadata.json`

The repo-root [`metadata.json`](./metadata.json) is a small host-discovery file. It is consumed by the hosting environment (e.g., Google AI Studio / project listings) and contains:

| Field                     | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `name`                    | Project name: `VastuPlan 2D`.                                 |
| `description`             | One-line summary of the app.                                  |
| `requestFramePermissions` | Empty array; the app does not request host-frame permissions. |

Do not delete this file. If the project name or description changes, update `metadata.json` so the host listing stays in sync.

## 🚀 Deploy

The web app deploys to **Vercel** via the Vercel Git integration. No GitHub Actions
file is required for the deploy — the existing `ci.yml` runs lint + tests on every
PR, and Vercel builds and deploys on every push/merge to `main` (production) and on
every PR (preview URLs).

To link the repo to Vercel: see the 7-step runbook in
[`docs/superpowers/specs/2026-06-12-vercel-deployment-design.md`](./docs/superpowers/specs/2026-06-12-vercel-deployment-design.md).
This is a one-time per-account setup. After that, every push deploys automatically.

The optional Socket.io collaboration server in `server/` is deployed separately
via `.github/workflows/deploy-server.yml` to Render + Railway.

## 🧪 Internals (for contributors)

- **State**: `useFloorPlan` owns plan + history (bounded, undo/redo, localStorage autosave with `loadedAt` race guard)
- **Drag/resize**: `useCanvasDrag` — shared-wall aware element placement, snap-to-grid, sub-foot precision
- **Collaboration**: `useCollaboration` Socket.io client, stable socket effect (no reconnect storm), functional `onPlanChange`
- **PWA**: service worker with per-deploy `CACHE_NAME` (bumped by SHA-256 of `index.html`), bundled to `dist/sw.js`
- **Tests**: 223 unit/integration (Vitest) + 7 happy-path E2E (Playwright). Coverage gate in `vitest.config.ts`.
- **CI**: lint + tsc + prettier + vitest + build + `npm audit` (see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml))
- **Backlog**: see [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md) and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md)
