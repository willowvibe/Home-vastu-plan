# M-1: Vector PDF Export + Watermark Gate — Design Spec

> **Status:** Approved 2026-07-10.
> **Scope:** Replace the raster PNG-in-PDF Presentation Export with a true vector PDF built from `FloorPlan` primitives, and gate watermark-free output behind a Pro entitlement check.
> **Branch:** `feat/m-1-vector-pdf-watermark` (off `main`).
> **PR:** 1 PR, ~5 commits, ~30 new tests, ~350 prod-code LOC, no new deps.
> **Test count target:** 439 → ~470.

## Motivation

The current Presentation Export (`src/components/PresentationExport.tsx`) captures the canvas DOM as a raster PNG via `html-to-image`'s `toPng()`, then embeds it in a jsPDF document with `pdf.addImage()`. This produces a pixelated floor plan that does not scale cleanly when printed or zoomed — a poor experience for the ₹499 Pro Export tier.

M-1 replaces the raster path with a true vector reconstruction: rooms, walls, the Vastu 3×3 grid, the north compass, and the title block are all drawn with jsPDF vector primitives (`pdf.rect()`, `pdf.line()`, `pdf.text()`, `pdf.circle()`). The output is resolution-independent and prints sharply at any scale.

A **watermark gate** is layered on top: free-tier users get a diagonal "VastuPlan 2D — Free Plan" watermark across the drawing area; Pro users get a clean, watermark-free PDF. The entitlement check is a simple localStorage flag (`vp_pro_export`) in M-1, deferring to Supabase user metadata when M-2 (Razorpay) ships.

## Design

### Approach: reconstruct from primitives (no new deps)

**Chosen: Approach A** — reconstruct the plan from `FloorPlan` primitives via jsPDF vector APIs. jsPDF 4.x is already a dependency; no new packages are needed.

Rejected alternatives:

- **B: `svg2pdf.js`** — would add a new dependency (~40 kB) and require an intermediate SVG string. The SVG→PDF fidelity path is less testable than an explicit op-list.
- **C: Separate "Vector Export" button** — confusing UX. The Presentation Export modal is the natural home for this feature; free users see a subtle status line, not a different button.

### Data/render split (testability)

Following the pattern established by `src/lib/complianceReport.ts` (`buildComplianceReportData` pure → UI renders), the vector PDF logic is split into two layers:

```
buildVectorPdfOps(plan, currentFloor, opts) → VectorPdfOp[]
renderOpsToPdf(ops, jsPDF instance)          → void
```

**`VectorPdfOp`** is a discriminated union of serializable drawing commands:

```ts
type VectorPdfOp =
  | {
      type: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      rx?: number;
    }
  | {
      type: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      strokeWidth: number;
    }
  | {
      type: 'text';
      text: string;
      x: number;
      y: number;
      fontSize: number;
      font?: string;
      fontStyle?: string;
      align?: 'left' | 'center' | 'right';
      color?: string;
    }
  | { type: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string }
  | {
      type: 'watermark';
      text: string;
      x: number;
      y: number;
      w: number;
      h: number;
      angle: number;
      color: string;
      fontSize: number;
    };
```

All coordinates are in **inches** (jsPDF's native unit for letter-format output). The conversion from feet to inches happens inside `buildVectorPdfOps` using a configurable `scale` (ft→in) parameter.

**Why this matters for testing:** `buildVectorPdfOps` is pure — no DOM, no jsPDF, no canvas. Unit tests assert the op-list directly (e.g., "a 10×12 ft room at (5,5) produces a rect op with the correct inch coordinates"). `renderOpsToPdf` is a thin replay loop that can be spied on in component tests.

### New file: `src/lib/exportVectorPdf.ts`

```ts
export interface VectorPdfExportOptions {
  /** Feet-to-inches scale. Default: derived from plot size to fit letter. */
  scale?: number;
  /** Whether to include the Vastu 3×3 grid overlay. Default: true. */
  showVastuGrid?: boolean;
  /** Whether to include the north compass. Default: true. */
  showCompass?: boolean;
  /** Whether to include the watermark. Default: from entitlements service. */
  watermark?: boolean;
  /** Watermark text. Default: "VastuPlan 2D — Free Plan". */
  watermarkText?: string;
}

/**
 * Build a list of vector drawing operations from FloorPlan primitives.
 * Pure function — no DOM, no jsPDF. Easy to unit-test.
 */
export function buildVectorPdfOps(
  plan: FloorPlan,
  currentFloor: number,
  opts?: VectorPdfExportOptions
): VectorPdfOp[];

/**
 * Replay a list of VectorPdfOp commands onto a jsPDF instance.
 * Thin imperative shell — the logic lives in buildVectorPdfOps.
 */
export function renderOpsToPdf(ops: VectorPdfOp[], pdf: jsPDF): void;
```

**What `buildVectorPdfOps` draws (in order, back-to-front):**

1. **Plot boundary** — filled white rectangle (the "paper" area).
2. **1-ft grid** — light grey lines at 1-ft intervals (mirrors the canvas grid).
3. **Setback lines** — dashed lines marking the buildable-area boundary.
4. **Rooms** — filled rectangles with stroke. Wall thickness (inches → feet → inches at scale) determines stroke width. Room label text centered inside.
5. **Vastu 3×3 grid** (optional) — dashed indigo overlay.
6. **North compass** (optional) — red arrow + "N" label, rotated by `plan.northAngle`.
7. **Watermark** (conditional) — diagonal semi-transparent grey text across the drawing area.

The title block, logo, and metadata fields (client/consultant/project/date/scale/floor) remain in `PresentationExport.tsx` — they are already vector (jsPDF `pdf.text()` / `pdf.addImage()` for logo) and don't need refactoring.

### New file: `src/services/entitlements.ts`

```ts
const PRO_EXPORT_KEY = 'vp_pro_export';

/**
 * Check whether the current user is entitled to watermark-free Pro Export.
 * In M-1 this reads a localStorage dev-override flag.
 * M-2 (Razorpay) will extend this to check Supabase user metadata.
 */
export function getProExportEntitlement(): boolean;

/**
 * Set or clear the local Pro Export override (dev/testing only).
 * M-2 will replace this with a server-authoritative check.
 */
export function setLocalProExportOverride(enabled: boolean): void;

/**
 * Convenience: returns true if the watermark should be applied.
 * `!getProExportEntitlement()`.
 */
export function isWatermarkRequired(): boolean;
```

**Storage contract:** `localStorage.setItem('vp_pro_export', '1')` enables Pro; removing the key or setting it to `'0'` disables. The key is namespaced under `vp_` (VastuPlan) to avoid collisions.

### Modified file: `src/components/PresentationExport.tsx`

Changes from current raster path:

| Before (raster)                            | After (vector)                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `toPng(canvasRef.current)` → `imgData`     | `buildVectorPdfOps(plan, currentFloor, { watermark: isWatermarkRequired() })` → `ops` |
| `pdf.addImage(imgData, 'PNG', x, y, w, h)` | `renderOpsToPdf(ops, pdf)`                                                            |
| No entitlement awareness                   | Subtle status line: "Free plan · watermark included" or "Pro · watermark-free"        |
| `canvasRef` prop required                  | `canvasRef` prop **removed** (no longer needed — we draw from data, not DOM)          |

The modal shell, form fields (client/consultant/project), logo upload, and title-block rendering are **preserved as-is**. The only change is the floor-plan rendering path and the addition of the entitlement status line.

**Entitlement status line** (new, below the logo upload field):

```tsx
<div className="text-xs text-slate-400 text-center mt-2">
  {isWatermarkRequired() ? <>Free plan · watermark included</> : <>Pro · watermark-free</>}
</div>
```

No heavy CTA, no upsell banner — just a subtle status indicator. The upsell happens in the marketing site and the pricing page; the modal stays clean.

### Scale computation

The vector PDF uses a computed `scale` (feet → inches) so the plan fits the available drawing area (7″ × 7.7″ on letter-landscape) while preserving aspect ratio. This mirrors the existing `fitInside()` call but operates on plot dimensions rather than image pixels:

```ts
const drawAreaW = 7; // inches
const drawAreaH = 7.7; // inches
const scale = Math.min(drawAreaW / plan.plotWidth, drawAreaH / plan.plotHeight);
```

### Wall thickness in vector output

Wall thickness is stored in **inches** on `Room.wallThickness` (see `src/constants/geometry.ts`). For the vector PDF, the stroke width in inches is:

```
strokeWidth_in = (wallThickness_in / INCHES_PER_FOOT) * scale_ftPerIn
```

This is the same math used in `exportSvg.ts` line 27, just with a different output unit (inches instead of px).

### Room elements (furniture)

Room elements (`RoomElement[]`) are drawn as smaller filled rectangles inside their parent room, positioned relative to the room's origin. Rotation is applied via jsPDF's context transform if available, or approximated with a rotated bounding box. **Scope note:** element rendering is best-effort in M-1; complex furniture layouts may be simplified. A follow-up can add proper rotation support.

### Interface change: `canvasRef` removed

`PresentationExport` currently takes `canvasRef: React.RefObject<HTMLDivElement>` as a prop. After M-1, the canvas DOM is no longer needed — all drawing comes from `plan` data. The prop is removed from the interface.

Callers in `usePlanEditor.ts` (which opens the modal via `setShowPresentationExport(true)`) and `App.tsx` (which renders `<PresentationExport canvasRef={...} ... />`) must be updated to drop the `canvasRef` prop.

### Tests

#### `src/lib/exportVectorPdf.test.ts` (~15 tests)

- **Op-list assertions (no jsPDF/jsdom needed):**
  - Empty plan → only boundary + grid + watermark ops
  - Single 10×12 ft room at (5,5) → correct rect op with inch coordinates at computed scale
  - Room wall thickness 9″ → correct strokeWidth in inches
  - Two rooms on different floors → only current-floor room appears
  - `showVastuGrid: false` → no grid ops
  - `showCompass: false` → no compass ops
  - `watermark: false` → no watermark op
  - `watermark: true` → watermark op present with correct text and angle
  - Custom `watermarkText` → reflected in watermark op
  - Custom `scale` → coordinates reflect the override
  - North angle 90° → compass rotation reflected
  - Setbacks → buildable-area lines at correct positions
  - Room with elements → element rects at correct relative positions
  - Plot with non-square aspect ratio → scale computed to fit 7×7.7″ area
  - Zero rooms on current floor → no room ops, still has boundary + grid

#### `src/services/entitlements.test.ts` (~6 tests)

- `getProExportEntitlement()` returns `false` when localStorage key is absent
- `getProExportEntitlement()` returns `true` when key is `'1'`
- `getProExportEntitlement()` returns `false` when key is `'0'`
- `setLocalProExportOverride(true)` sets key to `'1'`
- `setLocalProExportOverride(false)` removes key
- `isWatermarkRequired()` is the logical negation of `getProExportEntitlement()`

Uses the localStorage shim pattern from `src/hooks/useDarkMode.test.ts` (install a `vi.fn()`-based mock in the test file).

#### `src/components/PresentationExport.test.tsx` (~9 tests, extend existing)

- **Existing tests preserved** as regression guards (real `<div>` PNG raster path still works until we remove `canvasRef`).
- **New tests:**
  - Renders entitlement status line "Free plan · watermark included" when not Pro
  - Renders entitlement status line "Pro · watermark-free" when Pro override is set
  - `renderOpsToPdf` is called with ops containing a watermark op when not Pro
  - `renderOpsToPdf` is called with ops NOT containing a watermark op when Pro
  - Export button triggers `buildVectorPdfOps` + `renderOpsToPdf` (not `toPng`)
  - Modal form fields (client, consultant, project, logo) still render
  - Title block is drawn with jsPDF text APIs
  - `canvasRef` prop is no longer passed/required
  - Logo upload still works (existing magic-byte validation preserved)

### Out of scope (explicit)

- PNG export watermarking (fast-follow — trivial once `entitlements.ts` exists)
- Razorpay integration (M-2)
- Compliance Report watermark (separate modal, separate code path)
- Sun-path / plumbing overlays in vector PDF (complex geometry, defer to M-3+)
- Refactoring `exportSvg.ts` to share the op-list with PDF (fast-follow — the SVG path already works; sharing is an optimization, not a feature)
- Room element rotation fidelity (best-effort in M-1; proper transform support in follow-up)

## Implementation sequence

1. **`src/services/entitlements.ts`** + tests — foundation, no other code depends on it yet
2. **`src/lib/exportVectorPdf.ts`** + tests — pure logic, testable in isolation
3. **`src/components/PresentationExport.tsx`** — swap raster for vector, add status line, drop `canvasRef`
4. **Update callers** — `App.tsx` and `usePlanEditor.ts` to drop `canvasRef` prop
5. **Extend `PresentationExport.test.tsx`** — spy renderer, assert watermark gating
6. **Manual smoke test** — export a PDF, verify vector fidelity in a PDF viewer

## Rollback

The raster path is preserved in git history. If the vector output has fidelity issues, revert `PresentationExport.tsx` to the `toPng` path and keep `entitlements.ts` (it's still useful for future gating). The `canvasRef` prop can be restored from the previous interface.

## Related

- [[m1-vector-pdf-watermark-wip]] — brainstorming session that produced this design
- [[market-research-batch-2026-06-26]] — v0.2 monetization wedge context
- [[codebase-audit-2026-07-07]] — security/perf audit completed before this work
- `docs/CODE_REVIEW.md` §6.1 — M-1 entry in the monetization roadmap
- `docs/KNOWN_ISSUES.md` — M-1 tracking row
- `src/lib/complianceReport.ts` — data/render split pattern this design follows
- `src/lib/exportSvg.ts` — existing vector reconstruction from primitives (SVG output)
