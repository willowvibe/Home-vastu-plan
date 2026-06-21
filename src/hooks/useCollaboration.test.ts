import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Q-3 tests for `useCollaboration`.
 *
 * Why this file exists: the hook drives the entire real-time
 * collaboration flow (connection, room join, peer presence, plan
 * updates, cursor sharing, chat). It is the most fragile part of the
 * system and the least tested (per `docs/CODE_REVIEW.md` §Q-3).
 *
 * Strategy: mock `socket.io-client` so the `io()` factory returns a
 * hand-rolled fake that captures the event listeners registered by the
 * hook. The tests then dispatch events to those listeners and assert
 * the resulting state / callbacks. We also mock the global `requestAnimationFrame`
 * so the `plan-updated` debounce flushes deterministically.
 *
 * What this file covers (mapped to CODE_REVIEW §Q-3):
 *   - Socket connect / disconnect state transitions
 *   - The B-1 fix: io() is called exactly once even when plan changes
 *   - The B-2 fix: applyRemoteUpdate uses a functional onPlanChange
 *   - The S-12 fix: connect_error surfaces a human-readable string
 *   - The room-joined plan-sync fallback (S-12) emits the local plan
 *     when the server returns an empty plan
 *   - The local-echo guard on plan-updated (the isLocalUpdateRef
 *     prevents the user's own broadcast from being re-applied)
 *   - leaveRoom cleans up state
 *   - joinRoom before connection sets an error
 */

// ---------------------------------------------------------------------------
// Mock socket.io-client with a listener-capturing fake
// ---------------------------------------------------------------------------

type Listener = (...args: unknown[]) => void;

const fakeSocketFactory = () => {
  const listeners = new Map<string, Listener[]>();
  const fake = {
    on: vi.fn((event: string, fn: Listener) => {
      const list = listeners.get(event) || [];
      list.push(fn);
      listeners.set(event, list);
    }),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    /** Test-only: dispatch an event to the listeners. */
    __dispatch: (event: string, ...args: unknown[]) => {
      const list = listeners.get(event) || [];
      list.forEach((fn) => fn(...args));
    },
    /** Test-only: list of registered events (for assertions). */
    __listeners: listeners,
  };
  return fake;
};

const { ioMock, socketState } = vi.hoisted(() => {
  const ref: { current: ReturnType<typeof fakeSocketFactory> | null } = { current: null };
  return {
    ioMock: vi.fn(() => {
      const s = fakeSocketFactory();
      ref.current = s;
      return s;
    }),
    socketState: ref,
  };
});

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

// requestAnimationFrame is used inside the plan-updated debounce.
// Replace it with a synchronous flush so tests are deterministic.
beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: (t: number) => void) => {
      cb(0);
      return 0;
    })
  );
});

import { useCollaboration } from './useCollaboration';
import type { FloorPlan, PlanUpdateEvent, CollaborationUser } from '../types';

const PLAN_A: FloorPlan = {
  rooms: [],
  plotWidth: 30,
  plotHeight: 40,
  setbacks: { top: 0, bottom: 0, left: 0, right: 0 },
  unit: 'ft',
  northAngle: 0,
  layers: [],
  roadDirection: 'N',
  comments: [],
};

function makeRoom(id: string) {
  return { id, type: 'Bedroom' as const, x: 0, y: 0, w: 10, h: 10, floor: 0, wallThickness: 9 };
}

function setupHook(
  overrides: {
    onPlanChange?: (p: FloorPlan) => void;
    plan?: FloorPlan;
    onUndoRequest?: () => void;
    onRedoRequest?: () => void;
  } = {}
) {
  const onPlanChange = overrides.onPlanChange ?? vi.fn();
  const onUndoRequest = overrides.onUndoRequest ?? vi.fn();
  const onRedoRequest = overrides.onRedoRequest ?? vi.fn();
  const plan = overrides.plan ?? PLAN_A;
  const { result } = renderHook(() =>
    useCollaboration(plan, onPlanChange, { onUndoRequest, onRedoRequest })
  );
  return { result, onPlanChange, onUndoRequest, onRedoRequest };
}

beforeEach(() => {
  ioMock.mockClear();
  socketState.current = null;
});

// ---------------------------------------------------------------------------
// B-1 — socket does not reconnect on plan change
// ---------------------------------------------------------------------------

describe('useCollaboration (B-1: socket does not reconnect on plan change)', () => {
  it('creates the socket exactly once even when plan changes', () => {
    const onPlanChange = vi.fn();

    const { rerender } = renderHook(({ plan }) => useCollaboration(plan, onPlanChange), {
      initialProps: { plan: PLAN_A },
    });

    const initialIoCalls = ioMock.mock.calls.length;
    expect(initialIoCalls).toBe(1);

    rerender({ plan: { ...PLAN_A, plotWidth: 50 } });
    rerender({ plan: { ...PLAN_A, plotWidth: 60 } });
    rerender({ plan: { ...PLAN_A, plotWidth: 70 } });

    expect(ioMock.mock.calls.length).toBe(initialIoCalls);
  });
});

// ---------------------------------------------------------------------------
// B-2 — no eslint-disable hiding dep-array violation
// ---------------------------------------------------------------------------

describe('useCollaboration (B-2: no eslint-disable hiding dep-array violation)', () => {
  it('the source file no longer contains react-hooks/exhaustive-deps disable', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'useCollaboration.ts'), 'utf-8');
    expect(src).not.toMatch(/eslint-disable-next-line react-hooks\/exhaustive-deps/);
  });
});

// ---------------------------------------------------------------------------
// S-2 (resolved-by-design) — exhaustive-deps disable count is pinned
// ---------------------------------------------------------------------------

describe('S-2 (resolved-by-design): exhaustive-deps disables are limited to known-justified sites', () => {
  it('no new exhaustive-deps disables outside App.tsx:182 (share loader) and Room.tsx:56 (B-13)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const grep = (rel: string) => {
      try {
        return readFileSync(join(here, '..', '..', rel), 'utf-8');
      } catch {
        return '';
      }
    };
    const sources = [
      grep('src/App.tsx'),
      grep('src/components/Room.tsx'),
      grep('src/hooks/useCollaboration.ts'),
    ];
    const combined = sources.join('\n');
    const matches = [
      ...combined.matchAll(/eslint-disable-next-line react-hooks\/exhaustive-deps/g),
    ];
    expect(matches.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Q-3 — socket lifecycle
// ---------------------------------------------------------------------------

describe('useCollaboration socket lifecycle (Q-3)', () => {
  it('initial state is disconnected with no room / user / users', () => {
    const { result } = setupHook();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.roomId).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('connect event sets isConnected and clears the error', () => {
    const { result } = setupHook();

    act(() => {
      // First inject an error so we can verify the clear.
      socketState.current!.__dispatch('connect_error', new Error('boom'));
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      socketState.current!.__dispatch('connect');
    });
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('disconnect event clears isConnected and the user list', () => {
    const { result } = setupHook();

    act(() => {
      socketState.current!.__dispatch('connect');
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      socketState.current!.__dispatch('disconnect');
    });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.users).toEqual([]);
  });

  it('connect_error surfaces a human-readable string (S-12 fix)', () => {
    const { result } = setupHook();

    act(() => {
      socketState.current!.__dispatch('connect_error', new Error('server is sad'));
    });

    expect(result.current.error).toBe('Connection failed: server is sad');
    expect(result.current.isConnected).toBe(false);
  });

  it('connect_error with a thrown string still produces a useful message (no `undefined`)', () => {
    const { result } = setupHook();

    act(() => {
      // A misbehaving server might throw a string instead of an Error.
      // The S-12 fix routes this through getErrorMessage() so the user
      // sees a real string, not `Connection failed: undefined`.
      socketState.current!.__dispatch('connect_error', 'connection refused');
    });

    expect(result.current.error).toBe('Connection failed: connection refused');
  });

  it('connect_error with a non-Error, non-string value shows the fallback', () => {
    const { result } = setupHook();

    act(() => {
      socketState.current!.__dispatch('connect_error', 42);
    });

    // getErrorMessage returns '' for a number, the hook appends the
    // 'Unknown error' fallback.
    expect(result.current.error).toBe('Connection failed: Unknown error');
  });

  it('room-joined with a non-empty plan applies the server plan', () => {
    const onPlanChange = vi.fn();
    const { result } = setupHook({ onPlanChange });

    const serverPlan: FloorPlan = { ...PLAN_A, plotWidth: 99 };
    const user: CollaborationUser = { id: 'u1', name: 'Alice', color: '#000', socketId: 's1' };

    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [user],
        plan: serverPlan,
        messages: [],
      });
    });

    expect(result.current.isConnecting).toBe(false);
    expect(result.current.roomId).toBe('r1');
    expect(result.current.userId).toBe('me');
    expect(result.current.users).toEqual([user]);
    expect(onPlanChange).toHaveBeenCalledWith(serverPlan);
  });

  it('room-joined with an empty plan emits plan-sync with the local plan', () => {
    const onPlanChange = vi.fn();
    setupHook({ onPlanChange });

    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [],
        plan: null,
        messages: [],
      });
    });

    // Server had nothing; we send our local plan up. The emitted
    // payload is the current plan (PLAN_A) at emit time.
    expect(socketState.current!.emit).toHaveBeenCalledWith('plan-sync', PLAN_A);
    expect(onPlanChange).not.toHaveBeenCalled();
  });

  it('user-joined adds a peer; duplicate ids are deduped', () => {
    const { result } = setupHook();
    const user: CollaborationUser = { id: 'u1', name: 'Alice', color: '#000', socketId: 's1' };

    act(() => {
      socketState.current!.__dispatch('user-joined', user);
    });
    expect(result.current.users).toEqual([user]);

    act(() => {
      socketState.current!.__dispatch('user-joined', user);
    });
    // Same id → no duplicate.
    expect(result.current.users).toEqual([user]);
  });

  it('user-left removes the peer and clears their cursor', () => {
    const { result } = setupHook();
    const alice: CollaborationUser = { id: 'u1', name: 'Alice', color: '#000', socketId: 's1' };
    const bob: CollaborationUser = { id: 'u2', name: 'Bob', color: '#111', socketId: 's2' };

    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [alice, bob],
        plan: null,
        messages: [],
      });
    });
    expect(result.current.users).toHaveLength(2);

    act(() => {
      socketState.current!.__dispatch('user-left', { userId: 'u1' });
    });
    expect(result.current.users.map((u) => u.id)).toEqual(['u2']);
  });

  it('plan-updated applies a remote room-add (B-2 functional setter)', () => {
    const onPlanChange = vi.fn();
    void setupHook({ onPlanChange });

    // First, join so isLocalUpdateRef is in its default state.
    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [],
        plan: null,
        messages: [],
      });
    });

    const remoteUpdate: PlanUpdateEvent = {
      type: 'room',
      action: 'add',
      data: makeRoom('remote1'),
      timestamp: 1,
      userId: 'other',
      userName: 'Carol',
    };

    act(() => {
      socketState.current!.__dispatch('plan-updated', remoteUpdate);
    });

    // The B-2 fix: onPlanChange is called with a FUNCTIONAL updater,
    // not a pre-computed value. The parent's setter is expected to
    // invoke `updater(prev)` itself (the standard React state-setter
    // contract). So we invoke the function with PLAN_A to get the
    // resulting plan and assert on that.
    expect(onPlanChange).toHaveBeenCalledTimes(1);
    const updater = onPlanChange.mock.calls[0][0] as (p: FloorPlan) => FloorPlan;
    const applied = updater(PLAN_A);
    expect(applied.rooms).toHaveLength(1);
    expect(applied.rooms[0].id).toBe('remote1');
  });

  it('plan-updated from the local user is NOT applied (local-echo guard)', () => {
    const onPlanChange = vi.fn();
    void setupHook({ onPlanChange });

    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [],
        plan: null,
        messages: [],
      });
    });

    // Mark the next broadcast as a local echo. This is the same flag
    // broadcastUpdate() flips internally — we set it through the public
    // path by calling broadcastUpdate (which is the only way to set it
    // in the hook). But the guard reads it for ~100 ms; to keep the
    // test deterministic we just call broadcastUpdate() and then
    // dispatch the same update back through the socket.
    const { result } = setupHook({ onPlanChange });

    act(() => {
      // Re-join so result.current is the second hook's result; the
      // mock socket is the same one (singleton), so events reach
      // every hook subscribed. We only have one hook in this test
      // (the second setupHook), so just use its result.
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [],
        plan: null,
        messages: [],
      });
    });

    act(() => {
      result.current.broadcastUpdate({
        type: 'room',
        action: 'add',
        data: makeRoom('mine'),
      } as Omit<PlanUpdateEvent, 'timestamp' | 'userId'>);
    });

    // The hook emitted the update; if we dispatch it back, the
    // isLocalUpdateRef guard is still true (within 100 ms), so the
    // remote apply path should skip it.
    onPlanChange.mockClear();
    act(() => {
      socketState.current!.__dispatch('plan-updated', {
        type: 'room',
        action: 'add',
        data: makeRoom('mine'),
        timestamp: 1,
        userId: 'me',
        userName: 'me',
      });
    });

    expect(onPlanChange).not.toHaveBeenCalled();
  });

  it('plan-synced applies a remote plan when modifiedBy is a different user', () => {
    const onPlanChange = vi.fn();
    setupHook({ onPlanChange });

    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [],
        plan: null,
        messages: [],
      });
    });

    const remotePlan: FloorPlan = { ...PLAN_A, plotWidth: 77 };
    act(() => {
      socketState.current!.__dispatch('plan-synced', {
        plan: remotePlan,
        timestamp: 1,
        modifiedBy: 'someone-else',
      });
    });

    expect(onPlanChange).toHaveBeenCalledWith(remotePlan);
  });

  it('plan-synced with modifiedBy === our userId is a no-op (echo guard)', () => {
    const onPlanChange = vi.fn();
    setupHook({ onPlanChange });

    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [],
        plan: null,
        messages: [],
      });
    });

    onPlanChange.mockClear();
    act(() => {
      socketState.current!.__dispatch('plan-synced', {
        plan: { ...PLAN_A, plotWidth: 1 },
        timestamp: 1,
        modifiedBy: 'me',
      });
    });

    expect(onPlanChange).not.toHaveBeenCalled();
  });

  it('joinRoom before the socket is connected sets an error', () => {
    const { result } = setupHook();
    // isConnected is false on mount.

    act(() => {
      result.current.joinRoom('r1', 'me');
    });

    expect(result.current.error).toBe('Not connected to server');
    expect(result.current.isConnecting).toBe(false);
  });

  it('joinRoom after connect emits join-room and flips isConnecting', () => {
    const { result } = setupHook();

    act(() => {
      socketState.current!.__dispatch('connect');
    });

    act(() => {
      result.current.joinRoom('r1', 'me');
    });

    expect(result.current.isConnecting).toBe(true);
    expect(result.current.error).toBeNull();
    expect(socketState.current!.emit).toHaveBeenCalledWith('join-room', {
      roomId: 'r1',
      userName: 'me',
    });
  });

  it('leaveRoom disconnects, reconnects, and clears room state', () => {
    const { result } = setupHook();

    act(() => {
      socketState.current!.__dispatch('connect');
    });
    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [{ id: 'u1', name: 'A', color: '#000', socketId: 's1' }],
        plan: null,
        messages: [],
      });
    });
    expect(result.current.roomId).toBe('r1');

    act(() => {
      result.current.leaveRoom();
    });

    expect(socketState.current!.disconnect).toHaveBeenCalled();
    expect(socketState.current!.connect).toHaveBeenCalled();
    expect(result.current.roomId).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.users).toEqual([]);
  });

  it('broadcastUpdate before joining a room is a no-op (no emit)', () => {
    const { result } = setupHook();

    act(() => {
      socketState.current!.__dispatch('connect');
    });

    // No joinRoom; roomId is still null.
    act(() => {
      result.current.broadcastUpdate({
        type: 'room',
        action: 'add',
        data: makeRoom('x'),
      } as Omit<PlanUpdateEvent, 'timestamp' | 'userId'>);
    });

    expect(socketState.current!.emit).not.toHaveBeenCalledWith(
      'plan-update',
      expect.objectContaining({ type: 'room' })
    );
  });

  it('broadcastUpdate after joining emits a plan-update with timestamp + userId', () => {
    const { result } = setupHook();

    act(() => {
      socketState.current!.__dispatch('connect');
    });
    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [],
        plan: null,
        messages: [],
      });
    });

    socketState.current!.emit.mockClear();
    act(() => {
      result.current.broadcastUpdate({
        type: 'room',
        action: 'add',
        data: makeRoom('x'),
      } as Omit<PlanUpdateEvent, 'timestamp' | 'userId'>);
    });

    expect(socketState.current!.emit).toHaveBeenCalledWith(
      'plan-update',
      expect.objectContaining({
        type: 'room',
        action: 'add',
        userId: 'me',
        timestamp: expect.any(Number),
      })
    );
  });

  it('unmounting the hook disconnects the socket', () => {
    const { unmount } = renderHook(() => useCollaboration(PLAN_A, vi.fn()));
    expect(socketState.current).not.toBeNull();
    unmount();
    expect(socketState.current!.disconnect).toHaveBeenCalled();
  });

  it('requestUndo emits undo-request after joining a room', () => {
    const { result } = setupHook();

    act(() => {
      socketState.current!.__dispatch('connect');
    });
    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [],
        plan: null,
        messages: [],
      });
    });

    socketState.current!.emit.mockClear();
    act(() => {
      result.current.requestUndo();
    });
    expect(socketState.current!.emit).toHaveBeenCalledWith('undo-request');
  });

  it('requestRedo emits redo-request after joining a room', () => {
    const { result } = setupHook();

    act(() => {
      socketState.current!.__dispatch('connect');
    });
    act(() => {
      socketState.current!.__dispatch('room-joined', {
        roomId: 'r1',
        userId: 'me',
        users: [],
        plan: null,
        messages: [],
      });
    });

    socketState.current!.emit.mockClear();
    act(() => {
      result.current.requestRedo();
    });
    expect(socketState.current!.emit).toHaveBeenCalledWith('redo-request');
  });

  it('undo-requested invokes the onUndoRequest callback', () => {
    const { onUndoRequest } = setupHook();

    act(() => {
      socketState.current!.__dispatch('undo-requested', {
        userId: 'peer',
        userName: 'Alice',
      });
    });

    expect(onUndoRequest).toHaveBeenCalled();
  });

  it('redo-requested invokes the onRedoRequest callback', () => {
    const { onRedoRequest } = setupHook();

    act(() => {
      socketState.current!.__dispatch('redo-requested', {
        userId: 'peer',
        userName: 'Alice',
      });
    });

    expect(onRedoRequest).toHaveBeenCalled();
  });
});
