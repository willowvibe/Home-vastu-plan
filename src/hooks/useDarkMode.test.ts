import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// The test setup mocks globalThis.localStorage as vi.fn() (see
// src/test/setup.ts), so we install a per-file real in-memory store
// for these tests. The hook uses the real localStorage API, so we
// provide a real localStorage-shaped object.
const memStore: Record<string, string> = {};
const localStorageImpl = {
  getItem: (k: string) => (k in memStore ? memStore[k] : null),
  setItem: (k: string, v: string) => {
    memStore[k] = String(v);
  },
  removeItem: (k: string) => {
    delete memStore[k];
  },
  clear: () => {
    for (const k of Object.keys(memStore)) delete memStore[k];
  },
  length: 0,
  key: () => null,
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageImpl,
  writable: true,
  configurable: true,
});

// Import the hook AFTER installing the localStorage shim so its
// `readInitial()` call (which is evaluated when the module loads)
// sees the real store.
import { useDarkMode } from './useDarkMode';

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to false on a fresh load (no localStorage, no class)', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe(false);
  });

  it('reads persisted "true" from localStorage on init', () => {
    localStorage.setItem('vastuplan-darkmode', 'true');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe(true);
  });

  it('toggles document.documentElement.classList.dark on change', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    act(() => result.current[1]());
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    act(() => result.current[1]());
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists the new value to localStorage on change', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current[1]());
    expect(localStorage.getItem('vastuplan-darkmode')).toBe('true');
    act(() => result.current[1]());
    expect(localStorage.getItem('vastuplan-darkmode')).toBe('false');
  });
});
