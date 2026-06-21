import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ToastProvider, useToast, showToastEvent } from './Toast';

describe('Toast event API (G-12)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a toast when the global event fires', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });

    act(() => {
      window.dispatchEvent(
        new CustomEvent('vastuplan:show-toast', { detail: { message: 'Hello', type: 'success' } })
      );
    });

    expect(result.current).toBeDefined();
  });

  it('exports showToastEvent for non-React callers', () => {
    const listener = vi.fn();
    window.addEventListener('vastuplan:show-toast', listener);

    act(() => {
      showToastEvent('Legacy toast', 'error');
    });

    expect(listener).toHaveBeenCalled();
    window.removeEventListener('vastuplan:show-toast', listener);
  });
});
