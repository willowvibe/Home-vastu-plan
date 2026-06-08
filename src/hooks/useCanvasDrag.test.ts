import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCanvasDrag } from './useCanvasDrag';

const PLAN = {
  rooms: [
    { id: 'r1', type: 'Bedroom' as const, x: 0, y: 0, w: 10, h: 10, floor: 0, wallThickness: 9 },
  ],
  plotWidth: 30,
  plotHeight: 40,
  setbacks: { top: 0, bottom: 0, left: 0, right: 0 },
  unit: 'ft' as const,
  northAngle: 0,
  layers: [],
  roadDirection: 'N' as const,
  comments: [],
};

describe('useCanvasDrag (B-5: no drag in non-edit mode)', () => {
  const setup = (appMode: 'edit' | 'view' | 'comment') => {
    const onUpdateRoom = vi.fn();
    const ref = renderHook(
      ({ mode }) => {
        return useCanvasDrag({
          plan: PLAN,
          currentFloor: 0,
          pixelsPerFoot: 20,
          snapToGrid: true,
          canvasRef: { current: null } as React.RefObject<HTMLDivElement | null>,
          onUpdateRoom,
          appMode: mode,
        });
      },
      { initialProps: { mode: appMode } }
    );
    return { ...ref, onUpdateRoom };
  };

  it('does not start a drag in view mode (draggingRoom stays null)', () => {
    const { result } = setup('view');
    expect(result.current.draggingRoom).toBeNull();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 10, clientY: 10, target: null, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    // The B-5 gate makes handlePointerDown a no-op in view mode, so
    // draggingRoom is still null and onUpdateRoom was never called.
    expect(result.current.draggingRoom).toBeNull();
    expect(result.current.resizingRoom).toBeNull();
  });

  it('does not start a drag in comment mode', () => {
    const { result } = setup('comment');
    act(() => {
      result.current.handlePointerDown(
        { clientX: 10, clientY: 10, target: null, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    expect(result.current.draggingRoom).toBeNull();
  });

  it('starts a drag in edit mode (smoke test that the gate does not break the happy path)', () => {
    const { result } = setup('edit');
    act(() => {
      result.current.handlePointerDown(
        { clientX: 10, clientY: 10, target: null, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    // In edit mode, draggingRoom is set to the room id.
    expect(result.current.draggingRoom).toBe('r1');
  });
});
