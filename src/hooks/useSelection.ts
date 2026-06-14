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

  return { selectedRoomIds, select, clear };
}
