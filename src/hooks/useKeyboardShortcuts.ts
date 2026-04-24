import { useEffect, useCallback } from 'react';
import { trackEvent, EVENTS } from '../services/analytics';

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
  hasSelection: boolean;
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
  hasSelection,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
      hasSelection,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
