import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Canvas } from './Canvas';
import type { FloorPlan, Room } from '../types';

// U-12 regression tests. Canvas is the visible surface where the
// empty-state hint lives; Room.tsx's own tests already cover the
// per-room rendering. The hint must:
//   - render when no rooms are on the current floor
//   - NOT render when at least one room is on the current floor
//
// We render Canvas with the minimal prop set (the rest have sensible
// defaults). onUpdateRoom/onSelectRoom are no-ops; selectedRoomIds
// is empty; the plan has a single 0th-floor room in the populated
// test, no rooms in the empty test.

// Stub RoomElement-like children (VastuGrid, Compass, RulerOverlay,
// RoadIndicator, Room) so the test doesn't need to stand up the full
// drag / vastu surface. The component tree is large enough that
// stubbing keeps the test focused on the empty-state branch.
vi.mock('./VastuGrid', () => ({ VastuGrid: () => null }));
vi.mock('./Compass', () => ({ Compass: () => null }));
vi.mock('./RulerOverlay', () => ({ RulerOverlay: () => null }));
vi.mock('./RoadIndicator', () => ({ RoadIndicator: () => null }));
vi.mock('./Room', () => ({ Room: () => null }));

const basePlan: FloorPlan = {
  plotWidth: 30,
  plotHeight: 40,
  northAngle: 0,
  roadDirection: 'N',
  unit: 'ft',
  setbacks: { top: 3, right: 3, bottom: 3, left: 3 },
  layers: [],
  comments: [],
  rooms: [],
};

const baseProps = (plan: FloorPlan, currentFloor: number) => ({
  plan,
  currentFloor,
  zoom: 1,
  onUpdateRoom: vi.fn(),
  onSelectRoom: vi.fn(),
  selectedRoomIds: [],
});

// B-8: deterministic layout for the canvas root div so marquee tests can
// map client coordinates to feet (20 px/ft at zoom=1). Tests restore the
// original getBoundingClientRect after each scenario.
const CANVAS_RECT = {
  left: 0,
  top: 0,
  width: 600,
  height: 800,
  right: 600,
  bottom: 800,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

function mockCanvasRect(canvas: HTMLElement) {
  const original = canvas.getBoundingClientRect;
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => CANVAS_RECT,
    configurable: true,
  });
  return () => {
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: original,
      configurable: true,
    });
  };
}

const planWithRooms: FloorPlan = {
  ...basePlan,
  rooms: [
    { id: 'r1', type: 'Bedroom', x: 3, y: 3, w: 6, h: 6, floor: 0, wallThickness: 9 },
    { id: 'r2', type: 'Kitchen', x: 15, y: 15, w: 6, h: 6, floor: 0, wallThickness: 9 },
    { id: 'r3', type: 'Living Room', x: 3, y: 15, w: 4, h: 4, floor: 0, wallThickness: 9 },
  ],
};

describe('Canvas (U-12: empty-state hint)', () => {
  it('renders the empty-state hint when no rooms are on the current floor (U-12)', () => {
    // Plan has no rooms at all → floorRooms is empty on every floor.
    // The hint should appear on the 1st floor too (a fresh floor in
    // a building that has 0th-floor rooms would also be empty).
    const { container } = render(<Canvas {...baseProps(basePlan, 0)} />);
    const hint = container.querySelector('[data-testid="canvas-empty-state"]');
    expect(hint).not.toBeNull();
    expect(hint!.textContent).toMatch(/No rooms on this floor yet/);
  });

  it('does NOT render the empty-state hint when at least one room is on the current floor (U-12)', () => {
    // Add a single 0th-floor room. The 0th floor is no longer empty,
    // so the hint must not appear. Switching to floor 1 (also empty)
    // would re-show it — that's the other test.
    const room: Room = {
      id: 'r1',
      type: 'Bedroom',
      x: 3,
      y: 3,
      w: 10,
      h: 10,
      floor: 0,
      wallThickness: 9,
    };
    const planWithRoom: FloorPlan = { ...basePlan, rooms: [room] };
    const { container } = render(<Canvas {...baseProps(planWithRoom, 0)} />);
    const hint = container.querySelector('[data-testid="canvas-empty-state"]');
    expect(hint).toBeNull();
  });
});

describe('Canvas (B-8: marquee drag-select)', () => {
  it('background click clears the current selection', () => {
    const onSelectRoom = vi.fn();
    const { container } = render(
      <Canvas {...baseProps(basePlan, 0)} onSelectRoom={onSelectRoom} />
    );
    const canvas = container.firstChild as HTMLElement;
    const restore = mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });

    expect(onSelectRoom).toHaveBeenCalledWith(null);
    restore();
  });

  it('drag-selects a room when the marquee overlaps it', () => {
    const onSelectMany = vi.fn();
    const onSelectRoom = vi.fn();
    const { container } = render(
      <Canvas
        {...baseProps(planWithRooms, 0)}
        onSelectMany={onSelectMany}
        onSelectRoom={onSelectRoom}
      />
    );
    const canvas = container.firstChild as HTMLElement;
    const restore = mockCanvasRect(canvas);

    // Marquee from (1ft,1ft) to (12ft,12ft) overlaps r1 at (3,3,6,6).
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20 });
    fireEvent.pointerMove(window, { clientX: 240, clientY: 240 });
    fireEvent.pointerUp(window, { clientX: 240, clientY: 240 });

    expect(onSelectRoom).toHaveBeenCalledWith(null);
    expect(onSelectMany).toHaveBeenCalledWith(['r1'], false);
    restore();
  });

  it('shift+drag adds overlapping rooms without clearing the existing selection', () => {
    const onSelectMany = vi.fn();
    const onSelectRoom = vi.fn();
    const { container } = render(
      <Canvas
        {...baseProps(planWithRooms, 0)}
        selectedRoomIds={['r2']}
        onSelectMany={onSelectMany}
        onSelectRoom={onSelectRoom}
      />
    );
    const canvas = container.firstChild as HTMLElement;
    const restore = mockCanvasRect(canvas);

    // Shift+drag from (1ft,1ft) to (12ft,12ft) overlaps r1 only.
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20, shiftKey: true });
    fireEvent.pointerMove(window, { clientX: 240, clientY: 240, shiftKey: true });
    fireEvent.pointerUp(window, { clientX: 240, clientY: 240, shiftKey: true });

    // Selection was not cleared at pointerdown because shift was held.
    expect(onSelectRoom).not.toHaveBeenCalled();
    expect(onSelectMany).toHaveBeenCalledWith(['r1'], true);
    restore();
  });

  it('selects multiple rooms that fall inside a large marquee', () => {
    const onSelectMany = vi.fn();
    const { container } = render(
      <Canvas {...baseProps(planWithRooms, 0)} onSelectMany={onSelectMany} />
    );
    const canvas = container.firstChild as HTMLElement;
    const restore = mockCanvasRect(canvas);

    // Marquee covering r1 (3,3,6,6), r2 (15,15,6,6) and r3 (3,15,4,4).
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { clientX: 500, clientY: 500 });
    fireEvent.pointerUp(window, { clientX: 500, clientY: 500 });

    expect(onSelectMany).toHaveBeenCalledWith(['r1', 'r2', 'r3'], false);
    restore();
  });

  it('does not start marquee in measuring mode', () => {
    const onSelectRoom = vi.fn();
    const onSelectMany = vi.fn();
    const setMeasuring = vi.fn();
    const { container } = render(
      <Canvas
        {...baseProps(basePlan, 0)}
        measuring={true}
        setMeasuring={setMeasuring}
        onSelectRoom={onSelectRoom}
        onSelectMany={onSelectMany}
      />
    );
    const canvas = container.firstChild as HTMLElement;
    const restore = mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 20 });

    expect(onSelectRoom).not.toHaveBeenCalled();
    expect(onSelectMany).not.toHaveBeenCalled();
    expect(setMeasuring).not.toHaveBeenCalled(); // first point sets measureStart
    restore();
  });

  it('renders the live marquee overlay while dragging', () => {
    const { container } = render(<Canvas {...baseProps(planWithRooms, 0)} />);
    const canvas = container.firstChild as HTMLElement;
    const restore = mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20 });
    expect(container.querySelector('[data-testid="canvas-marquee"]')).not.toBeNull();

    fireEvent.pointerMove(window, { clientX: 240, clientY: 240 });
    const marquee = container.querySelector('[data-testid="canvas-marquee"]') as HTMLElement;
    expect(marquee).not.toBeNull();
    expect(marquee.style.width).toBe('220px'); // 11ft * 20px
    expect(marquee.style.height).toBe('220px');

    fireEvent.pointerUp(window, { clientX: 240, clientY: 240 });
    expect(container.querySelector('[data-testid="canvas-marquee"]')).toBeNull();
    restore();
  });
});
