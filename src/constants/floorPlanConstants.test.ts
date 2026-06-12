import { describe, it, expect } from 'vitest';
import { formatFloor } from './floorPlanConstants';

describe('formatFloor', () => {
  it('formats single-digit floors with the correct ordinal suffix', () => {
    expect(formatFloor(0)).toBe('0th');
    expect(formatFloor(1)).toBe('1st');
    expect(formatFloor(2)).toBe('2nd');
    expect(formatFloor(3)).toBe('3rd');
    expect(formatFloor(4)).toBe('4th');
  });

  it('handles the 11/12/13 special case (always "th")', () => {
    expect(formatFloor(11)).toBe('11th');
    expect(formatFloor(12)).toBe('12th');
    expect(formatFloor(13)).toBe('13th');
  });

  it('handles two-digit floors after the special case', () => {
    expect(formatFloor(14)).toBe('14th');
    expect(formatFloor(21)).toBe('21st');
    expect(formatFloor(22)).toBe('22nd');
    expect(formatFloor(23)).toBe('23rd');
  });

  it('handles three-digit floors with the % 100 rule', () => {
    expect(formatFloor(100)).toBe('100th');
    expect(formatFloor(111)).toBe('111th'); // 111 % 100 = 11 → special case
    expect(formatFloor(121)).toBe('121st'); // 121 % 100 = 21 → 1st
  });
});
