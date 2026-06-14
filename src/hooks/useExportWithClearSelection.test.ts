import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExportWithClearSelection } from './useExportWithClearSelection';

describe('useExportWithClearSelection', () => {
  // Stub rAF so we can flush it deterministically.
  let rafCallbacks: FrameRequestCallback[] = [];
  let nextRafId = 1;
  beforeEach(() => {
    rafCallbacks = [];
    nextRafId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return nextRafId++;
    });
    vi.stubGlobal('cancelAnimationFrame', (_id: number) => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function flushRaf() {
    act(() => {
      const cbs = rafCallbacks;
      rafCallbacks = [];
      cbs.forEach((cb) => cb(performance.now()));
    });
  }

  it('clears selection before export, restores after via rAF', async () => {
    const exportFn = vi.fn().mockResolvedValue(undefined);
    const onStaleSelection = vi.fn();
    const setSelectedRoomIds = vi.fn();
    const { result } = renderHook(() =>
      useExportWithClearSelection({ exportFn, onStaleSelection })
    );

    await act(async () => {
      await result.current.runExport({ prevSelectedId: 'r1', setSelectedRoomIds });
    });

    // exportFn was called once.
    expect(exportFn).toHaveBeenCalledTimes(1);
    // rAF was scheduled exactly once (the restore).
    expect(rafCallbacks).toHaveLength(1);
    // setSelectedRoomIds was called once with [] (the clear) BEFORE
    // the rAF flush. The restore call happens inside rAF, so we flush
    // and then re-check.
    expect(setSelectedRoomIds).toHaveBeenCalledTimes(1);
    expect(setSelectedRoomIds).toHaveBeenCalledWith([]);
    flushRaf();
    // After rAF: the restore call with ['r1'] happened.
    expect(setSelectedRoomIds).toHaveBeenCalledTimes(2);
    expect(setSelectedRoomIds).toHaveBeenLastCalledWith(['r1']);
    // onStaleSelection is NOT called when the room is still there.
    expect(onStaleSelection).not.toHaveBeenCalled();
  });

  it('calls onStaleSelection when the previously-selected id is gone at restore time', async () => {
    const exportFn = vi.fn().mockResolvedValue(undefined);
    const onStaleSelection = vi.fn();
    const setSelectedRoomIds = vi.fn();
    // Simulate the parent: the previous id was 'r1', but by the time
    // the restore runs, the parent no longer has that room in its plan.
    // The hook checks this via the `isRoomStillPresent` callback.
    const isRoomStillPresent = vi.fn().mockReturnValue(false);
    const { result } = renderHook(() =>
      useExportWithClearSelection({ exportFn, onStaleSelection })
    );

    await act(async () => {
      await result.current.runExport({
        prevSelectedId: 'r1',
        setSelectedRoomIds,
        isRoomStillPresent,
      });
    });

    flushRaf();
    // The restore was attempted but isRoomStillPresent said no, so
    // onStaleSelection is called.
    expect(onStaleSelection).toHaveBeenCalledTimes(1);
    // setSelectedRoomIds is NOT called with ['r1'] when the room is gone.
    expect(setSelectedRoomIds).not.toHaveBeenCalledWith(['r1']);
  });

  it('unmount during export is safe (no setState-after-unmount warning)', async () => {
    const exportFn = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50)));
    const onStaleSelection = vi.fn();
    const setSelectedRoomIds = vi.fn();
    const { result, unmount } = renderHook(() =>
      useExportWithClearSelection({ exportFn, onStaleSelection })
    );

    // Start the export; do NOT await — unmount immediately.
    act(() => {
      result.current.runExport({ prevSelectedId: 'r1', setSelectedRoomIds });
    });
    unmount();

    // Flush the rAF: it should be a no-op (the mountedRef is false).
    flushRaf();
    // setSelectedRoomIds was called with [] (the clear) but NOT with
    // ['r1'] (the restore is gated on mountedRef).
    expect(setSelectedRoomIds).toHaveBeenCalledWith([]);
    expect(setSelectedRoomIds).not.toHaveBeenCalledWith(['r1']);
  });

  it('rAF is used instead of setTimeout (no 50ms wall-clock wait)', async () => {
    const exportFn = vi.fn().mockResolvedValue(undefined);
    const onStaleSelection = vi.fn();
    const setSelectedRoomIds = vi.fn();
    const { result } = renderHook(() =>
      useExportWithClearSelection({ exportFn, onStaleSelection })
    );

    await act(async () => {
      await result.current.runExport({ prevSelectedId: 'r1', setSelectedRoomIds });
    });

    // rAF was scheduled (we can flush it without waiting 50ms).
    expect(rafCallbacks.length).toBeGreaterThanOrEqual(1);
  });
});
