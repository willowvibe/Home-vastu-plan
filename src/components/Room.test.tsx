import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Room } from './Room';
import type { Room as RoomType } from '../types';

// Mock the vastu service so the test can count calls. The real
// analyzeRoomVastu is already covered in src/services/vastu.test.ts —
// these tests focus on Room.tsx's memoization policy.
const analyzeRoomVastu = vi.fn();
vi.mock('../services/vastu', () => ({
  analyzeRoomVastu: (...args: unknown[]) => analyzeRoomVastu(...args),
}));

// RoomElement has its own internal state/handlers; stub it to a no-op so
// the tests can render Room without standing up the full drag surface.
vi.mock('./RoomElement', () => ({
  RoomElement: () => null,
}));

// Stable, identity-equal result for the spy. The memo will return THIS
// object reference on a cache hit — re-render assertions rely on that.
const STABLE_RESULT = {
  score: 100,
  status: 'good' as const,
  idealDirections: ['SE'],
  currentDirection: 'SE' as const,
  feedback: 'mocked',
};

const STABLE_ROOM: RoomType = {
  id: 'r1',
  type: 'Kitchen',
  x: 5,
  y: 5,
  w: 10,
  h: 10,
  floor: 0,
  wallThickness: 9,
};

const baseProps = () => ({
  pixelsPerFoot: 20,
  isSelected: false,
  // Stable callback/floor refs so other memos in Room stay quiet.
  floorRooms: [] as RoomType[],
  onPointerDown: vi.fn(),
  onElementPointerDown: vi.fn(),
  onUpdateRoom: vi.fn(),
});

beforeEach(() => {
  analyzeRoomVastu.mockReset();
  analyzeRoomVastu.mockReturnValue(STABLE_RESULT);
});

describe('Room (B-13: vastu useMemo dep narrowing)', () => {
  it('memo re-uses vastu result when plan ref changes but plot dims are stable', () => {
    // B-13 regression case. The old dep `[room, plan]` re-ran on every
    // drag tick because updatePlan allocates a new plan reference each
    // time. plotWidth/plotHeight/northAngle don't change during a drag.
    const planA = { plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' as const };
    const planB = { plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'm' as const };

    const { rerender } = render(<Room room={STABLE_ROOM} plan={planA as any} {...baseProps()} />);
    expect(analyzeRoomVastu).toHaveBeenCalledTimes(1);

    // New plan object reference, same plot primitives, different unit
    // (the unit field is NOT a vastu input — confirms we didn't over-narrow).
    rerender(<Room room={STABLE_ROOM} plan={planB as any} {...baseProps()} />);
    expect(analyzeRoomVastu).toHaveBeenCalledTimes(1);
  });

  it('re-runs vastu when plotWidth changes (plot resized)', () => {
    const planA = { plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' as const };
    const planB = { plotWidth: 60, plotHeight: 40, northAngle: 0, unit: 'ft' as const };

    const { rerender } = render(<Room room={STABLE_ROOM} plan={planA as any} {...baseProps()} />);
    expect(analyzeRoomVastu).toHaveBeenCalledTimes(1);

    rerender(<Room room={STABLE_ROOM} plan={planB as any} {...baseProps()} />);
    expect(analyzeRoomVastu).toHaveBeenCalledTimes(2);
  });

  it('re-runs vastu when the room moves', () => {
    const plan = { plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' as const };
    const moved: RoomType = { ...STABLE_ROOM, x: 15 };

    const { rerender } = render(<Room room={STABLE_ROOM} plan={plan as any} {...baseProps()} />);
    expect(analyzeRoomVastu).toHaveBeenCalledTimes(1);

    rerender(<Room room={moved} plan={plan as any} {...baseProps()} />);
    expect(analyzeRoomVastu).toHaveBeenCalledTimes(2);
  });

  it('re-runs vastu when northAngle changes (compass rotated)', () => {
    const planA = { plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' as const };
    const planB = { plotWidth: 30, plotHeight: 40, northAngle: 45, unit: 'ft' as const };

    const { rerender } = render(<Room room={STABLE_ROOM} plan={planA as any} {...baseProps()} />);
    expect(analyzeRoomVastu).toHaveBeenCalledTimes(1);

    rerender(<Room room={STABLE_ROOM} plan={planB as any} {...baseProps()} />);
    expect(analyzeRoomVastu).toHaveBeenCalledTimes(2);
  });
});
