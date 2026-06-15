/**
 * Tests for `src/utils.ts`. Pins the S-12 contract: any unknown thrown
 * value should be reduced to a safe string for surfacing to the user,
 * and pins the U-1 contract: new rooms offset instead of stacking.
 *
 * If you change `getErrorMessage` or `computeInitialRoomPosition`,
 * update the test cases here.
 */

import { describe, it, expect } from 'vitest';
import { cn, computeInitialRoomPosition, getErrorMessage } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
});

describe('getErrorMessage', () => {
  it('returns the message of an Error instance', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns the message of a TypeError (subclass of Error)', () => {
    expect(getErrorMessage(new TypeError('bad type'))).toBe('bad type');
  });

  it('returns a plain string as-is', () => {
    expect(getErrorMessage('just a string')).toBe('just a string');
  });

  it('returns the message property of a thrown object literal', () => {
    // Some libraries throw `{ message, code }` instead of an Error.
    expect(getErrorMessage({ message: 'something failed' })).toBe('something failed');
  });

  it('returns an empty string for an object with no message', () => {
    expect(getErrorMessage({ code: 42 })).toBe('');
  });

  it('returns an empty string for null', () => {
    expect(getErrorMessage(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('');
  });

  it('returns an empty string for a number', () => {
    expect(getErrorMessage(42)).toBe('');
  });

  it('returns an empty string for an object with a non-string message', () => {
    expect(getErrorMessage({ message: 42 })).toBe('');
  });

  it('returns an empty string for an array', () => {
    expect(getErrorMessage(['nope'])).toBe('');
  });
});

describe('computeInitialRoomPosition (U-1: no more stacked rooms)', () => {
  // Standard 30x40 plot with 3' setbacks on all sides = 24' x 34' buildable.
  const plan = {
    plotWidth: 30,
    plotHeight: 40,
    setbacks: { top: 3, right: 3, bottom: 3, left: 3 },
  };

  it('first room on an empty floor lands at the setback origin', () => {
    expect(computeInitialRoomPosition(plan, [], 0)).toEqual({ x: 3, y: 3 });
  });

  it('second room on the same floor is offset by 0.5 ft on both axes', () => {
    const rooms = [{ floor: 0 }];
    expect(computeInitialRoomPosition(plan, rooms, 0)).toEqual({ x: 3.5, y: 3.5 });
  });

  it('fourth room on the same floor is offset by 1.5 ft on both axes (3 prior rooms × 0.5)', () => {
    const rooms = [{ floor: 0 }, { floor: 0 }, { floor: 0 }];
    expect(computeInitialRoomPosition(plan, rooms, 0)).toEqual({ x: 4.5, y: 4.5 });
  });

  it('rooms on other floors do not affect the offset for the current floor', () => {
    // 3 rooms on floor 0 — but we are adding to floor 1, so we should
    // still land at the setback origin.
    const rooms = [{ floor: 0 }, { floor: 0 }, { floor: 0 }];
    expect(computeInitialRoomPosition(plan, rooms, 1)).toEqual({ x: 3, y: 3 });
  });

  it('offsets cascade: each new room is +0.5 ft on both axes (pure diagonal)', () => {
    // 24' buildable width / 0.5 ft step = 48 max steps on x.
    // 34' buildable height / 0.5 ft step = 68 max steps on y.
    // min(48, 68) = 48 — so every 48 rooms, the diagonal cascade wraps.
    const rooms47 = Array.from({ length: 47 }, () => ({ floor: 0 }));
    // The 48th room has 47 prior — dx=23.5, dy=23.5
    expect(computeInitialRoomPosition(plan, rooms47, 0)).toEqual({ x: 26.5, y: 26.5 });
    const rooms48 = Array.from({ length: 48 }, () => ({ floor: 0 }));
    // The 49th room has 48 prior — wraps to (0, 0)
    expect(computeInitialRoomPosition(plan, rooms48, 0)).toEqual({ x: 3, y: 3 });
  });

  it('uses the plan setbacks (not hard-coded zeros) as the origin', () => {
    const bigSetback = {
      plotWidth: 30,
      plotHeight: 40,
      setbacks: { top: 5, right: 5, bottom: 5, left: 7 },
    };
    expect(computeInitialRoomPosition(bigSetback, [], 0)).toEqual({ x: 7, y: 5 });
  });
});
