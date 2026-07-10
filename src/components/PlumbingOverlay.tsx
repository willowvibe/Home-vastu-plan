import React, { useMemo } from 'react';
import { FloorPlan, Room } from '../types';

interface PlumbingOverlayProps {
  plan: FloorPlan;
  rooms: Room[];
  pixelsPerFoot: number;
}

const WATER_ROOMS = new Set(['Kitchen', 'Bathroom', 'Master Bedroom']);

function isWaterRoom(room: Room): boolean {
  return (
    WATER_ROOMS.has(room.type) ||
    (room.elements || []).some((el) =>
      ['Sink', 'Wash Basin', 'Shower', 'Toilet', 'Stove'].includes(el.type)
    )
  );
}

function nearestEdgePoint(
  cx: number,
  cy: number,
  plotWidth: number,
  plotHeight: number
): { x: number; y: number } {
  const distances = {
    top: cy,
    bottom: plotHeight - cy,
    left: cx,
    right: plotWidth - cx,
  };
  const nearest = (Object.keys(distances) as Array<keyof typeof distances>).reduce((a, b) =>
    distances[a] < distances[b] ? a : b
  );

  switch (nearest) {
    case 'top':
      return { x: cx, y: 0 };
    case 'bottom':
      return { x: cx, y: plotHeight };
    case 'left':
      return { x: 0, y: cy };
    case 'right':
      return { x: plotWidth, y: cy };
  }
}

export const PlumbingOverlay: React.FC<PlumbingOverlayProps> = ({ plan, rooms, pixelsPerFoot }) => {
  const lines = useMemo(() => {
    const result: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      dash?: string;
      label: string;
    }> = [];

    rooms.forEach((room) => {
      if (!isWaterRoom(room)) return;

      const cx = room.x + room.w / 2;
      const cy = room.y + room.h / 2;
      const edge = nearestEdgePoint(cx, cy, plan.plotWidth, plan.plotHeight);

      const isBathroom = room.type === 'Bathroom';
      const isKitchen = room.type === 'Kitchen';

      // Cold water to every water room
      result.push({
        id: `${room.id}-cold`,
        x1: cx * pixelsPerFoot,
        y1: cy * pixelsPerFoot,
        x2: edge.x * pixelsPerFoot,
        y2: edge.y * pixelsPerFoot,
        stroke: 'var(--accent)',
        label: isBathroom ? 'Cold water + drainage' : 'Cold water',
      });

      // Hot water to bathrooms
      if (isBathroom) {
        result.push({
          id: `${room.id}-hot`,
          x1: cx * pixelsPerFoot,
          y1: cy * pixelsPerFoot,
          x2: edge.x * pixelsPerFoot,
          y2: edge.y * pixelsPerFoot,
          stroke: 'var(--danger)',
          dash: '4 4',
          label: 'Hot water',
        });
      }

      // Drainage line for kitchens and bathrooms
      if (isBathroom || isKitchen) {
        result.push({
          id: `${room.id}-drain`,
          x1: cx * pixelsPerFoot,
          y1: cy * pixelsPerFoot,
          x2: edge.x * pixelsPerFoot,
          y2: edge.y * pixelsPerFoot,
          stroke: 'var(--muted)',
          dash: '2 3',
          label: 'Drainage',
        });
      }
    });

    return result;
  }, [plan.plotWidth, plan.plotHeight, rooms, pixelsPerFoot]);

  if (lines.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <p className="text-xs text-muted dark:text-meta bg-surface-100/80 dark:bg-fg/80 px-2 py-1 rounded">
          Add a Kitchen or Bathroom to see plumbing lines.
        </p>
      </div>
    );
  }

  return (
    <svg
      className="absolute inset-0 z-30 pointer-events-none overflow-visible"
      width={plan.plotWidth * pixelsPerFoot}
      height={plan.plotHeight * pixelsPerFoot}
      data-testid="plumbing-overlay"
    >
      {lines.map((line) => (
        <line
          key={line.id}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.stroke}
          strokeWidth={2}
          strokeDasharray={line.dash}
          opacity={0.8}
        />
      ))}
    </svg>
  );
};
