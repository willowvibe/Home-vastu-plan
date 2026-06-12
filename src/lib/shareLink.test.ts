/**
 * Tests for `src/lib/shareLink.ts`. Pins the Q-12 contract that the
 * share link's encode/decode round-trip is lossless for any plan the
 * user could plausibly share.
 *
 * If you change `compressPlan` / `decompressPlan`, update the test
 * cases here. If you change `MAX_SHARE_BYTES`, the "rejects over-size"
 * test will need to know the new number.
 */

import { describe, it, expect } from 'vitest';
import { FloorPlan } from '../types';
import { compressPlan, decompressPlan, checkPlanSize } from './shareLink';
import LZString from 'lz-string';

const PLAN: FloorPlan = {
  plotWidth: 30,
  plotHeight: 40,
  northAngle: 0,
  roadDirection: 'N',
  unit: 'ft',
  setbacks: { top: 2, right: 2, bottom: 2, left: 2 },
  rooms: [
    {
      id: 'r1',
      type: 'Living Room',
      x: 2,
      y: 2,
      w: 12,
      h: 10,
      floor: 0,
      wallThickness: 9,
    },
    {
      id: 'r2',
      type: 'Kitchen',
      x: 14,
      y: 2,
      w: 8,
      h: 10,
      floor: 0,
      wallThickness: 6,
      elements: [{ id: 'e1', type: 'Stove', x: 1, y: 1, w: 2, h: 2, rotation: 0 }],
    },
  ],
  comments: [{ id: 'c1', text: 'try a bigger window', x: 5, y: 5, author: 'me', timestamp: 1 }],
  layers: [],
};

describe('shareLink round-trip', () => {
  it('compresses to an LZ-string-encoded URI component', () => {
    const json = compressPlan(PLAN, null);
    const encoded = LZString.compressToEncodedURIComponent(json);
    expect(encoded).toMatch(/^[A-Za-z0-9_+\-=]+$/); // URL-safe alphabet (LZ-string uses + - and = for padding)
  });

  it('decompressPlan is the inverse of compress + LZString compress', () => {
    const json = compressPlan(PLAN, 'AI said: align kitchen with north');
    const encoded = LZString.compressToEncodedURIComponent(json);
    const decoded = decompressPlan(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.plan).toEqual(PLAN);
    expect(decoded!.analysis).toBe('AI said: align kitchen with north');
  });

  it('round-trips without the analysis field', () => {
    const encoded = LZString.compressToEncodedURIComponent(compressPlan(PLAN, null));
    const decoded = decompressPlan(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.plan).toEqual(PLAN);
    expect(decoded!.analysis).toBeUndefined();
  });

  it('returns null for an encoded string that does not decompress to a valid plan', () => {
    expect(decompressPlan('!!!not-base64!!!')).toBeNull();
  });

  it('returns null for an encoded plan that has no rooms array', () => {
    const encoded = LZString.compressToEncodedURIComponent(JSON.stringify({ foo: 'bar' }));
    expect(decompressPlan(encoded)).toBeNull();
  });
});

describe('checkPlanSize', () => {
  it('reports sizeKB as a 2-decimal KB string', () => {
    const result = checkPlanSize(PLAN, null);
    expect(result.sizeKB).toMatch(/^\d+\.\d{2}$/);
  });

  it('isLarge is false for a normal-sized plan', () => {
    expect(checkPlanSize(PLAN, null).isLarge).toBe(false);
  });

  it('exposes the same maxSize cap that generateShareLink enforces', () => {
    expect(checkPlanSize(PLAN, null).maxSize).toBe(1_000_000);
  });

  it('isLarge is true when the plan+analysis exceeds the 1 MB cap', () => {
    // Synthesize a ~1.1 MB analysis blob; this is the cheapest way to
    // cross the threshold without inventing 30 000 rooms.
    const bigAnalysis = 'x'.repeat(1_100_000);
    const result = checkPlanSize(PLAN, bigAnalysis);
    expect(result.isLarge).toBe(true);
  });
});
