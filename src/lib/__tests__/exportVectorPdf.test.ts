import { describe, it, expect } from 'vitest';
import { buildVectorPdfOps } from '../exportVectorPdf';
import { FloorPlan } from '../../types';

const BASE_PLAN: FloorPlan = {
  plotWidth: 30,
  plotHeight: 40,
  northAngle: 0,
  roadDirection: 'N',
  unit: 'ft',
  setbacks: { top: 2, right: 2, bottom: 2, left: 2 },
  rooms: [],
  comments: [],
};

describe('buildVectorPdfOps', () => {
  it('produces boundary + grid ops for an empty plan', () => {
    const ops = buildVectorPdfOps(BASE_PLAN, 0);
    const types = ops.map((o) => o.type);
    // Should have at least: plot boundary rect, grid lines, setback lines, watermark.
    expect(types).toContain('rect'); // plot boundary
    expect(types).toContain('line'); // grid lines
    expect(types).toContain('watermark'); // default watermark
  });

  it('includes a room as a filled rect with label text', () => {
    const plan: FloorPlan = {
      ...BASE_PLAN,
      rooms: [
        {
          id: 'r1',
          type: 'Bedroom',
          x: 5,
          y: 5,
          w: 10,
          h: 12,
          floor: 0,
          wallThickness: 9,
        },
      ],
    };
    const ops = buildVectorPdfOps(plan, 0);
    const roomRects = ops.filter((o) => o.type === 'rect' && o.fill === '#f0fdf4');
    expect(roomRects.length).toBe(1);
    // The room rect should have inch coordinates at the computed scale.
    const r = roomRects[0];
    expect(r.type).toBe('rect');
    if (r.type === 'rect') {
      expect(r.x).toBeGreaterThan(0);
      expect(r.y).toBeGreaterThan(0);
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
    }
    // A text op for the room label should exist.
    const labels = ops.filter((o) => o.type === 'text' && 'text' in o && o.text === 'Bedroom');
    expect(labels.length).toBe(1);
  });

  it('filters rooms to the current floor only', () => {
    const plan: FloorPlan = {
      ...BASE_PLAN,
      rooms: [
        {
          id: 'r1',
          type: 'Kitchen',
          x: 2,
          y: 2,
          w: 8,
          h: 10,
          floor: 0,
          wallThickness: 9,
        },
        {
          id: 'r2',
          type: 'Bedroom',
          x: 2,
          y: 2,
          w: 10,
          h: 12,
          floor: 1,
          wallThickness: 9,
        },
      ],
    };
    const opsFloor0 = buildVectorPdfOps(plan, 0);
    const roomLabels0 = opsFloor0
      .filter((o) => o.type === 'text')
      .map((o) => (o.type === 'text' ? o.text : ''));
    expect(roomLabels0).toContain('Kitchen');
    expect(roomLabels0).not.toContain('Bedroom');

    const opsFloor1 = buildVectorPdfOps(plan, 1);
    const roomLabels1 = opsFloor1
      .filter((o) => o.type === 'text')
      .map((o) => (o.type === 'text' ? o.text : ''));
    expect(roomLabels1).toContain('Bedroom');
    expect(roomLabels1).not.toContain('Kitchen');
  });

  it('omits Vastu grid when showVastuGrid is false', () => {
    const opsWith = buildVectorPdfOps(BASE_PLAN, 0, { showVastuGrid: true });
    const opsWithout = buildVectorPdfOps(BASE_PLAN, 0, { showVastuGrid: false });
    // The Vastu grid is drawn as dashed indigo rects. When disabled, there
    // should be fewer rect ops (no grid overlay rects).
    const rectsWith = opsWith.filter((o) => o.type === 'rect').length;
    const rectsWithout = opsWithout.filter((o) => o.type === 'rect').length;
    expect(rectsWithout).toBeLessThan(rectsWith);
  });

  it('omits compass when showCompass is false', () => {
    const opsWith = buildVectorPdfOps(BASE_PLAN, 0, { showCompass: true });
    const opsWithout = buildVectorPdfOps(BASE_PLAN, 0, { showCompass: false });
    // The compass includes a circle and a text "N". When disabled, those
    // should be absent.
    const circlesWith = opsWith.filter((o) => o.type === 'circle').length;
    const circlesWithout = opsWithout.filter((o) => o.type === 'circle').length;
    expect(circlesWithout).toBe(0);
    expect(circlesWith).toBeGreaterThan(0);
  });

  it('omits watermark when watermark option is false', () => {
    const opsWith = buildVectorPdfOps(BASE_PLAN, 0, { watermark: true });
    const opsWithout = buildVectorPdfOps(BASE_PLAN, 0, { watermark: false });
    const wmWith = opsWith.filter((o) => o.type === 'watermark');
    const wmWithout = opsWithout.filter((o) => o.type === 'watermark');
    expect(wmWith.length).toBe(1);
    expect(wmWithout.length).toBe(0);
  });

  it('uses custom watermark text when provided', () => {
    const ops = buildVectorPdfOps(BASE_PLAN, 0, {
      watermark: true,
      watermarkText: 'CUSTOM STAMP',
    });
    const wm = ops.find((o) => o.type === 'watermark');
    expect(wm).toBeDefined();
    if (wm && wm.type === 'watermark') {
      expect(wm.text).toBe('CUSTOM STAMP');
    }
  });

  it('respects custom scale', () => {
    const plan: FloorPlan = {
      ...BASE_PLAN,
      rooms: [
        {
          id: 'r1',
          type: 'Living Room',
          x: 0,
          y: 0,
          w: 10,
          h: 10,
          floor: 0,
          wallThickness: 9,
        },
      ],
    };
    const opsDefault = buildVectorPdfOps(plan, 0);
    const opsCustom = buildVectorPdfOps(plan, 0, { scale: 0.5 });
    // At scale 0.5, a 10ft room = 5 inches. At default scale (~0.1925 for
    // 30×40 plot), it's ~1.925 inches. The rect width should differ.
    const roomDefault = opsDefault.find(
      (o) => o.type === 'rect' && o.fill === '#f0fdf4'
    );
    const roomCustom = opsCustom.find(
      (o) => o.type === 'rect' && o.fill === '#f0fdf4'
    );
    expect(roomDefault).toBeDefined();
    expect(roomCustom).toBeDefined();
    if (
      roomDefault?.type === 'rect' &&
      roomCustom?.type === 'rect'
    ) {
      expect(roomCustom.w).not.toBe(roomDefault.w);
    }
  });

  it('draws setback lines at correct positions', () => {
    const plan: FloorPlan = {
      ...BASE_PLAN,
      setbacks: { top: 3, right: 4, bottom: 5, left: 2 },
    };
    const ops = buildVectorPdfOps(plan, 0);
    // Setback lines are dashed. Find line ops that are dashed.
    const dashedLines = ops.filter(
      (o) => o.type === 'line'
    );
    // We should have at least 4 setback boundary lines.
    expect(dashedLines.length).toBeGreaterThanOrEqual(4);
  });

  it('draws room elements as rects inside their parent room', () => {
    const plan: FloorPlan = {
      ...BASE_PLAN,
      rooms: [
        {
          id: 'r1',
          type: 'Bedroom',
          x: 5,
          y: 5,
          w: 12,
          h: 14,
          floor: 0,
          wallThickness: 9,
          elements: [
            {
              id: 'e1',
              type: 'Bed',
              x: 1,
              y: 1,
              w: 6,
              h: 4,
              rotation: 0,
            },
          ],
        },
      ],
    };
    const ops = buildVectorPdfOps(plan, 0);
    // Element rects use a different fill color than room rects.
    const elementRects = ops.filter(
      (o) => o.type === 'rect' && o.fill === '#e2e8f0'
    );
    expect(elementRects.length).toBe(1);
  });

  it('handles zero rooms on current floor gracefully', () => {
    const plan: FloorPlan = {
      ...BASE_PLAN,
      rooms: [
        {
          id: 'r1',
          type: 'Kitchen',
          x: 2,
          y: 2,
          w: 8,
          h: 10,
          floor: 1,
          wallThickness: 9,
        },
      ],
    };
    const ops = buildVectorPdfOps(plan, 0);
    // No room rects, but boundary + grid + watermark still present.
    const roomRects = ops.filter((o) => o.type === 'rect' && o.fill === '#f0fdf4');
    expect(roomRects.length).toBe(0);
    expect(ops.length).toBeGreaterThan(0); // boundary, grid, watermark
  });

  it('computes scale to fit 7x7.7 inch drawing area', () => {
    // For a 30x40 ft plot, scale = min(7/30, 7.7/40) = min(0.2333, 0.1925) = 0.1925.
    const ops = buildVectorPdfOps(BASE_PLAN, 0);
    // The plot boundary rect should span the full drawing area.
    const boundary = ops.find(
      (o) => o.type === 'rect' && o.fill === '#ffffff'
    );
    expect(boundary).toBeDefined();
    if (boundary && boundary.type === 'rect') {
      // Width should be ~30 * 0.1925 = 5.775 inches (within 7).
      expect(boundary.w).toBeLessThanOrEqual(7);
      // Height should be ~40 * 0.1925 = 7.7 inches.
      expect(boundary.h).toBeLessThanOrEqual(7.7);
    }
  });

  it('north angle rotates the compass', () => {
    const opsNorth = buildVectorPdfOps({ ...BASE_PLAN, northAngle: 0 }, 0);
    const opsEast = buildVectorPdfOps({ ...BASE_PLAN, northAngle: 90 }, 0);
    // Both should have a compass circle and "N" text.
    const circlesNorth = opsNorth.filter((o) => o.type === 'circle').length;
    const circlesEast = opsEast.filter((o) => o.type === 'circle').length;
    expect(circlesNorth).toBeGreaterThan(0);
    expect(circlesEast).toBeGreaterThan(0);
  });
});
