import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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
