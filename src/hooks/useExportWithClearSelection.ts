import { useCallback, useRef, useEffect } from 'react';

interface UseExportWithClearSelectionOptions {
  /** The async export function to run. */
  exportFn: () => Promise<void>;
  /** Called if the previously-selected room is no longer present at restore time. */
  onStaleSelection: () => void;
}

interface RunExportArgs {
  /** The id of the room that was selected before the export started. */
  prevSelectedId: string | null;
  /** Setter from the parent's `selectedRoomIds` state. */
  setSelectedRoomIds: (ids: string[]) => void;
  /**
   * Optional. If provided and returns `false` at restore time, the
   * hook calls `onStaleSelection` instead of restoring the id.
   */
  isRoomStillPresent?: (id: string) => boolean;
}

/**
 * Wraps the "clear selection, export, restore via rAF" pattern that
 * App.tsx did inline with a 50ms setTimeout. The rAF approach
 * synchronizes the restore with the next paint, so a deleted
 * mid-export room is more likely to be detected, and there is no
 * wall-clock wait.
 *
 * The hook is mount-safe: if the component unmounts during export,
 * the restore is skipped (no setState-after-unmount warning).
 */
export function useExportWithClearSelection({
  exportFn,
  onStaleSelection,
}: UseExportWithClearSelectionOptions) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runExport = useCallback(
    async ({ prevSelectedId, setSelectedRoomIds, isRoomStillPresent }: RunExportArgs) => {
      // 1. Clear selection.
      setSelectedRoomIds([]);

      // 2. Run the export.
      try {
        await exportFn();
      } catch {
        // The caller's exportFn is responsible for surfacing failures.
        // We still restore in finally.
      } finally {
        // 3. Schedule the restore on the next frame. rAF is preferred
        // over setTimeout(50) because it syncs with the paint, so
        // a room deleted during the export is more likely to be
        // detected.
        requestAnimationFrame(() => {
          if (!mountedRef.current) return;
          if (
            prevSelectedId &&
            (!isRoomStillPresent || isRoomStillPresent(prevSelectedId))
          ) {
            setSelectedRoomIds([prevSelectedId]);
          } else if (prevSelectedId) {
            onStaleSelection();
          }
        });
      }
    },
    [exportFn, onStaleSelection]
  );

  return { runExport };
}
