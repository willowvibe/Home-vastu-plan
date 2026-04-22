import { useEffect, useCallback } from "react";

interface UseKeyboardShortcutsOptions {
  undo: () => void;
  redo: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  hasSelection: boolean;
}

export function useKeyboardShortcuts({
  undo,
  redo,
  onDelete,
  onDuplicate,
  hasSelection,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore shortcuts when user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (hasSelection) {
          onDelete();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (hasSelection) {
          onDuplicate();
        }
      }
    },
    [undo, redo, onDelete, onDuplicate, hasSelection],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
