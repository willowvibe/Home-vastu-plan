/**
 * Geometry constants for the floor plan canvas.
 *
 * Units:
 *  - All values are in **feet** unless the name ends with `_M` (meters) or `_PX` (pixels).
 *  - The canvas renders at `PIXELS_PER_FOOT` CSS pixels per foot (1 ft = 12 in).
 *  - Wall thicknesses are stored in **inches** on the `Room` model and converted
 *    to feet at use sites with `wallFt = wallThickness / 12`.
 *  - The user-facing display unit (`plan.unit: 'ft' | 'm'`) is applied at the
 *    presentation layer; do not multiply these constants by unit.
 *
 * Why these live in one file:
 *  - TOLERANCE is shared between the drag math (`useCanvasDrag.ts`), the shared-
 *    wall detection (`Room.tsx`), and the resize/clamp logic. A divergence of
 *    even 0.01 ft is user-visible (rooms stop snapping flush).
 *  - Wall defaults are repeated in `App.tsx` (addRoom), `useCanvasDrag.ts`,
 *    `Room.tsx`, and `floorPlanConstants.ts` (templates). Centralizing them
 *    prevents a "you changed the default in one place, not the others" bug.
 *  - The snap grid defines the precision of the entire drag UX. Changing the
 *    sub-foot value from 0.1 to 0.5 (or the foot value from 1 to 2) is a
 *    user-visible product change, not a local concern.
 *
 * See also: `docs/CODE_REVIEW.md` §S-8.
 */

// ---------------------------------------------------------------------------
// Overlap / shared-wall tolerance
// ---------------------------------------------------------------------------

/**
 * Maximum distance (in feet) at which two room edges are still considered to
 * "touch" for snap / clamp purposes. Smaller than this = flush, larger = gap.
 *
 * Must be large enough to absorb the sub-foot snap grid (0.1 ft) but small
 * enough that a 6" gap (0.5 ft) does not register as touching.
 *
 * Default: 0.1 ft ≈ 1.2 in.
 */
export const TOLERANCE_FT = 0.1;

// ---------------------------------------------------------------------------
// Wall thickness
// ---------------------------------------------------------------------------

/**
 * Default wall thickness in **inches** for newly created rooms. The standard
 * Indian residential 9" wall (1 ft / 12 = 0.75 ft) is the historical default
 * and is used by all 19 `PLAN_TEMPLATES` rooms.
 */
export const DEFAULT_WALL_THICKNESS_IN = 9;

/**
 * Conversion factor: inches per foot. Used everywhere `wallFt = wallThickness / 12`.
 */
export const INCHES_PER_FOOT = 12;

/**
 * Standard wall thickness options offered in the wall-thickness UI. Values are
 * in **inches**. Keep this list in sync with the UI picker in `RoomPropertiesPanel`.
 *
 * - 4.5"  Partition
 * - 6"    Internal
 * - 9"    Standard (default)
 * - 12"   External
 * - 14"   Load Bearing
 */
export const WALL_THICKNESS_OPTIONS_IN: readonly number[] = [4.5, 6, 9, 12, 14] as const;

// ---------------------------------------------------------------------------
// Snap grid
// ---------------------------------------------------------------------------

/**
 * Snap grid step (in feet) when "Snap to Grid" is ON. Default: 1 ft.
 */
export const SNAP_GRID_FT = 1;

/**
 * Sub-foot snap grid step (in feet) when "Snap to Grid" is OFF. Default: 0.1 ft ≈ 1.2 in.
 */
export const SNAP_GRID_SUB_FT = 0.1;

/**
 * Default configurable grid step (in feet). Used when the plan has no explicit
 * gridSize. Kept equal to SNAP_GRID_FT so existing plans don't change behaviour.
 */
export const DEFAULT_GRID_SIZE_FT = 1;

/**
 * Allowed snap-grid step options (in feet). The UI displays these in the active
 * display unit (ft or m). Values must be positive and at least SNAP_GRID_SUB_FT.
 */
export const GRID_SIZE_OPTIONS_FT: readonly number[] = [0.5, 1, 2, 3, 5] as const;

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

/** CSS pixels per foot at zoom = 1.0. The canvas uses this to convert ft to px. */
export const PIXELS_PER_FOOT = 12;

/** Default zoom (1.0 = 100%). */
export const DEFAULT_ZOOM = 1;

/** Minimum and maximum zoom the user can dial in. See also `useCanvasDrag` zoom handler. */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;

// ---------------------------------------------------------------------------
// Room size bounds
// ---------------------------------------------------------------------------

/** Smallest room (in feet) the user can shrink to. Below this the resize handle disengages. */
export const MIN_ROOM_SIZE_FT = 1;

/** Largest room (in feet) the user can grow to. Caps accidental huge values. */
export const MAX_ROOM_SIZE_FT = 100;

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** Conversion factor: feet to meters. Used in metric display. */
export const FT_PER_METER = 0.3048;
