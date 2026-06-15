import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract a human-readable message from an unknown caught value.
 *
 * Use this at every `catch (error: unknown)` site that wants to surface the
 * error to the user. The previous pattern of `catch (error: any)` and
 * `error.message` was unsound: throwing a non-Error value (string, number,
 * `throw 'oops'`, a network `ErrorEvent`, etc.) would either crash the catch
 * block or render `undefined` to the user.
 *
 * Returns an empty string for non-Error throws (the caller can fall back
 * to a domain-specific default like "Failed to import JSON").
 *
 * Examples:
 *   getErrorMessage(new Error('boom'))                  // 'boom'
 *   getErrorMessage('boom')                             // 'boom'
 *   getErrorMessage({ message: 'boom' })                // 'boom'
 *   getErrorMessage({ code: 42 })                       // ''
 *   getErrorMessage(null)                               // ''
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return '';
}

// --- U-1 room-position helper ---------------------------------------------

/** Minimum shape needed by `computeInitialRoomPosition`. Lets the helper
 *  live in `utils.ts` (no `FloorPlan` import cycle) while still being useful
 *  to `App.tsx`. */
export interface RoomPositionPlan {
  plotWidth: number;
  plotHeight: number;
  setbacks: { top: number; right: number; bottom: number; left: number };
}

/** Minimum shape for each room the helper counts. We only read `.floor`. */
export interface RoomPositionRoom {
  floor: number;
}

/**
 * Where a new room should land on the canvas.
 *
 * U-1 fix: rooms used to all spawn at `(setback.left, setback.top)`, which
 * stacked them completely invisibly. This helper returns the setback origin
 * for the first room on a floor and offsets each subsequent room by
 * `0.5 ft` on both axes (a pure diagonal cascade). The offset is
 * non-grid (snap-to-grid is 1 ft) so the user can see the room and
 * snap-drag it to its final position.
 *
 * If the diagonal cascade would push the room past the buildable area,
 * we wrap back to the setback origin. The offset is small (0.5 ft) and
 * rooms on a single floor are typically <20, so wrapping is a rare edge
 * case. For a 24' × 34' buildable area, that means 48/68 = 48 rooms
 * before wrap on the y-axis (the smaller of the two).
 *
 * Floors are isolated: only rooms on `currentFloor` count toward the
 * offset. A fresh floor starts at the origin.
 */
export function computeInitialRoomPosition<T extends RoomPositionRoom>(
  plan: RoomPositionPlan,
  roomsOnAllFloors: readonly T[],
  currentFloor: number
): { x: number; y: number } {
  const countOnFloor = roomsOnAllFloors.filter((r) => r.floor === currentFloor).length;
  const buildableWidth = Math.max(0, plan.plotWidth - plan.setbacks.left - plan.setbacks.right);
  const buildableHeight = Math.max(0, plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom);
  // Wrap when the diagonal would push the room past the buildable area.
  // For a pure diagonal cascade, the room wraps when EITHER axis
  // exceeds its max — i.e., when countOnFloor exceeds the smaller of
  // maxStepsX / maxStepsY. This is an edge case (40+ rooms on one
  // floor) — the typical flow never hits it.
  const step = 0.5;
  const maxStepsX = Math.max(1, Math.floor(buildableWidth / step));
  const maxStepsY = Math.max(1, Math.floor(buildableHeight / step));
  const wrapEvery = Math.min(maxStepsX, maxStepsY);
  // Pure diagonal cascade: every new room is +0.5 on both axes.
  // When the count exceeds the wrap threshold, snap back to origin.
  const stepCount = countOnFloor % wrapEvery;
  const dx = stepCount * step;
  const dy = stepCount * step;
  return {
    x: plan.setbacks.left + dx,
    y: plan.setbacks.top + dy,
  };
}

// --- U-9 Analyze button affordance helper --------------------------------

export interface AnalyzeButtonStateInput {
  isAnalyzing: boolean;
  hasApiKey: boolean;
  hasRoomsOnCurrentFloor: boolean;
}

export interface AnalyzeButtonState {
  disabled: boolean;
  /** Tooltip / aria-label for the button in the current state. */
  title: string;
}

/**
 * Whether the "Analyze Floor Plan" button should be disabled and what
 * tooltip to show. Extracted from App.tsx so the contract is unit-testable
 * without mounting the full App.
 *
 * U-9 fix: the previous behaviour was: button enabled when rooms exist
 * on the current floor, click fires, gemini.ts throws
 * 'VITE_GEMINI_API_KEY not configured', catch shows a generic
 * 'Failed to analyze floor plan.' alert. Cleaner UX: disable the
 * button at the source with a specific tooltip that names the missing
 * config.
 */
export function getAnalyzeButtonState(input: AnalyzeButtonStateInput): AnalyzeButtonState {
  if (!input.hasApiKey) {
    return {
      disabled: true,
      title: 'Set VITE_GEMINI_API_KEY in .env to enable AI analysis (see .env.example)',
    };
  }
  if (!input.hasRoomsOnCurrentFloor) {
    return {
      disabled: true,
      title: 'Add at least one room on the current floor to enable analysis',
    };
  }
  if (input.isAnalyzing) {
    return { disabled: true, title: 'Analyzing…' };
  }
  return { disabled: false, title: 'Analyze floor plan for Vastu compliance + build guide' };
}

// --- U-11 room-clamp helper ----------------------------------------------

/** Minimum shape for `clampRoomToBuildableArea`. */
export interface ClampRoomPlan {
  plotWidth: number;
  plotHeight: number;
  setbacks: { top: number; right: number; bottom: number; left: number };
}

/**
 * Clamp a room's width/height/x/y so it never extends past the plan's
 * buildable area (the area inside the setbacks).
 *
 * U-11: rooms used to be resizable to arbitrary values (e.g. 500ft
 * wide in a 30ft plot) via the input or the drag handle, with no
 * visual indication that the room had left the plot. This helper
 * is the single source of truth for "the largest legal room" and
 * is called from BOTH the input's onChange/onBlur AND
 * `useCanvasDrag`'s resize branch.
 *
 * Algorithm:
 *   1. width  = min(room.w, buildableWidth)
 *      height = min(room.h, buildableHeight)
 *   2. if x + width > rightEdge   → x = rightEdge - width
 *      if y + height > bottomEdge → y = bottomEdge - height
 *   3. if x < leftEdge   → x = leftEdge
 *      if y < topEdge    → y = topEdge
 *   4. if the buildable area is 0 (plot too small for setbacks),
 *      return the input unchanged — a 0-size room is not useful.
 *
 * Returns a new object; never mutates the input.
 */
export function clampRoomToBuildableArea<
  T extends { x: number; y: number; w: number; h: number }
>(room: T, plan: ClampRoomPlan): T {
  const buildableWidth = Math.max(
    0,
    plan.plotWidth - plan.setbacks.left - plan.setbacks.right
  );
  const buildableHeight = Math.max(
    0,
    plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom
  );
  if (buildableWidth <= 0 || buildableHeight <= 0) {
    return room;
  }
  const w = Math.min(room.w, buildableWidth);
  const h = Math.min(room.h, buildableHeight);
  const rightEdge = plan.plotWidth - plan.setbacks.right;
  const bottomEdge = plan.plotHeight - plan.setbacks.bottom;
  // Step 2+3: clamp x and y so the room stays inside the buildable area.
  let x = Math.max(plan.setbacks.left, room.x);
  let y = Math.max(plan.setbacks.top, room.y);
  if (x + w > rightEdge) x = rightEdge - w;
  if (y + h > bottomEdge) y = bottomEdge - h;
  if (x < plan.setbacks.left) x = plan.setbacks.left;
  if (y < plan.setbacks.top) y = plan.setbacks.top;
  return { ...room, x, y, w, h };
}
