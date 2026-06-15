import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RoomPropertiesPanel } from './RoomPropertiesPanel';
import type { FloorPlan, Room } from '../../types';

// Stub the icons (lucide-react) so the test doesn't depend on the icon
// library version. The icons are presentational; if they're missing,
// tests fail for the wrong reason.
vi.mock('lucide-react', () => ({
  Trash2: () => null,
  Copy: () => null,
  RotateCw: () => null,
}));

const baseRoom: Room = {
  id: 'r1',
  type: 'Bedroom',
  x: 0,
  y: 0,
  w: 10,
  h: 12,
  floor: 0,
  wallThickness: 9,
};

const basePlan: FloorPlan = {
  plotWidth: 30,
  plotHeight: 40,
  northAngle: 0,
  roadDirection: 'N',
  unit: 'ft',
  setbacks: { top: 0, right: 0, bottom: 0, left: 0 },
  layers: [],
  comments: [],
  rooms: [baseRoom],
};

const baseProps = () => ({
  plan: basePlan,
  appMode: 'edit' as const,
  onUpdateRoom: vi.fn(),
  onCommitHistory: vi.fn(),
  onDuplicate: vi.fn(),
  onRotate: vi.fn(),
  onDelete: vi.fn(),
  onStaleSelection: vi.fn(),
  onClearSelection: vi.fn(),
  addRoomElement: vi.fn(),
  updateRoomCategory: vi.fn(),
});

describe('RoomPropertiesPanel', () => {
  it('renders nothing for an empty selection (parent owns the empty state)', () => {
    // The component's contract: when selectedRoomIds is empty, the
    // parent renders an alternative block (e.g., the analysis panel).
    // The component itself returns null. The header that says "0 Rooms
    // Selected" is the parent's call.
    const { container } = render(<RoomPropertiesPanel {...baseProps()} selectedRoomIds={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the single-room header for a one-room selection', () => {
    const { container } = render(<RoomPropertiesPanel {...baseProps()} selectedRoomIds={['r1']} />);
    expect(container.textContent).toMatch(/Room Properties/);
  });

  it('renders the N-selected header for a multi-room selection', () => {
    const { container } = render(
      <RoomPropertiesPanel
        {...baseProps()}
        plan={{ ...basePlan, rooms: [baseRoom, { ...baseRoom, id: 'r2' }] }}
        selectedRoomIds={['r1', 'r2']}
      />
    );
    expect(container.textContent).toMatch(/2 Rooms Selected/);
  });

  it('renders the empty state and calls onStaleSelection when the id no longer resolves', () => {
    const onStaleSelection = vi.fn();
    const { container } = render(
      <RoomPropertiesPanel
        {...baseProps()}
        onStaleSelection={onStaleSelection}
        // selectedRoomIds contains a stale id that isn't in the plan.
        selectedRoomIds={['deleted-id']}
      />
    );
    expect(container.textContent).toMatch(/Room not found/);
    expect(onStaleSelection).toHaveBeenCalledTimes(1);
  });

  it('renders a lockout banner when appMode is "view"', () => {
    const { container } = render(
      <RoomPropertiesPanel {...baseProps()} appMode="view" selectedRoomIds={['r1']} />
    );
    expect(container.textContent).toMatch(/read-only in view mode/);
  });

  it('renders a lockout banner when appMode is "comment"', () => {
    const { container } = render(
      <RoomPropertiesPanel {...baseProps()} appMode="comment" selectedRoomIds={['r1']} />
    );
    expect(container.textContent).toMatch(/read-only in comment mode/);
  });

  it('calls onDuplicate when the Duplicate button is clicked (single selection)', () => {
    const onDuplicate = vi.fn();
    const { container } = render(
      <RoomPropertiesPanel {...baseProps()} onDuplicate={onDuplicate} selectedRoomIds={['r1']} />
    );
    const btn = container.querySelector('button[title="Duplicate Room"]') as HTMLElement;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('calls onRotate when the Rotate button is clicked', () => {
    const onRotate = vi.fn();
    const { container } = render(
      <RoomPropertiesPanel {...baseProps()} onRotate={onRotate} selectedRoomIds={['r1']} />
    );
    const btn = container.querySelector('button[title="Rotate 90°"]') as HTMLElement;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(onRotate).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the Delete button is clicked', () => {
    const onDelete = vi.fn();
    const { container } = render(
      <RoomPropertiesPanel {...baseProps()} onDelete={onDelete} selectedRoomIds={['r1']} />
    );
    const btn = container.querySelector('button[title="Delete Room"]') as HTMLElement;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onUpdateRoom when the width input changes', () => {
    const onUpdateRoom = vi.fn();
    const { container } = render(
      <RoomPropertiesPanel {...baseProps()} onUpdateRoom={onUpdateRoom} selectedRoomIds={['r1']} />
    );
    const widthInput = container.querySelector('input[type="number"]') as HTMLElement;
    expect(widthInput).not.toBeNull();
    fireEvent.change(widthInput, { target: { value: '15' } });
    // U-11: clampRoomToBuildableArea returns x along with w so the
    // room can be shifted leftward to stay inside the buildable area.
    expect(onUpdateRoom).toHaveBeenCalledWith('r1', { w: 15, x: 0 });
  });

  it('clamps the width input to the buildable area (U-11: no more 500ft rooms past the plot)', () => {
    const onUpdateRoom = vi.fn();
    const { container } = render(
      <RoomPropertiesPanel {...baseProps()} onUpdateRoom={onUpdateRoom} selectedRoomIds={['r1']} />
    );
    const widthInput = container.querySelector('input[type="number"]') as HTMLElement;
    // 1000 is over both the old 500 cap AND the new buildable cap (30ft
    // in the base plan with no setbacks). U-11 makes the helper the
    // single source of truth for "the largest legal room".
    fireEvent.change(widthInput, { target: { value: '1000' } });
    expect(onUpdateRoom).toHaveBeenLastCalledWith('r1', { w: 30, x: 0 });
  });
});
