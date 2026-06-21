import { useState, useCallback } from 'react';

/**
 * Owns the `selectedRoomIds` array. Mirrors the reducer logic that
 * previously lived inline in App.tsx (lines 175-187, pre-extraction).
 * The reducer is:
 *   - select(null)        + no shift  -> clear
 *   - select(null)        + shift     -> no-op
 *   - select(id)          + no shift  -> [id]
 *   - select(id)          + shift     -> toggle (add if missing, remove if present)
 *
 * `select` and `clear` are stable (useCallback with [] deps) so they
 * can be passed to memoized children without re-rendering them.
 */
export function useSelection() {
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  const select = useCallback((roomId: string | null, isShiftKey: boolean = false) => {
    if (roomId === null) {
      if (!isShiftKey) setSelectedRoomIds([]);
      return;
    }
    if (isShiftKey) {
      setSelectedRoomIds((prev) =>
        prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
      );
    } else {
      setSelectedRoomIds([roomId]);
    }
  }, []);

  const clear = useCallback(() => {
    setSelectedRoomIds([]);
  }, []);

  /**
   * Bulk replace the selection. Use this for paste / duplicate-N flows
   * where you need to set multiple ids at once without going through
   * the `select` reducer. Prefer `select` and `clear` for one-shot
   * user interactions.
   */
  const replace = useCallback((ids: string[]) => {
    setSelectedRoomIds(ids);
  }, []);

  /**
   * Bulk select from a marquee or similar multi-target gesture.
   *   - no shift  -> replace selection with the intersected ids
   *   - shift     -> merge intersected ids into the current selection,
   *                  preserving order and avoiding duplicates
   */
  const selectMany = useCallback((ids: string[], isShiftKey: boolean = false) => {
    if (isShiftKey) {
      setSelectedRoomIds((prev) => {
        const added = ids.filter((id) => !prev.includes(id));
        return added.length === 0 ? prev : [...prev, ...added];
      });
    } else {
      setSelectedRoomIds(ids);
    }
  }, []);

  return { selectedRoomIds, select, clear, replace, selectMany };
}
