import { useEffect, useCallback } from 'react';
import { trackEvent, EVENTS } from '../services/analytics';
import { AppMode } from '../types';

export type NudgeDirection = 'up' | 'down' | 'left' | 'right';

interface UseKeyboardShortcutsOptions {
  undo: () => void;
  redo: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRotate?: () => void;
  onToggleGrid?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onShowShortcuts?: () => void;
  onNudge?: (direction: NudgeDirection) => void;
  hasSelection: boolean;
  appMode: AppMode;
}

export function useKeyboardShortcuts({
  undo,
  redo,
  onDelete,
  onDuplicate,
  onRotate,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onShowShortcuts,
  onNudge,
  hasSelection,
  appMode,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // B-5: lock all keyboard shortcuts in non-edit modes.
      if (appMode !== 'edit') return;
      // Ignore shortcuts when user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
          trackEvent(EVENTS.REDO_PERFORMED);
        } else {
          undo();
          trackEvent(EVENTS.UNDO_PERFORMED);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        trackEvent(EVENTS.REDO_PERFORMED);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (hasSelection) {
          onDelete();
          trackEvent(EVENTS.ROOM_DELETED, { props: { source: 'keyboard' } });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (hasSelection) {
          onDuplicate();
          trackEvent(EVENTS.ROOM_ADDED, { props: { source: 'duplicate' } });
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (hasSelection && onRotate) {
          e.preventDefault();
          onRotate();
          trackEvent(EVENTS.ROOM_ROTATED);
        }
      } else if (e.key === 'g' || e.key === 'G') {
        if (onToggleGrid) {
          e.preventDefault();
          onToggleGrid();
          trackEvent(EVENTS.VASTU_GRID_TOGGLED);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        onZoomIn?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        onZoomOut?.();
      } else if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        if (hasSelection && onNudge) {
          e.preventDefault();
          const direction: NudgeDirection =
            e.key === 'ArrowUp'
              ? 'up'
              : e.key === 'ArrowDown'
                ? 'down'
                : e.key === 'ArrowLeft'
                  ? 'left'
                  : 'right';
          onNudge(direction);
          trackEvent(EVENTS.ROOM_NUDGED, { props: { source: 'keyboard', direction } });
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onShowShortcuts?.();
        trackEvent(EVENTS.MODAL_OPENED, { props: { modal: 'shortcuts' } });
      }
    },
    [
      undo,
      redo,
      onDelete,
      onDuplicate,
      onRotate,
      onToggleGrid,
      onZoomIn,
      onZoomOut,
      onShowShortcuts,
      onNudge,
      hasSelection,
      appMode,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
