import { describe, it, expect } from 'vitest';
import { fitInside } from './pdfFit';

describe('fitInside (B-9 PDF aspect-fit)', () => {
  it('returns identity for 1:1 image in 1:1 box', () => {
    expect(fitInside(1, 1, 1, 1)).toEqual({ w: 1, h: 1 });
  });

  it('scales a wide image down so it fills the box width and respects height', () => {
    // 4:3 image in a square box → width-binding, height < boxH.
    const { w, h } = fitInside(400, 300, 10, 10);
    expect(w).toBeCloseTo(10);
    expect(h).toBeCloseTo(7.5);
  });

  it('scales a tall image down so it fills the box height and respects width', () => {
    // 3:4 image in a square box → height-binding, width < boxW. B-9 case.
    const { w, h } = fitInside(300, 400, 10, 10);
    expect(h).toBeCloseTo(10);
    expect(w).toBeCloseTo(7.5);
  });

  it('fits a tall image inside a landscape rectangle without overflow', () => {
    // Mirrors the PresentationExport case: 7 in wide × 7.7 in tall box,
    // 3:4 source. The fix must clamp h to 7.7 (not 7·4/3 ≈ 9.33).
    const { w, h } = fitInside(300, 400, 7, 7.7);
    expect(h).toBeLessThanOrEqual(7.7);
    expect(w).toBeLessThanOrEqual(7);
  });

  it('returns 0×0 for any non-positive input', () => {
    expect(fitInside(0, 100, 10, 10)).toEqual({ w: 0, h: 0 });
    expect(fitInside(100, 0, 10, 10)).toEqual({ w: 0, h: 0 });
    expect(fitInside(100, 100, 0, 10)).toEqual({ w: 0, h: 0 });
    expect(fitInside(100, 100, 10, 0)).toEqual({ w: 0, h: 0 });
    expect(fitInside(-10, 100, 10, 10)).toEqual({ w: 0, h: 0 });
  });
});
