import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCanvasDrag, getEffectiveWalls } from './useCanvasDrag';
import type { Room } from '../types';

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

describe('getEffectiveWalls (S-9: shared walls)', () => {
  // 9 inch wall = 0.75 ft. Shared side gets 0.375 ft.
  const WALL = 0.75;
  const SHARED = WALL / 2;

  const r1: Room = {
    id: 'r1',
    type: 'Bedroom',
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    floor: 0,
    wallThickness: 9,
  };

  it('returns full wall on every side when the room is alone', () => {
    expect(getEffectiveWalls(r1, [])).toEqual({
      top: WALL,
      right: WALL,
      bottom: WALL,
      left: WALL,
    });
  });

  it('halves the right wall when a room abuts on the right', () => {
    // A second room whose left edge sits exactly at r1's right edge.
    const neighbor: Room = {
      id: 'r2',
      type: 'Bedroom',
      x: 10,
      y: 0,
      w: 10,
      h: 10,
      floor: 0,
      wallThickness: 9,
    };
    const walls = getEffectiveWalls(r1, [neighbor]);
    expect(walls.right).toBeCloseTo(SHARED);
    expect(walls.left).toBeCloseTo(WALL);
    expect(walls.top).toBeCloseTo(WALL);
    expect(walls.bottom).toBeCloseTo(WALL);
  });

  it('halves both walls when rooms are flush on top and bottom', () => {
    const top: Room = {
      id: 't',
      type: 'Bedroom',
      x: 0,
      y: -10,
      w: 10,
      h: 10,
      floor: 0,
      wallThickness: 9,
    };
    const bottom: Room = {
      id: 'b',
      type: 'Bedroom',
      x: 0,
      y: 10,
      w: 10,
      h: 10,
      floor: 0,
      wallThickness: 9,
    };
    const walls = getEffectiveWalls(r1, [top, bottom]);
    expect(walls.top).toBeCloseTo(SHARED);
    expect(walls.bottom).toBeCloseTo(SHARED);
    expect(walls.left).toBeCloseTo(WALL);
    expect(walls.right).toBeCloseTo(WALL);
  });

  it('ignores other rooms that are not flush on any side', () => {
    // Same floor, but offset 1 ft in both axes (no shared wall).
    const farNeighbor: Room = {
      id: 'f',
      type: 'Bedroom',
      x: 12,
      y: 0,
      w: 5,
      h: 5,
      floor: 0,
      wallThickness: 9,
    };
    const walls = getEffectiveWalls(r1, [farNeighbor]);
    expect(walls).toEqual({ top: WALL, right: WALL, bottom: WALL, left: WALL });
  });
});
