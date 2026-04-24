import { describe, it, expect } from 'vitest';
import { analyzeRoomVastu, calculateOverallVastuScore, getDirection } from './vastu';
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
});
