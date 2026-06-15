import React, { useCallback, useMemo } from 'react';
import { Room as RoomType } from '../types';
import { cn } from '../utils';
import { analyzeRoomVastu } from '../services/vastu';
import { RoomElement } from './RoomElement';
import { TOLERANCE_FT, INCHES_PER_FOOT, DEFAULT_WALL_THICKNESS_IN } from '../constants/geometry';
import type { ResizeHandle } from '../hooks/useCanvasDrag';

interface RoomProps {
  room: RoomType;
  plan: {
    plotWidth: number;
    plotHeight: number;
    northAngle: number;
    unit: 'ft' | 'm';
  };
  pixelsPerFoot: number;
  isSelected: boolean;
  floorRooms: RoomType[];
  onPointerDown: (
    e: React.PointerEvent,
    room: RoomType,
    type: 'drag' | 'resize',
    handle?: ResizeHandle
  ) => void;
  onElementPointerDown: (
    e: React.PointerEvent,
    room: RoomType,
    element: RoomType['elements'][0]
  ) => void;
  onUpdateRoom: (id: string, updates: Partial<RoomType>) => void;
  onUpdateRoomEnd?: () => void;
  // U-3: optional because the print-only Canvas in App.tsx renders
  // rooms without a selection handler. When omitted, the room-body
  // click is still a drag — the select call is silently skipped.
  onSelectRoom?: (roomId: string, isShiftKey: boolean) => void;
}

export const Room: React.FC<RoomProps> = React.memo(
  ({
    room,
    plan,
    pixelsPerFoot,
    isSelected,
    floorRooms,
    onPointerDown,
    onElementPointerDown,
    onUpdateRoom,
    onUpdateRoomEnd,
    onSelectRoom,
  }) => {
    // B-13: depend on the plan primitives that analyzeRoomVastu actually
    // reads (plotWidth, plotHeight, northAngle), not the whole `plan` ref.
    // `updatePlan` allocates a new `plan` on every drag tick, so the prior
    // dep re-ran analyzeRoomVastu once per Room per frame even when nothing
    // vastu-affecting had changed. The eslint-disable on the dep array is
    // intentional and tracked in KNOWN_ISSUES §B-13; remove if the dep ever
    // needs to widen.
    const vastu = useMemo(
      () => analyzeRoomVastu(room, plan as any),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [room, plan.plotWidth, plan.plotHeight, plan.northAngle]
    );
    const vastuColor =
      vastu.status === 'good'
        ? 'bg-emerald-100/80 border-emerald-400'
        : vastu.status === 'average'
          ? 'bg-amber-100/80 border-amber-400'
          : 'bg-red-100/80 border-red-400';

    const wallFt = (room.wallThickness || DEFAULT_WALL_THICKNESS_IN) / INCHES_PER_FOOT;

    const isShared = useCallback(
      (side: 'top' | 'right' | 'bottom' | 'left') => {
        return floorRooms.some((other) => {
          if (other.id === room.id) return false;
          const overlapsX =
            room.x < other.x + other.w - TOLERANCE_FT && room.x + room.w > other.x + TOLERANCE_FT;
          const overlapsY =
            room.y < other.y + other.h - TOLERANCE_FT && room.y + room.h > other.y + TOLERANCE_FT;

          if (side === 'top')
            return Math.abs(room.y - (other.y + other.h)) < TOLERANCE_FT && overlapsX;
          if (side === 'bottom')
            return Math.abs(room.y + room.h - other.y) < TOLERANCE_FT && overlapsX;
          if (side === 'left')
            return Math.abs(room.x - (other.x + other.w)) < TOLERANCE_FT && overlapsY;
          if (side === 'right')
            return Math.abs(room.x + room.w - other.x) < TOLERANCE_FT && overlapsY;
          return false;
        });
      },
      [floorRooms, room]
    );

    const leftWall = isShared('left') ? wallFt / 2 : wallFt;
    const rightWall = isShared('right') ? wallFt / 2 : wallFt;
    const topWall = isShared('top') ? wallFt / 2 : wallFt;
    const bottomWall = isShared('bottom') ? wallFt / 2 : wallFt;

    const innerW = Math.max(0, room.w - leftWall - rightWall);
    const innerH = Math.max(0, room.h - topWall - bottomWall);

    const handleElementDoubleClick = useCallback(
      (elementId: string) => {
        const newRotation = (room.elements?.find((el) => el.id === elementId)?.rotation || 0) + 90;
        const updatedElements = room.elements?.map((eItem) =>
          eItem.id === elementId ? { ...eItem, rotation: newRotation % 360 } : eItem
        );
        onUpdateRoom(room.id, { elements: updatedElements });
        onUpdateRoomEnd?.();
      },
      [room, onUpdateRoom, onUpdateRoomEnd]
    );

    return (
      <div
        className={cn(
          'absolute flex items-center justify-center cursor-move select-none transition-colors',
          isSelected ? 'ring-2 ring-blue-500 z-10' : 'z-0',
          vastuColor
        )}
        style={{
          left: room.x * pixelsPerFoot,
          top: room.y * pixelsPerFoot,
          width: room.w * pixelsPerFoot,
          height: room.h * pixelsPerFoot,
          borderWidth: `${wallFt * pixelsPerFoot}px`,
          borderStyle: 'solid',
        }}
        onPointerDown={(e) => {
          // B-20: only fire the drag branch when the user clicks the
          // room body, not a child (resize handle, element, label).
          // The handles' own onPointerDown will still fire for the
          // resize branch.
          if (e.target === e.currentTarget) {
            // U-3: clicking a room must select it. The select call
            // happens BEFORE the drag branch — the drag branch is
            // gated on `e.target === e.currentTarget` too, so they
            // share the same guard. Plain click replaces selection
            // (useSelection's default); shift+click toggles, which
            // also satisfies the B-8 multi-select P1 contract.
            onSelectRoom?.(room.id, e.shiftKey);
            onPointerDown(e, room, 'drag');
          }
        }}
      >
        <span className="text-xs font-medium text-slate-800 pointer-events-none px-1 text-center leading-tight">
          {room.type}
          <br />
          <span className="text-[10px] text-slate-600 block leading-tight mt-0.5">
            {plan.unit === 'ft'
              ? `${room.w}' x ${room.h}'`
              : `${(room.w * 0.3048).toFixed(1)}m x ${(room.h * 0.3048).toFixed(1)}m`}
          </span>
          <span className="text-[9px] text-slate-500 block leading-tight">
            {plan.unit === 'ft'
              ? `In: ${innerW.toFixed(1)}' x ${innerH.toFixed(1)}'`
              : `In: ${(innerW * 0.3048).toFixed(1)}m x ${(innerH * 0.3048).toFixed(1)}m`}
          </span>
        </span>

        {room.elements?.map((el) => (
          <RoomElement
            key={el.id}
            element={el}
            pixelsPerFoot={pixelsPerFoot}
            onPointerDown={(e) => onElementPointerDown(e, room, el)}
            onDoubleClick={() => handleElementDoubleClick(el.id)}
          />
        ))}

        {isSelected && (
          <>
            {/* U-15: 4 corner handles (20px visual + 28px transparent
                hit area) + 4 mid-edge handles (20px hit area).
                The corner hit area is larger than the visual so
                high-DPI / mobile users can grab the handle. The
                edge handles give one-axis-only resize. */}
            {/* Corners */}
            <div
              className="absolute -top-1.5 -left-1.5 w-7 h-7 flex items-center justify-center cursor-nw-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'nw')}
              data-testid="resize-handle-nw"
            >
              <div className="w-5 h-5 bg-blue-500 rounded-full pointer-events-none" />
            </div>
            <div
              className="absolute -top-1.5 -right-1.5 w-7 h-7 flex items-center justify-center cursor-ne-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'ne')}
              data-testid="resize-handle-ne"
            >
              <div className="w-5 h-5 bg-blue-500 rounded-full pointer-events-none" />
            </div>
            <div
              className="absolute -bottom-1.5 -left-1.5 w-7 h-7 flex items-center justify-center cursor-sw-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'sw')}
              data-testid="resize-handle-sw"
            >
              <div className="w-5 h-5 bg-blue-500 rounded-full pointer-events-none" />
            </div>
            <div
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 flex items-center justify-center cursor-se-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'se')}
              data-testid="resize-handle-se"
            >
              <div className="w-5 h-5 bg-blue-500 rounded-full pointer-events-none" />
            </div>
            {/* Edges */}
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-5 flex items-center justify-center cursor-ns-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'n')}
              data-testid="resize-handle-n"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full pointer-events-none" />
            </div>
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 flex items-center justify-center cursor-ns-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 's')}
              data-testid="resize-handle-s"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full pointer-events-none" />
            </div>
            <div
              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-ew-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'e')}
              data-testid="resize-handle-e"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full pointer-events-none" />
            </div>
            <div
              className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-ew-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'w')}
              data-testid="resize-handle-w"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full pointer-events-none" />
            </div>
          </>
        )}
      </div>
    );
  }
);
Room.displayName = 'Room';
