import React, { useCallback, useMemo } from 'react';
import { Room as RoomType } from '../types';
import { cn } from '../utils';
import { analyzeRoomVastu } from '../services/vastu';
import { RoomElement } from './RoomElement';

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
    handle?: 'se' | 'sw' | 'ne' | 'nw'
  ) => void;
  onElementPointerDown: (
    e: React.PointerEvent,
    room: RoomType,
    element: RoomType['elements'][0]
  ) => void;
  onUpdateRoom: (id: string, updates: Partial<RoomType>) => void;
  onUpdateRoomEnd?: () => void;
}

const TOLERANCE = 0.1;

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
  }) => {
    const vastu = useMemo(() => analyzeRoomVastu(room, plan as any), [room, plan]);
    const vastuColor =
      vastu.status === 'good'
        ? 'bg-emerald-100/80 border-emerald-400'
        : vastu.status === 'average'
          ? 'bg-amber-100/80 border-amber-400'
          : 'bg-red-100/80 border-red-400';

    const wallFt = (room.wallThickness || 9) / 12;

    const isShared = useCallback(
      (side: 'top' | 'right' | 'bottom' | 'left') => {
        return floorRooms.some((other) => {
          if (other.id === room.id) return false;
          const overlapsX =
            room.x < other.x + other.w - TOLERANCE && room.x + room.w > other.x + TOLERANCE;
          const overlapsY =
            room.y < other.y + other.h - TOLERANCE && room.y + room.h > other.y + TOLERANCE;

          if (side === 'top')
            return Math.abs(room.y - (other.y + other.h)) < TOLERANCE && overlapsX;
          if (side === 'bottom')
            return Math.abs(room.y + room.h - other.y) < TOLERANCE && overlapsX;
          if (side === 'left')
            return Math.abs(room.x - (other.x + other.w)) < TOLERANCE && overlapsY;
          if (side === 'right') return Math.abs(room.x + room.w - other.x) < TOLERANCE && overlapsY;
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
        onPointerDown={(e) => onPointerDown(e, room, 'drag')}
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
            <div
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'nw')}
            />
            <div
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'ne')}
            />
            <div
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'sw')}
            />
            <div
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize"
              onPointerDown={(e) => onPointerDown(e, room, 'resize', 'se')}
            />
          </>
        )}
      </div>
    );
  }
);
Room.displayName = 'Room';
