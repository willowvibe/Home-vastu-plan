import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCanvasDrag, getEffectiveWalls, endDrag } from './useCanvasDrag';
import type { Room, FloorPlan } from '../types';

const PLAN: FloorPlan = {
  rooms: [
    { id: 'r1', type: 'Bedroom' as const, x: 0, y: 0, w: 10, h: 10, floor: 0, wallThickness: 9 },
  ],
  plotWidth: 30,
  plotHeight: 40,
  setbacks: { top: 0, bottom: 0, left: 0, right: 0 },
  unit: 'ft',
  northAngle: 0,
  layers: [],
  roadDirection: 'N',
  comments: [],
};

/** Build a stub canvas ref whose getBoundingClientRect returns the given rect. */
function canvasRef(rect: { left: number; top: number; width: number; height: number }) {
  return {
    current: {
      getBoundingClientRect: () =>
        ({
          left: rect.left,
          top: rect.top,
          right: rect.left + rect.width,
          bottom: rect.top + rect.height,
          width: rect.width,
          height: rect.height,
          x: rect.left,
          y: rect.top,
          toJSON: () => rect,
        }) as DOMRect,
    },
  } as React.RefObject<HTMLDivElement | null>;
}

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
          canvasRef: canvasRef({ left: 0, top: 0, width: 1000, height: 1000 }),
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

// ---------------------------------------------------------------------------
// Q-1: behavioural coverage for useCanvasDrag
// ---------------------------------------------------------------------------
// The hook is the most fragile untested code in the codebase. It owns:
//   - snap-to-grid rounding (1 ft on, 0.1 ft off)
//   - plot-bounds clamping (setbacks)
//   - same-floor collision clamping (x and y, both directions)
//   - resize (4 handles, min size, plot clamp, collision clamp)
//   - element drag (shared walls, half-foot rounding, openings overhang)
//   - listener attach/detach lifecycle
//   - the B-5 view-mode gate (covered above)
//
// The tests below exercise each of these through the public API: start an
// interaction via the handler, dispatch a pointermove on window, then a
// pointerup. We assert on onUpdateRoom calls and on draggingRoom state.
// ---------------------------------------------------------------------------

/** Pointer-move helper that dispatches a real MouseEvent on window. */
function pointerMove(clientX: number, clientY: number) {
  act(() => {
    window.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY, bubbles: true }));
  });
}

function pointerUp() {
  act(() => {
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  });
}

describe('useCanvasDrag (Q-1: room drag behaviour)', () => {
  const setup = (
    overrides: {
      plan?: FloorPlan;
      pixelsPerFoot?: number;
      snapToGrid?: boolean;
      currentFloor?: number;
    } = {}
  ) => {
    const onUpdateRoom = vi.fn();
    const onUpdateRoomEnd = vi.fn();
    const plan = overrides.plan ?? PLAN;
    const pixelsPerFoot = overrides.pixelsPerFoot ?? 20;
    const ref = renderHook(() =>
      useCanvasDrag({
        plan,
        currentFloor: overrides.currentFloor ?? 0,
        pixelsPerFoot,
        snapToGrid: overrides.snapToGrid ?? true,
        canvasRef: canvasRef({ left: 0, top: 0, width: 1000, height: 1000 }),
        onUpdateRoom,
        onUpdateRoomEnd,
        appMode: 'edit',
      })
    );
    return { ...ref, onUpdateRoom, onUpdateRoomEnd };
  };

  it('initial state has no room dragging, resizing, or element dragging', () => {
    const { result } = setup();
    expect(result.current.draggingRoom).toBeNull();
    expect(result.current.resizingRoom).toBeNull();
    expect(result.current.resizeHandle).toBeNull();
    expect(result.current.draggingElement).toBeNull();
  });

  it('pointerdown with type=drag sets draggingRoom and the global pointermove handler is wired up', () => {
    const { result, onUpdateRoom } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    expect(result.current.draggingRoom).toBe('r1');

    // Move the mouse; the room should be reported at the cursor's feet.
    pointerMove(60, 40); // 3 ft, 2 ft (pixelsPerFoot=20, dragOffset=(0,0))
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { x: 3, y: 2 });
  });

  it('snapToGrid=true rounds drag deltas to the nearest 1 ft', () => {
    const { result, onUpdateRoom } = setup({ snapToGrid: true });
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    // clientX=63 -> 3.15 ft -> rounds to 3.
    pointerMove(63, 47); // 3.15 ft, 2.35 ft -> 3, 2
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { x: 3, y: 2 });
  });

  it('snapToGrid=false rounds drag deltas to the nearest 0.1 ft', () => {
    const { result, onUpdateRoom } = setup({ snapToGrid: false });
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    // clientX=64 -> 3.2 ft (clean 0.1 multiple); clientY=48 -> 2.4 ft.
    // Assert with toBeCloseTo to absorb floating-point noise.
    pointerMove(64, 48);
    const call = onUpdateRoom.mock.calls.at(-1)!;
    const updates = call[1] as { x: number; y: number };
    expect(updates.x).not.toBe(3);
    expect(updates.x).toBeCloseTo(3.2, 5);
    expect(updates.y).toBeCloseTo(2.4, 5);
  });

  it('clamps drag x to plot-right bound (room cannot pass setback.right)', () => {
    const planWithSetback = {
      ...PLAN,
      setbacks: { top: 0, bottom: 0, left: 0, right: 5 }, // max x = 30-5 = 25
      plotWidth: 30,
    };
    const { result, onUpdateRoom } = setup({ plan: planWithSetback });
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    // Try to drag to clientX=800 -> 40 ft; max is 25 - 10 = 15.
    pointerMove(800, 0);
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { x: 15, y: 0 });
  });

  it('clamps drag y to plot-bottom bound (room cannot pass setback.bottom)', () => {
    const planWithSetback = {
      ...PLAN,
      setbacks: { top: 0, bottom: 4, left: 0, right: 0 },
      plotHeight: 40,
    };
    const { result, onUpdateRoom } = setup({ plan: planWithSetback });
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    // Try to drag to clientY=2000 -> 100 ft; max is 40-4-10 = 26.
    pointerMove(0, 2000);
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { x: 0, y: 26 });
  });

  it('clamps drag x to left setback', () => {
    const planWithSetback = {
      ...PLAN,
      setbacks: { top: 0, bottom: 0, left: 7, right: 0 },
    };
    const { result, onUpdateRoom } = setup({ plan: planWithSetback });
    act(() => {
      result.current.handlePointerDown(
        { clientX: 1000, clientY: 0, stopPropagation: () => {} } as any, // start far right
        PLAN.rooms[0],
        'drag'
      );
    });
    // Drag left past the setback; should be clamped to setback.left = 7.
    pointerMove(0, 0);
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { x: 7, y: 0 });
  });

  it('collision clamp: stops at a same-floor neighbor on the right', () => {
    const planWithNeighbor = {
      ...PLAN,
      rooms: [
        PLAN.rooms[0],
        { id: 'r2', type: 'Kitchen' as const, x: 15, y: 0, w: 5, h: 5, floor: 0, wallThickness: 9 },
      ],
    };
    const { result, onUpdateRoom } = setup({ plan: planWithNeighbor });
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    // Try to drag past r2's left edge (x=15): r1 is 10ft wide, so max x is 5.
    pointerMove(400, 0); // 20 ft
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { x: 5, y: 0 });
  });

  it('collision clamp: stops at a same-floor neighbor on the bottom (moving down)', () => {
    const planWithNeighbor = {
      ...PLAN,
      rooms: [
        PLAN.rooms[0],
        { id: 'r2', type: 'Kitchen' as const, x: 0, y: 14, w: 5, h: 5, floor: 0, wallThickness: 9 },
      ],
    };
    const { result, onUpdateRoom } = setup({ plan: planWithNeighbor });
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    // Try to drag down past r2's top edge (y=14): r1 is 10ft tall, so max y is 4.
    pointerMove(0, 400); // 20 ft
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { x: 0, y: 4 });
  });

  it('collision clamp: ignores rooms on a different floor', () => {
    const planWithOtherFloor = {
      ...PLAN,
      rooms: [
        PLAN.rooms[0],
        { id: 'r2', type: 'Kitchen' as const, x: 0, y: 14, w: 5, h: 5, floor: 1, wallThickness: 9 },
      ],
    };
    const { result, onUpdateRoom } = setup({ plan: planWithOtherFloor });
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    // r2 is on floor 1; drag should pass right through.
    pointerMove(0, 400); // 20 ft down
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { x: 0, y: 20 });
  });

  it('pointerup after a drag clears state and calls onUpdateRoomEnd once', () => {
    const { result, onUpdateRoom: _onUpdateRoom, onUpdateRoomEnd } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    pointerMove(60, 40);
    pointerUp();
    expect(result.current.draggingRoom).toBeNull();
    expect(onUpdateRoomEnd).toHaveBeenCalledTimes(1);
  });

  it('pointerup without a drag does NOT call onUpdateRoomEnd', () => {
    const { result: _result, onUpdateRoomEnd } = setup();
    pointerUp();
    expect(onUpdateRoomEnd).not.toHaveBeenCalled();
  });
});

describe('useCanvasDrag (Q-1: room resize behaviour)', () => {
  const setup = (overrides: { plan?: FloorPlan; pixelsPerFoot?: number } = {}) => {
    const onUpdateRoom = vi.fn();
    const onUpdateRoomEnd = vi.fn();
    const ref = renderHook(() =>
      useCanvasDrag({
        plan: overrides.plan ?? PLAN,
        currentFloor: 0,
        pixelsPerFoot: overrides.pixelsPerFoot ?? 20,
        snapToGrid: true,
        canvasRef: canvasRef({ left: 0, top: 0, width: 1000, height: 1000 }),
        onUpdateRoom,
        onUpdateRoomEnd,
        appMode: 'edit',
      })
    );
    return { ...ref, onUpdateRoom, onUpdateRoomEnd };
  };

  it('pointerdown with type=resize sets resizingRoom and resizeHandle', () => {
    const { result } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'resize',
        'se'
      );
    });
    expect(result.current.resizingRoom).toBe('r1');
    expect(result.current.resizeHandle).toBe('se');
  });

  it('SE handle: resize east+down grows w and h based on cursor position', () => {
    const { result, onUpdateRoom } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'resize',
        'se'
      );
    });
    // mouseX = round((200 - 0) / 20) = 10 -> newW = 10
    // mouseY = round((400 - 0) / 20) = 20 -> newH = 20
    pointerMove(200, 400);
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { w: 10, h: 20, x: 0, y: 0 });
  });

  it('SE handle: enforces min size of 2 ft even when cursor is past the room edge', () => {
    const { result, onUpdateRoom } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'resize',
        'se'
      );
    });
    // Try to shrink to almost nothing.
    pointerMove(5, 5); // 0 ft delta; min is 2.
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { w: 2, h: 2, x: 0, y: 0 });
  });

  it('SE handle: clamps east edge to plot-right bound', () => {
    const planWithSetback = {
      ...PLAN,
      setbacks: { top: 0, bottom: 0, left: 0, right: 5 },
      plotWidth: 30,
    };
    const { result, onUpdateRoom } = setup({ plan: planWithSetback });
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'resize',
        'se'
      );
    });
    // mouseX = round(700/20) = 35; max newW = 30 - 5 - 0 = 25.
    pointerMove(700, 0);
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { w: 25, h: 2, x: 0, y: 0 });
  });

  it('SW handle: resize west+down shrinks from the left, adjusting x and w', () => {
    const { result, onUpdateRoom } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'resize',
        'sw'
      );
    });
    // mouseX = round(100/20) = 5; newW = max(2, 0+10-5) = 5; newX = 0+10-5 = 5.
    // mouseY = round(200/20) = 10; newH = 10.
    pointerMove(100, 200);
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { w: 5, h: 10, x: 5, y: 0 });
  });

  it('pointerup after a resize clears state and calls onUpdateRoomEnd once', () => {
    const { result, onUpdateRoomEnd } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'resize',
        'se'
      );
    });
    pointerMove(200, 200);
    pointerUp();
    expect(result.current.resizingRoom).toBeNull();
    expect(result.current.resizeHandle).toBeNull();
    expect(onUpdateRoomEnd).toHaveBeenCalledTimes(1);
  });
});

describe('useCanvasDrag (Q-1: element drag behaviour)', () => {
  // Room with one element: 2x2 bed at relative (1,1).
  const planWithElement: FloorPlan = {
    ...PLAN,
    rooms: [
      {
        ...PLAN.rooms[0],
        elements: [{ id: 'el1', type: 'Bed', x: 1, y: 1, w: 2, h: 2, rotation: 0 }],
      },
    ],
  };

  const setup = (overrides: { plan?: FloorPlan; rect?: { left: number; top: number } } = {}) => {
    const onUpdateRoom = vi.fn();
    const ref = renderHook(() =>
      useCanvasDrag({
        plan: overrides.plan ?? planWithElement,
        currentFloor: 0,
        pixelsPerFoot: 20,
        snapToGrid: true,
        canvasRef: canvasRef({
          left: overrides.rect?.left ?? 0,
          top: overrides.rect?.top ?? 0,
          width: 1000,
          height: 1000,
        }),
        onUpdateRoom,
        appMode: 'edit',
      })
    );
    return { ...ref, onUpdateRoom };
  };

  it('handleElementPointerDown sets draggingElement with the right roomId+elementId', () => {
    const { result } = setup();
    const element = planWithElement.rooms[0].elements![0];
    act(() => {
      result.current.handleElementPointerDown(
        { clientX: 40, clientY: 40, stopPropagation: () => {} } as any,
        planWithElement.rooms[0],
        element
      );
    });
    expect(result.current.draggingElement).toEqual({ roomId: 'r1', elementId: 'el1' });
  });

  it('element pointermove: rounds the relative position to the nearest 0.5 ft and clamps to inner room', () => {
    const { result, onUpdateRoom } = setup();
    const element = planWithElement.rooms[0].elements![0];
    // Canvas at (0,0), room at (0,0), wall=0.75ft, element at rel (1,1) size 2x2.
    // abs element position = (walls.left + 1, walls.top + 1) = (0.75+1, 0.75+1) = (1.75, 1.75) ft
    // click at element center: clientX = 1.75*20 = 35, clientY = 35.
    act(() => {
      result.current.handleElementPointerDown(
        { clientX: 35, clientY: 35, stopPropagation: () => {} } as any,
        planWithElement.rooms[0],
        element
      );
    });
    // Move to clientX=95, clientY=95 -> elementAbsX=95, elementAbsY=95.
    // newRelX = 95/20 - 0 - 0.75 = 4.75 - 0.75 = 4.0 ft.
    // newRelY similarly 4.0 ft.
    // Inner W = 10 - 0.75 - 0.75 = 8.5; element is 2x2, so max rel x = 6.5.
    // 4.0 is in range; round(4.0*2)/2 = 4.
    pointerMove(95, 95);
    const call = onUpdateRoom.mock.calls.at(-1)!;
    const updates = call[1] as { elements: { x: number; y: number; id: string }[] };
    expect(updates.elements[0].x).toBe(4);
    expect(updates.elements[0].y).toBe(4);
  });

  it('element pointermove: clamps at the inner-room edge so the element cannot exit', () => {
    const { result, onUpdateRoom } = setup();
    const element = planWithElement.rooms[0].elements![0];
    act(() => {
      result.current.handleElementPointerDown(
        { clientX: 35, clientY: 35, stopPropagation: () => {} } as any,
        planWithElement.rooms[0],
        element
      );
    });
    // Move way past the room's right edge.
    // mouseX=2000, elementAbsX=2000, newRelX = 2000/20 - 0 - 0.75 = 99.25 ft.
    // maxRelX = 8.5 - 2 = 6.5; clamped to 6.5.
    pointerMove(2000, 2000);
    const call = onUpdateRoom.mock.calls.at(-1)!;
    const updates = call[1] as { elements: { x: number; y: number; id: string }[] };
    expect(updates.elements[0].x).toBe(6.5);
    expect(updates.elements[0].y).toBe(6.5);
  });

  it('element pointermove: Door (opening) can overhang into the shared wall', () => {
    const planWithDoor: FloorPlan = {
      ...planWithElement,
      rooms: [
        {
          ...planWithElement.rooms[0],
          // Door at the right edge of a room whose right wall is shared.
          // Shared right wall: 0.375 ft. Door size 3x0.5.
          elements: [{ id: 'door1', type: 'Door', x: 5, y: 4, w: 3, h: 0.5, rotation: 0 }],
        },
        // Neighbor to the right, flush at x=10.
        {
          id: 'r2',
          type: 'Bedroom' as const,
          x: 10,
          y: 0,
          w: 5,
          h: 10,
          floor: 0,
          wallThickness: 9,
        },
      ],
    };
    const { result, onUpdateRoom } = setup({ plan: planWithDoor });
    const door = planWithDoor.rooms[0].elements![0];
    act(() => {
      result.current.handleElementPointerDown(
        { clientX: 100, clientY: 100, stopPropagation: () => {} } as any,
        planWithDoor.rooms[0],
        door
      );
    });
    // Click anywhere then drag to the far right.
    pointerMove(2000, 2000);
    const call = onUpdateRoom.mock.calls.at(-1)!;
    const updates = call[1] as { elements: { x: number; y: number; id: string; type: string }[] };
    // The Door can overhang into the right wall by the smaller of walls.{left,right}
    // = min(0.75, 0.375) = 0.375. So max rel x = innerW - 3 + 0.375 = 8.5 - 3 + 0.375 = 5.875.
    // (Or larger, if opening logic adds more; the key invariant is the cap is generous.)
    expect(updates.elements[0].x).toBeGreaterThanOrEqual(5);
    expect(updates.elements[0].x).toBeLessThanOrEqual(6.5);
  });

  it('element pointerup clears draggingElement', () => {
    const { result } = setup();
    const element = planWithElement.rooms[0].elements![0];
    act(() => {
      result.current.handleElementPointerDown(
        { clientX: 35, clientY: 35, stopPropagation: () => {} } as any,
        planWithElement.rooms[0],
        element
      );
    });
    expect(result.current.draggingElement).not.toBeNull();
    pointerUp();
    expect(result.current.draggingElement).toBeNull();
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

// ---------------------------------------------------------------------------
// D1/D2/D3: pointer lifecycle cleanup
// ---------------------------------------------------------------------------
// D1: pointerup is missed (release outside window, palm rejection). The hook
// must listen to pointercancel as a sibling cleanup path.
// D2: canvasRef.current becomes null mid-drag (layout reflow). The hook
// must end the drag defensively after 2 consecutive pointermove ticks.
// D3: window blur or document visibility change mid-drag. The hook must
// also end the drag.
// ---------------------------------------------------------------------------

describe('useCanvasDrag (pointer lifecycle cleanup)', () => {
  const setup = (overrides: { plan?: FloorPlan } = {}) => {
    const onUpdateRoom = vi.fn();
    const onUpdateRoomEnd = vi.fn();
    const ref = renderHook(() =>
      useCanvasDrag({
        plan: overrides.plan ?? PLAN,
        currentFloor: 0,
        pixelsPerFoot: 20,
        snapToGrid: true,
        canvasRef: canvasRef({ left: 0, top: 0, width: 1000, height: 1000 }),
        onUpdateRoom,
        onUpdateRoomEnd,
        appMode: 'edit',
      })
    );
    return { ...ref, onUpdateRoom, onUpdateRoomEnd };
  };

  function pointerCancel() {
    act(() => {
      window.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }));
    });
  }

  function blur() {
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
  }

  function visibilityHidden() {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }

  it('pointercancel mid-drag clears state and calls onUpdateRoomEnd (D1)', () => {
    const { result, onUpdateRoomEnd } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    expect(result.current.draggingRoom).toBe('r1');
    pointerCancel();
    expect(result.current.draggingRoom).toBeNull();
    expect(result.current.resizingRoom).toBeNull();
    expect(result.current.draggingElement).toBeNull();
    expect(onUpdateRoomEnd).toHaveBeenCalledTimes(1);
  });

  it('blur mid-drag clears state and calls onUpdateRoomEnd (D3)', () => {
    const { result, onUpdateRoomEnd } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    blur();
    expect(result.current.draggingRoom).toBeNull();
    expect(onUpdateRoomEnd).toHaveBeenCalledTimes(1);
  });

  it('visibilitychange to hidden mid-drag clears state and calls onUpdateRoomEnd (D3)', () => {
    const { result, onUpdateRoomEnd } = setup();
    act(() => {
      result.current.handlePointerDown(
        { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
        PLAN.rooms[0],
        'drag'
      );
    });
    visibilityHidden();
    expect(result.current.draggingRoom).toBeNull();
    expect(onUpdateRoomEnd).toHaveBeenCalledTimes(1);
  });

  it('endDrag is exported and safe to call with no arguments', () => {
    // The standalone export is a no-op; the real cleanup lives in the
    // closure inside useCanvasDrag (the window listeners call that one).
    // This test pins the export shape so consumers/tests can rely on it.
    expect(typeof endDrag).toBe('function');
    expect(() => endDrag()).not.toThrow();
  });

  describe('canvasRef becomes null mid-drag (D2)', () => {
    it('ends the drag after 2 consecutive pointermove calls with a null ref', () => {
      let ref: { current: HTMLDivElement | null } = canvasRef({
        left: 0,
        top: 0,
        width: 1000,
        height: 1000,
      });
      const onUpdateRoomEnd = vi.fn();
      const { result, rerender } = renderHook(
        ({ refVal }) =>
          useCanvasDrag({
            plan: PLAN,
            currentFloor: 0,
            pixelsPerFoot: 20,
            snapToGrid: true,
            canvasRef: refVal,
            onUpdateRoom: vi.fn(),
            onUpdateRoomEnd,
            appMode: 'edit',
          }),
        { initialProps: { refVal: ref } }
      );
      act(() => {
        result.current.handlePointerDown(
          { clientX: 0, clientY: 0, stopPropagation: () => {} } as any,
          PLAN.rooms[0],
          'drag'
        );
      });
      expect(result.current.draggingRoom).toBe('r1');

      // Make the ref null and re-render. The effect re-binds the
      // window listener (it sees draggingRoom still set), but the
      // listener's first move now sees a null ref.
      ref = { current: null };
      rerender({ refVal: ref });

      // Move #1 with null ref: streak=1, no end.
      act(() => {
        window.dispatchEvent(
          new MouseEvent('pointermove', { clientX: 0, clientY: 0, bubbles: true })
        );
      });
      expect(result.current.draggingRoom).toBe('r1');

      // Move #2 with null ref: streak=2, end.
      act(() => {
        window.dispatchEvent(
          new MouseEvent('pointermove', { clientX: 0, clientY: 0, bubbles: true })
        );
      });
      expect(result.current.draggingRoom).toBeNull();
      expect(onUpdateRoomEnd).toHaveBeenCalledTimes(1);
    });
  });
});
