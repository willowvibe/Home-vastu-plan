import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
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

describe('Room (B-20: outer onPointerDown bails on child click)', () => {
  // The mocks at the top of the file stub out `RoomElement` and the
  // vastu service, so we render without standing up the full drag
  // surface. We need a real <Room> that mounts the resize handles
  // (which are conditional on isSelected), so we render with
  // isSelected: true.

  it('room-body click (target === currentTarget) fires the drag handler', () => {
    const onPointerDown = vi.fn();
    const { container } = render(
      <Room
        room={STABLE_ROOM}
        plan={{ plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' } as any}
        pixelsPerFoot={20}
        isSelected={true}
        floorRooms={[]}
        onPointerDown={onPointerDown}
        onElementPointerDown={vi.fn()}
        onUpdateRoom={vi.fn()}
      />
    );
    // The room div is the top-level element with cursor-move.
    const roomDiv = container.querySelector('.cursor-move') as HTMLElement;
    expect(roomDiv).not.toBeNull();
    // fireEvent.pointerDown sets e.target to the element we fire on.
    // The handler must call onPointerDown with type='drag' because
    // target === currentTarget.
    fireEvent.pointerDown(roomDiv, { clientX: 100, clientY: 100 });
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerDown.mock.calls[0][2]).toBe('drag');
  });

  it('resize-handle click (target !== currentTarget) does NOT fire the drag handler', () => {
    const onPointerDown = vi.fn();
    const { container } = render(
      <Room
        room={STABLE_ROOM}
        plan={{ plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' } as any}
        pixelsPerFoot={20}
        isSelected={true}
        floorRooms={[]}
        onPointerDown={onPointerDown}
        onElementPointerDown={vi.fn()}
        onUpdateRoom={vi.fn()}
      />
    );
    // Resize handles are divs with cursor-nw-resize / ne-resize / sw-resize / se-resize.
    const handle = container.querySelector('.cursor-nw-resize') as HTMLElement;
    expect(handle).not.toBeNull();
    // fireEvent.pointerDown on the handle: the room div's onPointerDown
    // will fire too, but with e.target === handle (not the room div),
    // so the guard must bail. The handle's own onPointerDown (with
    // type: 'resize') will fire — that one we don't assert on here
    // because the test only counts the drag branch.
    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100 });
    // No call to onPointerDown with type='drag' from the room body.
    const dragCalls = onPointerDown.mock.calls.filter((call) => call[2] === 'drag');
    expect(dragCalls).toHaveLength(0);
    // The handle's onPointerDown with type='resize' did fire.
    const resizeCalls = onPointerDown.mock.calls.filter((call) => call[2] === 'resize');
    expect(resizeCalls.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Room (U-3: room-body click selects the room)', () => {
  // The audit found that clicking a room did nothing — the room-body
  // onPointerDown only fired the drag branch, never onSelectRoom.
  // The fix: when the user clicks the room body (target === currentTarget),
  // also call onSelectRoom(room.id, e.shiftKey). The shift branch
  // toggles the room in/out of multi-select (B-8 hook contract), so
  // plain click replaces selection and shift+click adds.

  it('room-body click calls onSelectRoom(room.id, false)', () => {
    const onSelectRoom = vi.fn();
    const { container } = render(
      <Room
        room={STABLE_ROOM}
        plan={{ plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' } as any}
        pixelsPerFoot={20}
        isSelected={false}
        floorRooms={[]}
        onPointerDown={vi.fn()}
        onElementPointerDown={vi.fn()}
        onUpdateRoom={vi.fn()}
        onSelectRoom={onSelectRoom}
      />
    );
    const roomDiv = container.querySelector('.cursor-move') as HTMLElement;
    expect(roomDiv).not.toBeNull();
    // Plain click — no shift modifier.
    fireEvent.pointerDown(roomDiv, { clientX: 100, clientY: 100, shiftKey: false });
    expect(onSelectRoom).toHaveBeenCalledTimes(1);
    expect(onSelectRoom).toHaveBeenCalledWith('r1', false);
  });

  it('shift+click on room body calls onSelectRoom(room.id, true)', () => {
    const onSelectRoom = vi.fn();
    const { container } = render(
      <Room
        room={STABLE_ROOM}
        plan={{ plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' } as any}
        pixelsPerFoot={20}
        isSelected={false}
        floorRooms={[]}
        onPointerDown={vi.fn()}
        onElementPointerDown={vi.fn()}
        onUpdateRoom={vi.fn()}
        onSelectRoom={onSelectRoom}
      />
    );
    const roomDiv = container.querySelector('.cursor-move') as HTMLElement;
    fireEvent.pointerDown(roomDiv, { clientX: 100, clientY: 100, shiftKey: true });
    expect(onSelectRoom).toHaveBeenCalledTimes(1);
    expect(onSelectRoom).toHaveBeenCalledWith('r1', true);
  });

  it('resize-handle click does NOT call onSelectRoom', () => {
    // Resize handles are children of the room div. The room-body handler
    // bails when target !== currentTarget, so the select path must not
    // fire on a handle click — only on a true body click.
    const onSelectRoom = vi.fn();
    const { container } = render(
      <Room
        room={STABLE_ROOM}
        plan={{ plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' } as any}
        pixelsPerFoot={20}
        isSelected={true}
        floorRooms={[]}
        onPointerDown={vi.fn()}
        onElementPointerDown={vi.fn()}
        onUpdateRoom={vi.fn()}
        onSelectRoom={onSelectRoom}
      />
    );
    const handle = container.querySelector('.cursor-nw-resize') as HTMLElement;
    expect(handle).not.toBeNull();
    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100, shiftKey: false });
    expect(onSelectRoom).not.toHaveBeenCalled();
  });

  it('label-span click does NOT call onSelectRoom', () => {
    // The label span is also a child of the room div. Clicks on the
    // label should not be treated as "select room" — the room-body
    // pointerdown must bail when target is the label, not the room.
    const onSelectRoom = vi.fn();
    const { container } = render(
      <Room
        room={STABLE_ROOM}
        plan={{ plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' } as any}
        pixelsPerFoot={20}
        isSelected={false}
        floorRooms={[]}
        onPointerDown={vi.fn()}
        onElementPointerDown={vi.fn()}
        onUpdateRoom={vi.fn()}
        onSelectRoom={onSelectRoom}
      />
    );
    // The first .text-xs inside the room is the type label.
    const label = container.querySelector('.text-xs') as HTMLElement;
    expect(label).not.toBeNull();
    fireEvent.pointerDown(label, { clientX: 100, clientY: 100, shiftKey: false });
    expect(onSelectRoom).not.toHaveBeenCalled();
  });

  it('does not throw if onSelectRoom is omitted (optional prop)', () => {
    // Backwards-compat: callers (e.g. the print-only Canvas in App.tsx)
    // may not wire onSelectRoom. The handler must use optional-call
    // so the room-body click is still safe in that case.
    const { container } = render(
      <Room
        room={STABLE_ROOM}
        plan={{ plotWidth: 30, plotHeight: 40, northAngle: 0, unit: 'ft' } as any}
        pixelsPerFoot={20}
        isSelected={false}
        floorRooms={[]}
        onPointerDown={vi.fn()}
        onElementPointerDown={vi.fn()}
        onUpdateRoom={vi.fn()}
        // onSelectRoom intentionally omitted
      />
    );
    const roomDiv = container.querySelector('.cursor-move') as HTMLElement;
    expect(() =>
      fireEvent.pointerDown(roomDiv, { clientX: 100, clientY: 100, shiftKey: false })
    ).not.toThrow();
  });
});
