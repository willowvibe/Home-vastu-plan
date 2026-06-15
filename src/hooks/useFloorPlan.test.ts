/**
 * Behavioural tests for `src/hooks/useFloorPlan.ts`.
 *
 * Why this file exists (Q-2): the public API surface is pinned in the
 * S-3 tests above; this file pins the BEHAVIOUR of the history stack
 * (commit / undo / redo / reset). The hook drives the entire undo/redo
 * UI, so a regression here is user-visible (a user thinks they can
 * undo, then loses work) and hard to debug.
 *
 * Boundary cases covered (from `docs/CODE_REVIEW.md` §Q-2):
 *   - commitHistory with identical state → no-op (the JSON.stringify
 *     guard inside the hook)
 *   - commitHistory past MAX_HISTORY_SIZE (50) → the oldest entry is
 *     dropped and historyIndex is clamped
 *   - undo at the head (nothing to undo) → no-op
 *   - undo at the tail (index 0) → no-op
 *
 * Plus a few extra invariants that the S-3 contract does not cover:
 *   - the basic commit / undo / redo flow
 *   - resetPlan clears the history stack
 *   - updatePlan(fn) reads the latest state (not a captured snapshot)
 *   - updatePlan(value) overwrites with the given value
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFloorPlan } from './useFloorPlan';
import { INITIAL_PLAN } from '../constants/floorPlanConstants';
import type { FloorPlan, Room } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeRoom(id: string, x = 0, y = 0): Room {
  return {
    id,
    type: 'Bedroom',
    x,
    y,
    w: 10,
    h: 10,
    floor: 0,
    wallThickness: 9,
  };
}

function makePlanWithRooms(rooms: Room[]): FloorPlan {
  return { ...INITIAL_PLAN, rooms };
}

beforeEach(() => {
  // Each test starts with no autosave, so the hook uses INITIAL_PLAN
  // as the start plan. This keeps the assertions deterministic.
  (localStorage.getItem as ReturnType<typeof import('vitest').vi.fn>).mockReturnValue(null);
});

// ---------------------------------------------------------------------------
// Public API surface (S-3) — structural pin, kept here for context
// ---------------------------------------------------------------------------

describe('useFloorPlan public API (S-3)', () => {
  it('exposes plan, updatePlan, commitHistory, undo, redo, resetPlan, replacePlanPreservingHistory, historyIndex, historyLength', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    const keys = Object.keys(result.current).sort();
    expect(keys).toEqual(
      [
        'commitHistory',
        'historyIndex',
        'historyLength',
        'plan',
        'redo',
        'replacePlanPreservingHistory',
        'resetPlan',
        'undo',
        'updatePlan',
      ].sort()
    );
  });

  it('does NOT expose setPlan in the public API (S-3)', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    const exposed = result.current as unknown as Record<string, unknown>;
    expect(exposed.setPlan).toBeUndefined();
  });

  it('updatePlan is a function', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    expect(typeof result.current.updatePlan).toBe('function');
  });

  it('updatePlan can be called with a value (not just a function)', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    expect(() => {
      act(() => {
        result.current.updatePlan(INITIAL_PLAN);
      });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Q-2 — history stack behaviour
// ---------------------------------------------------------------------------

describe('useFloorPlan history (Q-2)', () => {
  it('starts with a single-entry history containing the initial plan', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    expect(result.current.historyLength).toBe(1);
    expect(result.current.historyIndex).toBe(0);
  });

  it('commitHistory with a CHANGED plan grows the history by 1', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    act(() => {
      result.current.updatePlan(makePlanWithRooms([makeRoom('r1')]));
    });
    act(() => {
      result.current.commitHistory();
    });

    expect(result.current.historyLength).toBe(2);
    expect(result.current.historyIndex).toBe(1);
  });

  it('commitHistory with an IDENTICAL plan is a no-op (B-2-class guard)', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    act(() => {
      result.current.updatePlan(INITIAL_PLAN);
    });
    act(() => {
      result.current.commitHistory();
    });

    // The guard inside commitHistory compares the latest history entry
    // to the current plan; equal plans do not grow the stack.
    expect(result.current.historyLength).toBe(1);
    expect(result.current.historyIndex).toBe(0);
  });

  it('commitHistory past MAX_HISTORY_SIZE (50) drops the oldest entry', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    // Seed 51 distinct plan states, committing each one.
    for (let i = 1; i <= 51; i++) {
      act(() => {
        result.current.updatePlan(makePlanWithRooms([makeRoom(`r${i}`)]));
      });
      act(() => {
        result.current.commitHistory();
      });
    }

    // History is capped at 50; index is clamped to the last position.
    expect(result.current.historyLength).toBe(50);
    expect(result.current.historyIndex).toBe(49);
    // The plan reflects the most recent commit, not the first one.
    expect(result.current.plan.rooms[0].id).toBe('r51');
  });

  it('undo walks back through the history', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    act(() => {
      result.current.updatePlan(makePlanWithRooms([makeRoom('r1')]));
      result.current.commitHistory();
    });
    act(() => {
      result.current.updatePlan(makePlanWithRooms([makeRoom('r2')]));
      result.current.commitHistory();
    });

    act(() => result.current.undo());
    expect(result.current.plan.rooms[0].id).toBe('r1');
    expect(result.current.historyIndex).toBe(1);

    act(() => result.current.undo());
    expect(result.current.plan.rooms).toEqual([]);
    expect(result.current.historyIndex).toBe(0);
  });

  it('undo at the tail (index 0) is a no-op', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    act(() => result.current.undo());
    expect(result.current.plan).toEqual(INITIAL_PLAN);
    expect(result.current.historyIndex).toBe(0);
  });

  it('redo walks forward through the history', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    act(() => {
      result.current.updatePlan(makePlanWithRooms([makeRoom('r1')]));
      result.current.commitHistory();
    });
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.plan.rooms[0].id).toBe('r1');
    expect(result.current.historyIndex).toBe(1);
  });

  it('redo past the head is a no-op', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    act(() => {
      result.current.updatePlan(makePlanWithRooms([makeRoom('r1')]));
      result.current.commitHistory();
    });

    act(() => result.current.redo());
    expect(result.current.plan.rooms[0].id).toBe('r1');
    expect(result.current.historyIndex).toBe(1);
  });

  it('a new commit after undo truncates the redo branch', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    act(() => {
      result.current.updatePlan(makePlanWithRooms([makeRoom('r1')]));
      result.current.commitHistory();
    });
    act(() => {
      result.current.updatePlan(makePlanWithRooms([makeRoom('r2')]));
      result.current.commitHistory();
    });
    act(() => result.current.undo()); // back to r1
    act(() => {
      result.current.updatePlan(makePlanWithRooms([makeRoom('r3')]));
      result.current.commitHistory();
    });

    expect(result.current.historyLength).toBe(3); // initial, r1, r3 (r2 was dropped)
    expect(result.current.historyIndex).toBe(2);
    expect(result.current.plan.rooms[0].id).toBe('r3');
  });

  it('resetPlan clears the history stack and seeds a single entry', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    act(() => {
      result.current.updatePlan(makePlanWithRooms([makeRoom('r1')]));
      result.current.commitHistory();
    });
    expect(result.current.historyLength).toBe(2);

    act(() => {
      result.current.resetPlan(makePlanWithRooms([makeRoom('fresh')]));
    });

    expect(result.current.historyLength).toBe(1);
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.plan.rooms[0].id).toBe('fresh');
  });

  it('updatePlan(fn) reads the latest state, not a captured snapshot', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    act(() => {
      result.current.updatePlan((prev) => ({ ...prev, plotWidth: 99 }));
    });
    act(() => {
      // If updatePlan used a captured value of `plan`, the second call
      // would set plotWidth to 30 (the initial) and lose the 99.
      // The functional form guarantees we read the latest state.
      result.current.updatePlan((prev) => ({ ...prev, plotHeight: 88 }));
    });

    expect(result.current.plan.plotWidth).toBe(99);
    expect(result.current.plan.plotHeight).toBe(88);
  });
});

// ---------------------------------------------------------------------------
// U-8: replacePlanPreservingHistory — Ctrl+Z reverts the import
// ---------------------------------------------------------------------------

describe('useFloorPlan replacePlanPreservingHistory (U-8)', () => {
  it('exposes replacePlanPreservingHistory in the public API', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));
    expect(typeof result.current.replacePlanPreservingHistory).toBe('function');
  });

  it('replaces the plan AND keeps the pre-plan in history so undo restores it', () => {
    const { result } = renderHook(() => useFloorPlan(INITIAL_PLAN));

    // Build a pre-plan with one room and commit it (history = [initial, pre]).
    const prePlan = makePlanWithRooms([makeRoom('r1', 3, 3)]);
    act(() => {
      result.current.updatePlan(prePlan);
    });
    act(() => {
      result.current.commitHistory();
    });
    expect(result.current.historyLength).toBe(2);
    expect(result.current.plan.rooms.map((r) => r.id)).toEqual(['r1']);

    // Replace with an imported plan.
    const importedPlan = makePlanWithRooms([
      makeRoom('r2', 3, 3),
      makeRoom('r3', 14, 3),
    ]);
    act(() => {
      result.current.replacePlanPreservingHistory(importedPlan);
    });

    // Current plan is the imported one; history has 2 entries
    // [pre, imported] with index 1. (Note: `updatePlan(prePlan)` did
    // NOT push to history; only `commitHistory()` did. The replacement
    // discards the initial plan and re-anchors history to [pre,
    // imported] — the pre-plan is what Ctrl+Z restores.)
    expect(result.current.plan.rooms.map((r) => r.id)).toEqual(['r2', 'r3']);
    expect(result.current.historyLength).toBe(2);
    expect(result.current.historyIndex).toBe(1);

    // Undo restores the pre-plan.
    act(() => {
      result.current.undo();
    });
    expect(result.current.plan.rooms.map((r) => r.id)).toEqual(['r1']);
    expect(result.current.historyIndex).toBe(0);

    // Redo re-applies the imported plan.
    act(() => {
      result.current.redo();
    });
    expect(result.current.plan.rooms.map((r) => r.id)).toEqual(['r2', 'r3']);
    expect(result.current.historyIndex).toBe(1);
  });
});
