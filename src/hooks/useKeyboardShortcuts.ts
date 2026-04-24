import { useEffect, useCallback } from 'react';

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
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (hasSelection) {
          onDelete();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (hasSelection) {
          onDuplicate();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (hasSelection && onRotate) {
          e.preventDefault();
          onRotate();
        }
      } else if (e.key === 'g' || e.key === 'G') {
        if (onToggleGrid) {
          e.preventDefault();
          onToggleGrid();
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
