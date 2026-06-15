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
