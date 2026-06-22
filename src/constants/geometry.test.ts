/**
 * Regression tests for `src/constants/geometry.ts`.
 *
 * Why this file exists (S-8): The geometry constants are used in 4+ files
 * (App.tsx, useCanvasDrag.ts, Room.tsx, lib/exports.ts) for shared-wall
 * detection, snap-to-grid, wall-thickness math, and the wall-thickness
 * default. A drift of even 0.01 ft in TOLERANCE is user-visible (rooms
 * stop snapping flush), and a flip of the 9-inch wall default is the
 * most likely silent regression. This file pins all the values so a
 * change has to be deliberate.
 *
 * If you intentionally change a constant here, also update the callers
 * and the corresponding entry in `docs/CODE_REVIEW.md` §S-8.
 */

import { describe, it, expect } from 'vitest';
import {
  TOLERANCE_FT,
  DEFAULT_WALL_THICKNESS_IN,
  INCHES_PER_FOOT,
  WALL_THICKNESS_OPTIONS_IN,
  SNAP_GRID_FT,
  SNAP_GRID_SUB_FT,
  DEFAULT_GRID_SIZE_FT,
  GRID_SIZE_OPTIONS_FT,
  PIXELS_PER_FOOT,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  MIN_ROOM_SIZE_FT,
  MAX_ROOM_SIZE_FT,
  FT_PER_METER,
} from './geometry';

describe('geometry constants', () => {
  describe('tolerance / snap', () => {
    it('TOLERANCE_FT is 0.1 ft (≈ 1.2 in) — the shared-wall flush threshold', () => {
      expect(TOLERANCE_FT).toBe(0.1);
    });

    it('TOLERANCE_FT is wider than the sub-foot snap grid so flush detection does not flicker', () => {
      // The sub-foot snap is 0.1 ft, so the tolerance must be at least that
      // wide. Otherwise two rooms snapped to the same grid would never
      // register as "touching".
      expect(TOLERANCE_FT).toBeGreaterThanOrEqual(SNAP_GRID_SUB_FT);
    });

    it('TOLERANCE_FT is narrower than a 6" gap (0.5 ft) so 6" gaps do not snap', () => {
      expect(TOLERANCE_FT).toBeLessThan(0.5);
    });

    it('SNAP_GRID_FT is 1 ft when "Snap to Grid" is ON', () => {
      expect(SNAP_GRID_FT).toBe(1);
    });

    it('SNAP_GRID_SUB_FT is 0.1 ft (≈ 1.2 in) when "Snap to Grid" is OFF', () => {
      expect(SNAP_GRID_SUB_FT).toBe(0.1);
    });

    it('DEFAULT_GRID_SIZE_FT matches the legacy snap grid default (1 ft)', () => {
      expect(DEFAULT_GRID_SIZE_FT).toBe(1);
      expect(GRID_SIZE_OPTIONS_FT).toContain(DEFAULT_GRID_SIZE_FT);
    });

    it('GRID_SIZE_OPTIONS_FT offers a sensible imperial/metric range', () => {
      expect(GRID_SIZE_OPTIONS_FT).toEqual([0.5, 1, 2, 3, 5]);
    });
  });

  describe('wall thickness', () => {
    it('DEFAULT_WALL_THICKNESS_IN is 9" (standard Indian residential wall)', () => {
      expect(DEFAULT_WALL_THICKNESS_IN).toBe(9);
    });

    it('INCHES_PER_FOOT is 12', () => {
      expect(INCHES_PER_FOOT).toBe(12);
    });

    it('WALL_THICKNESS_OPTIONS_IN lists the five standard options in ascending order', () => {
      // 4.5"  Partition
      // 6"    Internal
      // 9"    Standard (default)
      // 12"   External
      // 14"   Load Bearing
      expect(WALL_THICKNESS_OPTIONS_IN).toEqual([4.5, 6, 9, 12, 14]);
    });

    it('the default 9" option is in the picker list', () => {
      expect(WALL_THICKNESS_OPTIONS_IN).toContain(DEFAULT_WALL_THICKNESS_IN);
    });
  });

  describe('canvas', () => {
    it('PIXELS_PER_FOOT is 12 (1 ft = 12 CSS pixels at zoom = 1.0)', () => {
      expect(PIXELS_PER_FOOT).toBe(12);
    });

    it('DEFAULT_ZOOM is 1.0 (100%)', () => {
      expect(DEFAULT_ZOOM).toBe(1);
    });

    it('MIN_ZOOM < DEFAULT_ZOOM < MAX_ZOOM so the zoom slider has a usable range', () => {
      expect(MIN_ZOOM).toBeLessThan(DEFAULT_ZOOM);
      expect(MAX_ZOOM).toBeGreaterThan(DEFAULT_ZOOM);
    });

    it('MIN_ZOOM is 0.1 (10%) and MAX_ZOOM is 3 (300%)', () => {
      expect(MIN_ZOOM).toBe(0.1);
      expect(MAX_ZOOM).toBe(3);
    });
  });

  describe('room size bounds', () => {
    it('MIN_ROOM_SIZE_FT is 1 ft (smaller than this the resize handle disengages)', () => {
      expect(MIN_ROOM_SIZE_FT).toBe(1);
    });

    it('MAX_ROOM_SIZE_FT is 100 ft (caps accidental huge values)', () => {
      expect(MAX_ROOM_SIZE_FT).toBe(100);
    });

    it('MIN_ROOM_SIZE_FT < MAX_ROOM_SIZE_FT (the bounds are not inverted)', () => {
      expect(MIN_ROOM_SIZE_FT).toBeLessThan(MAX_ROOM_SIZE_FT);
    });
  });

  describe('display conversion', () => {
    it('FT_PER_METER is 0.3048 (the exact SI conversion factor)', () => {
      expect(FT_PER_METER).toBe(0.3048);
    });
  });
});
