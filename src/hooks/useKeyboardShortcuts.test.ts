import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts (B-5: no shortcuts in non-edit mode)', () => {
  const noop = () => {};

  it('does not call undo in view mode', () => {
    const undo = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'view',
        undo,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        hasSelection: true,
      })
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(undo).not.toHaveBeenCalled();
  });

  it('does not call onDelete in comment mode', () => {
    const onDelete = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'comment',
        undo: noop,
        redo: noop,
        onDelete,
        onDuplicate: noop,
        hasSelection: true,
      })
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls undo in edit mode', () => {
    const undo = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        hasSelection: true,
      })
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(undo).toHaveBeenCalled();
  });
});
