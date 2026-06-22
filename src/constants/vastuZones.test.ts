import { describe, it, expect } from 'vitest';
import { getVastuZone, getVastuZoneInfo } from './vastuZones';

describe('getVastuZone', () => {
  it('returns Brahmasthan for the center cell', () => {
    expect(getVastuZone(4, 0)).toBe('Brahmasthan');
  });

  it('maps grid cells for northAngle 0', () => {
    const expected = [
      'North-West',
      'North',
      'North-East',
      'West',
      'Brahmasthan',
      'East',
      'South-West',
      'South',
      'South-East',
    ];
    expected.forEach((zone, i) => {
      expect(getVastuZone(i, 0)).toBe(zone);
    });
  });

  it('rotates zones with northAngle', () => {
    expect(getVastuZone(1, 0)).toBe('North');
    expect(getVastuZone(1, 90)).toBe('West');
    expect(getVastuZone(1, 180)).toBe('South');
    expect(getVastuZone(1, 270)).toBe('East');
  });
});

describe('getVastuZoneInfo', () => {
  it('returns metadata for known zones', () => {
    const info = getVastuZoneInfo('North-East');
    expect(info.element).toContain('Water');
    expect(info.tip).toBeTruthy();
  });

  it('returns a fallback for unknown zones', () => {
    const info = getVastuZoneInfo('Unknown');
    expect(info.name).toBe('Unknown');
    expect(info.element).toBe('');
  });
});
