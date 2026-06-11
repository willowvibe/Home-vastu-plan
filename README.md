# VastuPlan 2D

> **0.1.0 (alpha)** — see [`CHANGELOG.md`](./CHANGELOG.md) and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md) for the current state and the active backlog.

VastuPlan 2D is a modern, interactive web application designed to help users create, visualize, and analyze floor plans based on traditional Indian Vastu Shastra principles. Built with React 19 and Tailwind CSS v4, it offers a seamless drag-and-drop interface combined with intelligent AI-driven analysis. This release includes bug fixes and usability improvements including keyboard navigation, multi-floor management, and enhanced export options.

## 🌟 Key Features

### 1. Interactive 2D Floor Plan Designer

- **Drag & Drop Interface**: Easily add rooms (Bedroom, Kitchen, Living Room, Pooja Room, etc.) to your plot and drag them into position.
- **Smart Resizing**: Resize rooms using intuitive corner handles.
- **Collision Detection**: Rooms automatically snap and slide against each other, preventing unrealistic overlaps.
- **Multi-Floor Support**: Design Ground, First, and Second floors independently.
- **Zoom & Pan**: Zoom in and out of the canvas for precise detailing.
- **Room Management**: Clear entire floors, duplicate rooms, and manage elements with keyboard shortcuts.

### 2. Plot & Setback Management

- **Custom Dimensions**: Define the exact width and length of your plot.
- **Dynamic Setbacks**: Configure top, bottom, left, and right setbacks. Link them for uniform spacing or unlink for custom margins.
- **Buildable Area Calculation**: The app automatically calculates and visually highlights the remaining buildable area after setbacks.
- **Road Facing & North Angle**: Set the road direction and the exact angle of North to ensure accurate Vastu calculations.

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
- **Runtime requirement**: Node.js >= 20 (see [`.nvmrc`](./.nvmrc))

## 🚀 How to Use

1.  **Setup Plot**: Start by adjusting the Plot Width, Length, and North Angle in the left sidebar (or "Settings" tab on mobile).
2.  **Adjust Setbacks**: Set your required margins from the plot boundary.
3.  **Add Rooms**: Click on room types in the left sidebar to add them to the canvas.
4.  **Arrange**: Drag rooms into the green buildable area. Resize them using the blue handle in the bottom-right corner.
5.  **Add Furniture**: Click a room to select it. In the right sidebar (or "Properties" tab on mobile), click elements to add them. Drag them around or double-click to rotate.
6.  **Keyboard Shortcuts**: Use shortcuts for faster workflow:
    - `Ctrl+Z` / `Ctrl+Y` for Undo/Redo
    - `Delete` to remove rooms
    - `Ctrl+D` to duplicate rooms
    - `R` to rotate selected rooms
    - `G` to toggle Vastu Grid
    - `Ctrl+Plus` / `Ctrl+Minus` to zoom in/out
    - `Ctrl+S` to save as PNG
7.  **Check Vastu**: Toggle the "Vastu Grid" on the canvas toolbar to see the zones. Watch the overall Vastu Score update as you move rooms.
8.  **Analyze**: Click "Analyze with AI" in the right sidebar for a detailed review.
9.  **Export**: Click "Export PNG" to save your design.

## 🧠 Vastu Logic Explained

The app uses a coordinate system relative to the center of the buildable area. It calculates the angle of each room from the center, adjusts it by the user-defined North Angle, and maps it to one of the 8 cardinal/ordinal directions.

For example, a Kitchen placed in the South-East zone will receive a high score, while a Kitchen in the North-East will receive a lower score and a warning, adhering to traditional Vastu guidelines.

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

- Skip link to main canvas for keyboard users
- `tabIndex` and `aria-label` on interactive elements
- Focus-visible outlines
- `aria-modal` + focus trap + Esc-to-close on dialogs (Onboarding, Project Manager, etc.)
- View / comment modes lock the canvas and keyboard shortcuts so the app is read-only
- Honor `prefers-reduced-motion` (no decorative animations in core flows)

## 🧪 Internals (for contributors)

- **State**: `useFloorPlan` owns plan + history (bounded, undo/redo, localStorage autosave with `loadedAt` race guard)
- **Drag/resize**: `useCanvasDrag` — shared-wall aware element placement, snap-to-grid, sub-foot precision
- **Collaboration**: `useCollaboration` Socket.io client, stable socket effect (no reconnect storm), functional `onPlanChange`
- **PWA**: service worker with per-deploy `CACHE_NAME` (bumped by SHA-256 of `index.html`), bundled to `dist/sw.js`
- **Tests**: 55 unit/integration (Vitest) + 7 happy-path E2E (Playwright). Coverage gate in `vitest.config.ts`.
- **CI**: lint + tsc + prettier + vitest + build + `npm audit` (see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml))
- **Backlog**: see [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md) and [`docs/CODE_REVIEW.md`](./docs/CODE_REVIEW.md)
