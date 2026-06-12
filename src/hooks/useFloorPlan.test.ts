/**
 * Structural tests for `src/hooks/useFloorPlan.ts`.
 *
 * Why this file exists (S-3): the public API of `useFloorPlan` was
 * tightened to drop the unsafe `setPlan(x)` in favor of a single
 * `updatePlan` that accepts a value OR an updater function. A future
 * refactor that re-exposes `setPlan` would re-introduce the B-3 bug
 * class (captured-state bugs in async handlers), so the public shape
 * is now pinned.
 *
 * The history / undo / reset behaviour is currently exercised through
 * `App.tsx` integration tests (Playwright). Vitest is the right place
 * for the public-API contract; a full hook test would need
 * `renderHook` + JSDOM localStorage shims and is out of scope for
 * this PR (Q-2 in CODE_REVIEW is the proper follow-up).
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFloorPlan } from './useFloorPlan';
import { INITIAL_PLAN } from '../constants/floorPlanConstants';

describe('useFloorPlan public API (S-3)', () => {
  it('exposes plan, updatePlan, commitHistory, undo, redo, resetPlan, historyIndex, historyLength', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    const keys = Object.keys(result.current).sort();
    expect(keys).toEqual(
      [
        'commitHistory',
        'historyIndex',
        'historyLength',
        'plan',
        'redo',
        'resetPlan',
        'undo',
        'updatePlan',
      ].sort()
    );
  });

  it('does NOT expose setPlan in the public API (S-3)', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    // Cast to a permissive shape so the compiler does not flag the
    // intentional access of a now-private field.
    const exposed = result.current as unknown as Record<string, unknown>;
    expect(exposed.setPlan).toBeUndefined();
  });

  it('updatePlan is a function', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    expect(typeof result.current.updatePlan).toBe('function');
  });

  it('updatePlan can be called with a value (not just a function)', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    // The type system is the strong contract here; this test is a
    // belt-and-suspenders check that a value-only call does not throw.
    expect(() => {
      result.current.updatePlan(INITIAL_PLAN);
    }).not.toThrow();
  });
});
