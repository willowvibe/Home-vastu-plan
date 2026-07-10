import React, { useMemo } from 'react';
import { FloorPlan, Room } from '../types';
import { DEFAULT_LATITUDE, DEFAULT_ROOM_HEIGHT_FT, getSunPosition } from '../utils';

interface SunPathOverlayProps {
  plan: FloorPlan;
  rooms: Room[];
  pixelsPerFoot: number;
  date: Date;
  minutesSinceMidnight: number;
}

type Point = { x: number; y: number };

/** Monotone chain convex hull for the 8 shadow vertices. */
function convexHull(points: Point[]): Point[] {
  if (points.length <= 1) return points;
  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export const SunPathOverlay: React.FC<SunPathOverlayProps> = ({
  plan,
  rooms,
  pixelsPerFoot,
  date,
  minutesSinceMidnight,
}) => {
  const latitude = plan.latitude ?? DEFAULT_LATITUDE;

  const { altitude, azimuth, isDaytime } = useMemo(() => {
    const pos = getSunPosition(latitude, date, minutesSinceMidnight);
    return { ...pos, isDaytime: pos.altitude > 0 };
  }, [latitude, date, minutesSinceMidnight]);

  const shadows = useMemo(() => {
    if (!isDaytime) return [];

    // Shadow is cast opposite the sun azimuth.
    const shadowAngle = azimuth + Math.PI;
    const shadowLength = DEFAULT_ROOM_HEIGHT_FT / Math.tan(altitude);
    const dx = Math.cos(shadowAngle) * shadowLength;
    const dy = Math.sin(shadowAngle) * shadowLength;

    return rooms.map((room) => {
      const x1 = room.x;
      const y1 = room.y;
      const x2 = room.x + room.w;
      const y2 = room.y + room.h;
      const points: Point[] = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
        { x: x1 + dx, y: y1 + dy },
        { x: x2 + dx, y: y1 + dy },
        { x: x2 + dx, y: y2 + dy },
        { x: x1 + dx, y: y2 + dy },
      ];
      return {
        id: room.id,
        points: convexHull(points),
      };
    });
  }, [rooms, altitude, azimuth, isDaytime]);

  if (!isDaytime) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <p className="text-xs text-muted dark:text-meta bg-surface-100/80 dark:bg-fg/80 px-2 py-1 rounded">
          Sun is below the horizon at this time.
        </p>
      </div>
    );
  }

  if (shadows.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <p className="text-xs text-muted dark:text-meta bg-surface-100/80 dark:bg-fg/80 px-2 py-1 rounded">
          Add rooms to see sun-path shadows.
        </p>
      </div>
    );
  }

  return (
    <svg
      className="absolute inset-0 z-30 pointer-events-none overflow-visible"
      width={plan.plotWidth * pixelsPerFoot}
      height={plan.plotHeight * pixelsPerFoot}
      data-testid="sun-path-overlay"
    >
      {shadows.map((shadow) => (
        <polygon
          key={shadow.id}
          points={shadow.points
            .map((p) => `${p.x * pixelsPerFoot},${p.y * pixelsPerFoot}`)
            .join(' ')}
          fill="var(--fg)"
          fillOpacity={0.25}
          stroke="var(--fg)"
          strokeOpacity={0.4}
          strokeWidth={1}
        />
      ))}
    </svg>
  );
};
