import React, { useEffect } from 'react';
import { Trash2, Copy, RotateCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { FloorPlan, AppMode, RoomElement, RoomCategory } from '../../types';
import { DEFAULT_WALL_THICKNESS_IN } from '../../constants/geometry';
import { ROOM_ELEMENTS, COMMON_ELEMENTS } from '../../constants/floorPlanConstants';
import {
  clampRoomToBuildableArea,
  DEFAULT_COST_PER_SQFT,
  formatCurrency,
  getRoomCost,
  getTotalCost,
} from '../../utils';

interface RoomPropertiesPanelProps {
  selectedRoomIds: string[];
  plan: FloorPlan;
  appMode: AppMode;
  onUpdateRoom: (id: string, updates: Partial<FloorPlan['rooms'][number]>) => void;
  onCommitHistory: () => void;
  onDuplicate: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onStaleSelection: () => void;
  onClearSelection: () => void;
  addRoomElement: (roomId: string, type: string, w: number, h: number) => void;
  updateRoomCategory: (roomId: string, category: RoomCategory | undefined) => void;
}

export const RoomPropertiesPanel: React.FC<RoomPropertiesPanelProps> = ({
  selectedRoomIds,
  plan,
  appMode,
  onUpdateRoom,
  onCommitHistory,
  onDuplicate,
  onRotate,
  onDelete,
  onStaleSelection,
  onClearSelection,
  addRoomElement,
  updateRoomCategory,
}) => {
  // P2: stale-id detection. When the first selected id doesn't
  // resolve to a room, surface that as a callback so the parent can
  // clear the selection. We use a useEffect (not a render-time
  // callback) to keep the parent's state update out of the render
  // phase.
  useEffect(() => {
    if (selectedRoomIds.length === 0) return;
    const firstId = selectedRoomIds[0];
    const room = plan.rooms.find((r) => r.id === firstId);
    if (!room) {
      onStaleSelection();
    }
  }, [selectedRoomIds, plan.rooms, onStaleSelection]);

  if (selectedRoomIds.length === 0) return null;

  const room = plan.rooms.find((r) => r.id === selectedRoomIds[0]);
  if (!room) {
    // Stale id: render an explicit empty state (not a silent blank).
    return (
      <div
        className="p-5 border-b border-border-soft bg-surface-warm"
        data-testid="room-properties-empty"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">Room not found</h3>
        <p className="text-xs text-muted dark:text-meta mt-2">
          The previously selected room no longer exists.
        </p>
        <button
          onClick={onClearSelection}
          className="min-h-11 mt-3 px-3 py-2 text-xs font-medium text-accent hover:bg-surface-warm rounded-md"
        >
          Clear selection
        </button>
      </div>
    );
  }

  const isLocked = appMode !== 'edit';

  // U-11: cap width/height inputs at the buildable area so the user
  // can't blow a room past the setbacks via the number input. The
  // drag handles get the same cap inside useCanvasDrag.
  const buildableWidth = Math.max(2, plan.plotWidth - plan.setbacks.left - plan.setbacks.right);
  const buildableHeight = Math.max(2, plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom);

  return (
    <div
      className="p-5 border-b border-border-soft bg-surface-warm"
      data-testid="room-properties-panel"
    >
      {isLocked && (
        <div
          className="mb-4 px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-warn text-xs"
          role="status"
        >
          Properties are read-only in {appMode} mode. Switch to edit to make changes.
        </div>
      )}

      <div className="flex flex-wrap justify-between items-start mb-4 gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">
            {selectedRoomIds.length === 1
              ? 'Room Properties'
              : `${selectedRoomIds.length} Rooms Selected`}
          </h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {selectedRoomIds.length > 1 && (
            <button
              onClick={onClearSelection}
              className="min-h-11 p-2 rounded-md transition-colors border border-transparent text-muted hover:bg-surface-warm hover:border-border dark:text-meta  "
              title="Clear Selection"
            >
              <span className="text-[10px] font-medium">Clear</span>
            </button>
          )}
          <button
            onClick={onDuplicate}
            className="min-h-11 p-2 text-muted hover:bg-surface-warm rounded-md transition-colors border border-transparent hover:border-border flex items-center gap-1.5"
            title="Duplicate Room"
            disabled={isLocked}
          >
            <Copy className="w-4 h-4" />
            {/* U-4: text label next to the icon so the function is
                readable without hovering for the title tooltip. */}
            <span className="text-xs">Duplicate</span>
          </button>
          <button
            onClick={onRotate}
            className="min-h-11 p-2 text-muted hover:bg-surface rounded-md transition-colors border border-transparent hover:border-border flex items-center gap-1.5"
            title="Rotate 90°"
            disabled={isLocked}
          >
            <RotateCw className="w-4 h-4" />
            <span className="text-xs">Rotate</span>
          </button>
          <button
            onClick={onDelete}
            className="min-h-11 p-2 text-danger hover:bg-danger/10 rounded-md transition-colors border border-transparent hover:border-danger/30 flex items-center gap-1.5"
            title="Delete Room"
            disabled={isLocked}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs">Delete</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Type */}
        <div>
          <label className="text-xs text-muted block mb-1">Type</label>
          <div className="text-sm font-medium text-fg bg-surface border border-border rounded-md px-3 py-2">
            {room.type}
          </div>
        </div>

        {/* Width / Length */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">Width (ft)</label>
            <input
              type="number"
              min="2"
              max={buildableWidth}
              title={`Width is capped at the buildable area (${buildableWidth}')`}
              value={room.w}
              onChange={(e) => {
                const clamped = clampRoomToBuildableArea(
                  { ...room, w: Math.max(2, Number(e.target.value) || 2) },
                  plan
                );
                onUpdateRoom(room.id, { w: clamped.w, x: clamped.x });
              }}
              onBlur={onCommitHistory}
              disabled={isLocked}
              className="min-h-11 w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Length (ft)</label>
            <input
              type="number"
              min="2"
              max={buildableHeight}
              title={`Length is capped at the buildable area (${buildableHeight}')`}
              value={room.h}
              onChange={(e) => {
                const clamped = clampRoomToBuildableArea(
                  { ...room, h: Math.max(2, Number(e.target.value) || 2) },
                  plan
                );
                onUpdateRoom(room.id, { h: clamped.h, y: clamped.y });
              }}
              onBlur={onCommitHistory}
              disabled={isLocked}
              className="min-h-11 w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
            />
          </div>
        </div>

        {/* Wall Thickness */}
        <div>
          <label className="text-xs text-muted mb-1 block">Wall Thickness</label>
          <select
            value={room.wallThickness || DEFAULT_WALL_THICKNESS_IN}
            onChange={(e) => {
              onUpdateRoom(room.id, { wallThickness: Number(e.target.value) });
              onCommitHistory();
            }}
            disabled={isLocked}
            className="min-h-11 w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
          >
            <option value="4.5">4.5&quot; (Partition)</option>
            <option value="6">6&quot; (Internal)</option>
            <option value="9">9&quot; (Standard)</option>
            <option value="12">12&quot; (External)</option>
            <option value="14">14&quot; (Load Bearing)</option>
          </select>
        </div>

        {/* Cost Estimate */}
        <div className="p-3 rounded-lg border bg-success/10 border-success/30">
          {selectedRoomIds.length === 1 ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-success font-medium">Area</span>
                <span className="text-sm font-semibold text-success">
                  {Math.round(room.w * room.h)} sq ft
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-success font-medium">Est. Cost</span>
                <span className="text-sm font-semibold text-success">
                  {formatCurrency(getRoomCost(room))}
                </span>
              </div>
              <div>
                <label className="text-xs text-success block mb-1">
                  Cost / sq.ft ({DEFAULT_COST_PER_SQFT} default)
                </label>
                <input
                  type="number"
                  min="1"
                  value={room.costPerSqFt ?? DEFAULT_COST_PER_SQFT}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    onUpdateRoom(room.id, {
                      costPerSqFt: value > 0 ? value : DEFAULT_COST_PER_SQFT,
                    });
                  }}
                  onBlur={onCommitHistory}
                  disabled={isLocked}
                  className="min-h-11 w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-success font-medium">Selected Rooms</span>
                <span className="text-sm font-semibold text-success">{selectedRoomIds.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-success font-medium">Combined Est. Cost</span>
                <span className="text-sm font-semibold text-success">
                  {formatCurrency(
                    getTotalCost(plan.rooms.filter((r) => selectedRoomIds.includes(r.id)))
                  )}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Room Elements */}
        <div className="pt-2 border-t border-border ">
          {room.elements && room.elements.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-fg-2 dark:text-meta">
                Current Elements
              </h4>
              <div className="space-y-1.5">
                {room.elements.map((el: RoomElement, idx: number) => (
                  <div
                    key={el.id}
                    className="min-h-11 flex items-center justify-between bg-bg border border-border px-2 py-2 rounded-md  "
                  >
                    <span className="text-xs font-medium text-fg-2 dark:text-meta">
                      {el.type} {idx + 1}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => {
                          const newRotation = (el.rotation + 90) % 360;
                          onUpdateRoom(room.id, {
                            elements: room.elements!.map((e) =>
                              e.id === el.id ? { ...e, rotation: newRotation } : e
                            ),
                          });
                          onCommitHistory();
                        }}
                        className="min-w-11 min-h-11 p-2 text-meta hover:bg-surface hover:text-accent rounded border border-transparent hover:border-border transition-colors"
                        title="Rotate 90°"
                        disabled={isLocked}
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          onUpdateRoom(room.id, {
                            elements: [
                              ...(room.elements || []),
                              { ...el, id: uuidv4(), x: el.x + 0.5, y: el.y + 0.5 },
                            ],
                          });
                          onCommitHistory();
                        }}
                        className="min-w-11 min-h-11 p-2 text-meta hover:bg-surface hover:text-accent rounded border border-transparent hover:border-border transition-colors"
                        title="Duplicate Element"
                        disabled={isLocked}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          onUpdateRoom(room.id, {
                            elements: room.elements!.filter((e) => e.id !== el.id),
                          });
                          onCommitHistory();
                        }}
                        className="min-w-11 min-h-11 p-2 text-meta hover:bg-danger/10 hover:text-danger rounded border border-transparent hover:border-danger/30 transition-colors"
                        title="Delete"
                        disabled={isLocked}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-fg-2 dark:text-meta">
            Add Openings
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {COMMON_ELEMENTS.map((el) => (
              <button
                key={el.type}
                onClick={() => addRoomElement(room.id, el.type, el.w, el.h)}
                className="min-h-11 text-xs py-2.5 px-3 bg-surface-warm border border-border rounded hover:border-border-strong hover:bg-surface-warm transition-colors text-accent font-medium"
                disabled={isLocked}
              >
                + {el.type}
              </button>
            ))}
          </div>

          {ROOM_ELEMENTS[room.type] && ROOM_ELEMENTS[room.type].length > 0 && (
            <>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-fg-2 dark:text-meta">
                Add Furniture
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROOM_ELEMENTS[room.type].map((el) => (
                  <button
                    key={el.type}
                    onClick={() => addRoomElement(room.id, el.type, el.w, el.h)}
                    className="min-h-11 text-xs py-2.5 px-3 bg-surface border border-border rounded hover:border-accent hover:bg-surface-warm transition-colors text-muted dark:text-meta"
                    disabled={isLocked}
                  >
                    + {el.type}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Room Organization (layer) */}
        <div className="pt-4 border-t border-border ">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-fg-2 dark:text-meta">
            Organization
          </h4>
          {(plan.layers || []).length > 0 && (
            <div className="mb-3">
              <label className="text-xs mb-1 block text-muted dark:text-meta">Layer</label>
              <select
                value={room.category || ''}
                onChange={(e) => {
                  updateRoomCategory(
                    room.id,
                    (e.target.value || undefined) as RoomCategory | undefined
                  );
                  onCommitHistory();
                }}
                disabled={isLocked}
                className="min-h-11 w-full rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg border-border text-fg"
              >
                <option value="">No Layer</option>
                {(plan.layers || []).map((layer) => (
                  <option key={layer.id} value={layer.name}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
