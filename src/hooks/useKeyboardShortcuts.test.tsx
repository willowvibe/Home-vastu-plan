import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderHook, render } from '@testing-library/react';
import React from 'react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts with user-event (G-13)', () => {
  const noop = () => {};

  it('calls undo on Ctrl+Z in edit mode', async () => {
    const undo = vi.fn();
    const user = userEvent.setup();
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

    await user.keyboard('{Control>}z{/Control}');
    expect(undo).toHaveBeenCalled();
  });

  it('calls redo on Ctrl+Shift+Z in edit mode', async () => {
    const redo = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo,
        onDelete: noop,
        onDuplicate: noop,
        hasSelection: true,
      })
    );

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(redo).toHaveBeenCalled();
  });

  it('calls redo on Ctrl+Y in edit mode', async () => {
    const redo = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo,
        onDelete: noop,
        onDuplicate: noop,
        hasSelection: true,
      })
    );

    await user.keyboard('{Control>}y{/Control}');
    expect(redo).toHaveBeenCalled();
  });

  it('calls onDelete when Delete is pressed with a selection', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete,
        onDuplicate: noop,
        hasSelection: true,
      })
    );

    await user.keyboard('{Delete}');
    expect(onDelete).toHaveBeenCalled();
  });

  it('ignores Delete without selection', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete,
        onDuplicate: noop,
        hasSelection: false,
      })
    );

    await user.keyboard('{Delete}');
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDuplicate on Ctrl+D with a selection', async () => {
    const onDuplicate = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate,
        hasSelection: true,
      })
    );

    await user.keyboard('{Control>}d{/Control}');
    expect(onDuplicate).toHaveBeenCalled();
  });

  it('ignores Ctrl+D without selection', async () => {
    const onDuplicate = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate,
        hasSelection: false,
      })
    );

    await user.keyboard('{Control>}d{/Control}');
    expect(onDuplicate).not.toHaveBeenCalled();
  });

  it('calls onRotate on r with a selection', async () => {
    const onRotate = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        onRotate,
        hasSelection: true,
      })
    );

    await user.keyboard('r');
    expect(onRotate).toHaveBeenCalled();
  });

  it('calls onRotate on uppercase R', async () => {
    const onRotate = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        onRotate,
        hasSelection: true,
      })
    );

    await user.keyboard('{Shift>}R{/Shift}');
    expect(onRotate).toHaveBeenCalled();
  });

  it('calls onToggleGrid on g', async () => {
    const onToggleGrid = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        onToggleGrid,
        hasSelection: false,
      })
    );

    await user.keyboard('g');
    expect(onToggleGrid).toHaveBeenCalled();
  });

  it('calls onZoomIn on Ctrl+Plus', async () => {
    const onZoomIn = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        onZoomIn,
        hasSelection: false,
      })
    );

    await user.keyboard('{Control>}+{/Control}');
    expect(onZoomIn).toHaveBeenCalled();
  });

  it('calls onZoomIn on Ctrl+Equals', async () => {
    const onZoomIn = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        onZoomIn,
        hasSelection: false,
      })
    );

    await user.keyboard('{Control>}={/Control}');
    expect(onZoomIn).toHaveBeenCalled();
  });

  it('calls onZoomOut on Ctrl+Minus', async () => {
    const onZoomOut = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        onZoomOut,
        hasSelection: false,
      })
    );

    await user.keyboard('{Control>}-{/Control}');
    expect(onZoomOut).toHaveBeenCalled();
  });

  it('calls onNudge on arrow keys with selection', async () => {
    const onNudge = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        onNudge,
        hasSelection: true,
      })
    );

    await user.keyboard('{ArrowRight}');
    expect(onNudge).toHaveBeenCalledWith('right');

    onNudge.mockClear();
    await user.keyboard('{ArrowLeft}');
    expect(onNudge).toHaveBeenCalledWith('left');

    onNudge.mockClear();
    await user.keyboard('{ArrowUp}');
    expect(onNudge).toHaveBeenCalledWith('up');

    onNudge.mockClear();
    await user.keyboard('{ArrowDown}');
    expect(onNudge).toHaveBeenCalledWith('down');
  });

  it('ignores arrow keys without selection', async () => {
    const onNudge = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        onNudge,
        hasSelection: false,
      })
    );

    await user.keyboard('{ArrowRight}');
    expect(onNudge).not.toHaveBeenCalled();
  });

  it('calls onShowShortcuts on ?', async () => {
    const onShowShortcuts = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'edit',
        undo: noop,
        redo: noop,
        onDelete: noop,
        onDuplicate: noop,
        onShowShortcuts,
        hasSelection: false,
      })
    );

    await user.keyboard('?');
    expect(onShowShortcuts).toHaveBeenCalled();
  });

  it('ignores shortcuts when typing in an input', async () => {
    const undo = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    const props = {
      appMode: 'edit' as const,
      undo,
      redo: noop,
      onDelete,
      onDuplicate: noop,
      hasSelection: true,
    };
    function Wrapper() {
      useKeyboardShortcuts(props);
      return <input type="text" data-testid="shortcut-input" />;
    }
    const { getByTestId } = render(<Wrapper />);

    const input = getByTestId('shortcut-input') as HTMLInputElement;
    await user.type(input, 'z');
    await user.type(input, '{Delete}');

    expect(undo).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('ignores shortcuts in a textarea', async () => {
    const undo = vi.fn();
    const user = userEvent.setup();
    const props = {
      appMode: 'edit' as const,
      undo,
      redo: noop,
      onDelete: noop,
      onDuplicate: noop,
      hasSelection: true,
    };
    function Wrapper() {
      useKeyboardShortcuts(props);
      return <textarea data-testid="shortcut-textarea" />;
    }
    const { getByTestId } = render(<Wrapper />);

    const textarea = getByTestId('shortcut-textarea') as HTMLTextAreaElement;
    await user.type(textarea, 'z');
    expect(undo).not.toHaveBeenCalled();
  });

  it('ignores shortcuts in contentEditable elements', async () => {
    const undo = vi.fn();
    const user = userEvent.setup();
    const props = {
      appMode: 'edit' as const,
      undo,
      redo: noop,
      onDelete: noop,
      onDuplicate: noop,
      hasSelection: true,
    };
    function Wrapper() {
      useKeyboardShortcuts(props);
      return <div contentEditable data-testid="shortcut-editable" />;
    }
    const { getByTestId } = render(<Wrapper />);

    const editable = getByTestId('shortcut-editable') as HTMLDivElement;
    await user.type(editable, 'z');
    expect(undo).not.toHaveBeenCalled();
  });

  it('blocks all shortcuts in view mode', async () => {
    const undo = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'view',
        undo,
        redo: noop,
        onDelete,
        onDuplicate: noop,
        hasSelection: true,
      })
    );

    await user.keyboard('{Control>}z{/Control}');
    await user.keyboard('{Delete}');
    await user.keyboard('{ArrowRight}');
    expect(undo).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('blocks all shortcuts in comment mode', async () => {
    const undo = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderHook(() =>
      useKeyboardShortcuts({
        appMode: 'comment',
        undo,
        redo: noop,
        onDelete,
        onDuplicate: noop,
        hasSelection: true,
      })
    );

    await user.keyboard('{Control>}z{/Control}');
    await user.keyboard('{Delete}');
    await user.keyboard('{ArrowRight}');
    expect(undo).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
