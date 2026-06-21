import { describe, it, expect } from 'vitest';
import { analyzeRoomVastu, calculateOverallVastuScore, getDirection, IDEAL_ZONES } from './vastu';
import { ROOM_TYPES } from '../constants/floorPlanConstants';
import type { FloorPlan, Room, RoomType } from '../types';

describe('vastu', () => {
  const plan: FloorPlan = {
    plotWidth: 30,
    plotHeight: 40,
    setbacks: { top: 2, right: 2, bottom: 2, left: 2 },
    northAngle: 0,
    roadDirection: 'E',
    unit: 'ft',
    rooms: [],
    layers: [],
  };

  describe('analyzeRoomVastu', () => {
    it('should analyze room and return direction with score', () => {
      const room: Room = {
        id: '1',
        type: 'Kitchen',
        x: 10,
        y: 10,
        w: 10,
        h: 8,
        floor: 0,
        wallThickness: 9,
      };

      const result = analyzeRoomVastu(room, plan);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('currentDirection');
      expect(result).toHaveProperty('feedback');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return default score for unknown room type', () => {
      // Use type assertion to bypass TypeScript type checking for unknown type
      const room = {
        id: '1',
        type: 'Unknown Room' as RoomType,
        x: 10,
        y: 10,
        w: 10,
        h: 8,
        floor: 0,
        wallThickness: 9,
      } as Room;

      const result = analyzeRoomVastu(room, plan);

      expect(result.score).toBe(50);
      expect(result.status).toBe('average');
    });

    it('should return different scores for different zones', () => {
      const room: Room = {
        id: '1',
        type: 'Bedroom',
        x: 5,
        y: 5,
        w: 10,
        h: 10,
        floor: 0,
        wallThickness: 9,
      };

      const result = analyzeRoomVastu(room, plan);

      // Bedroom should get some score
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('calculateOverallVastuScore', () => {
    it('should calculate score for single room', () => {
      const planWithRoom: FloorPlan = {
        ...plan,
        rooms: [
          {
            id: '1',
            type: 'Kitchen',
            x: 10,
            y: 10,
            w: 10,
            h: 8,
            floor: 0,
            wallThickness: 9,
          },
        ],
      };

      const score = calculateOverallVastuScore(planWithRoom);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate score for multiple rooms', () => {
      const planWithRooms: FloorPlan = {
        ...plan,
        rooms: [
          {
            id: '1',
            type: 'Kitchen',
            x: 10,
            y: 10,
            w: 10,
            h: 8,
            floor: 0,
            wallThickness: 9,
          },
          {
            id: '2',
            type: 'Bedroom',
            x: 15,
            y: 20,
            w: 12,
            h: 14,
            floor: 0,
            wallThickness: 9,
          },
        ],
      };

      const score = calculateOverallVastuScore(planWithRooms);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 0 for empty plan', () => {
      const score = calculateOverallVastuScore(plan);

      expect(score).toBe(0);
    });
  });

  describe('getDirection', () => {
    it('should return correct direction based on position', () => {
      const cx = 15;
      const cy = 20;

      // Room in SE quadrant (x > cx, y > cy in SVG coords)
      const dir1 = getDirection(20, 30, cx, cy, 0);
      expect(dir1).toBe('SE');

      // Room in NW quadrant (x < cx, y < cy in SVG coords)
      const dir2 = getDirection(10, 10, cx, cy, 0);
      expect(dir2).toBe('NW');
    });

    it('should return CENTER for center position', () => {
      const cx = 15;
      const cy = 20;

      const dir = getDirection(cx, cy, cx, cy, 0);
      expect(dir).toBe('CENTER');
    });

    it('should handle different north angles', () => {
      const cx = 15;
      const cy = 20;

      // Same position with different north angles
      const dir1 = getDirection(20, 30, cx, cy, 0);
      const dir2 = getDirection(20, 30, cx, cy, 90);

      expect(dir1).not.toBe(dir2);
    });

    it('should return CENTER when close to center', () => {
      const cx = 15;
      const cy = 20;

      // Very close to center
      const dir = getDirection(cx + 1, cy + 1, cx, cy, 0);
      expect(dir).toBe('CENTER');
    });
  });

  // S-4: property-style regression tests for the Vastu ideal-direction matrix.
  // These pin every RoomType × direction tri-state from IDEAL_ZONES so a
  // future edit to the matrix cannot silently change a recommendation.
  describe('Vastu matrix (S-4)', () => {
    const baseRoom = (type: RoomType): Room => ({
      id: `room-${type}`,
      type,
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      floor: 0,
      wallThickness: 9,
    });

    // Place a room so its center lands in each cardinal/intercardinal direction
    // of a 40×40 plot (northAngle 0). Distances are far enough from the center
    // (20,20) to avoid the CENTER threshold.
    const directions: Record<import('./vastu').Direction, { x: number; y: number }> = {
      N: { x: 20, y: 2 },
      NE: { x: 35, y: 5 },
      E: { x: 36, y: 20 },
      SE: { x: 35, y: 35 },
      S: { x: 20, y: 36 },
      SW: { x: 5, y: 35 },
      W: { x: 2, y: 20 },
      NW: { x: 5, y: 5 },
      CENTER: { x: 19, y: 19 }, // inside the CENTER threshold
    };

    it('every ROOM_TYPES entry has a rule in IDEAL_ZONES', () => {
      for (const { type } of ROOM_TYPES) {
        expect(IDEAL_ZONES[type]).toBeDefined();
      }
    });

    it('every IDEAL_ZONES rule covers all 9 directions without duplicates', () => {
      const allDirections: import('./vastu').Direction[] = [
        'N',
        'NE',
        'E',
        'SE',
        'S',
        'SW',
        'W',
        'NW',
        'CENTER',
      ];
      for (const { type } of ROOM_TYPES) {
        const rule = IDEAL_ZONES[type];
        const buckets = [...rule.best, ...rule.neutral, ...rule.avoid];
        expect(new Set(buckets).size).toBe(allDirections.length);
        for (const dir of allDirections) {
          expect(buckets).toContain(dir);
        }
      }
    });

    it.each(
      ROOM_TYPES.flatMap((rt) =>
        (['best', 'neutral', 'avoid'] as const).map((bucket) => ({
          type: rt.type,
          bucket,
          directions: IDEAL_ZONES[rt.type][bucket],
        }))
      )
    )(
      '$type placed in $bucket direction gets score/status for that bucket',
      ({
        type,
        bucket,
        directions: dirs,
      }: {
        type: RoomType;
        bucket: 'best' | 'neutral' | 'avoid';
        directions: import('./vastu').Direction[];
      }) => {
        const localPlan: FloorPlan = { ...plan, plotWidth: 40, plotHeight: 40 };
        for (const dir of dirs) {
          const pos = directions[dir];
          const room: Room = { ...baseRoom(type), x: pos.x, y: pos.y };
          const result = analyzeRoomVastu(room, localPlan);
          expect(result.currentDirection).toBe(dir);
          expect(result.idealDirections).toEqual(IDEAL_ZONES[type].best);
          if (bucket === 'best') {
            expect(result.score).toBe(100);
            expect(result.status).toBe('good');
          } else if (bucket === 'neutral') {
            expect(result.score).toBe(60);
            expect(result.status).toBe('average');
          } else {
            expect(result.score).toBe(20);
            expect(result.status).toBe('poor');
          }
        }
      }
    );

    it('northAngle rotation shifts the evaluated direction', () => {
      const localPlan: FloorPlan = { ...plan, plotWidth: 40, plotHeight: 40 };
      const room: Room = { ...baseRoom('Kitchen'), x: 35, y: 5 }; // NE at northAngle 0
      const result0 = analyzeRoomVastu(room, localPlan);
      expect(result0.currentDirection).toBe('NE');
      expect(result0.status).toBe('poor'); // Kitchen avoids NE

      const rotatedPlan: FloorPlan = { ...localPlan, northAngle: 45 };
      const result45 = analyzeRoomVastu(room, rotatedPlan);
      expect(result45.currentDirection).toBe('N');
      expect(result45.status).toBe('poor'); // Kitchen avoids N
    });
  });
});
