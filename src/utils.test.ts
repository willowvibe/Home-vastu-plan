/**
 * Tests for `src/utils.ts`. Pins the S-12 contract: any unknown thrown
 * value should be reduced to a safe string for surfacing to the user,
 * and pins the U-1 contract: new rooms offset instead of stacking.
 *
 * If you change `getErrorMessage` or `computeInitialRoomPosition`,
 * update the test cases here.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  clampRoomToBuildableArea,
  cn,
  computeInitialRoomPosition,
  copyToClipboardWithFallback,
  getAnalyzeButtonState,
  getErrorMessage,
} from './utils';

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

describe('getAnalyzeButtonState (U-9: helpful disabled state when API key is missing)', () => {
  it('disables with a specific tooltip when the API key is missing', () => {
    const state = getAnalyzeButtonState({
      isAnalyzing: false,
      hasApiKey: false,
      hasRoomsOnCurrentFloor: true,
    });
    expect(state.disabled).toBe(true);
    expect(state.title).toMatch(/VITE_GEMINI_API_KEY/);
  });

  it('disables with a "no rooms" tooltip when there are no rooms on the current floor', () => {
    const state = getAnalyzeButtonState({
      isAnalyzing: false,
      hasApiKey: true,
      hasRoomsOnCurrentFloor: false,
    });
    expect(state.disabled).toBe(true);
    expect(state.title).toMatch(/Add at least one room/);
  });

  it('disables while analyzing', () => {
    const state = getAnalyzeButtonState({
      isAnalyzing: true,
      hasApiKey: true,
      hasRoomsOnCurrentFloor: true,
    });
    expect(state.disabled).toBe(true);
    expect(state.title).toMatch(/Analyzing/);
  });

  it('enables when API key is set + rooms exist + not analyzing', () => {
    const state = getAnalyzeButtonState({
      isAnalyzing: false,
      hasApiKey: true,
      hasRoomsOnCurrentFloor: true,
    });
    expect(state.disabled).toBe(false);
    expect(state.title).toMatch(/Analyze/);
  });

  it('prefers the API-key-missing message over the no-rooms message when both are wrong', () => {
    // The most common scenario in a fresh checkout: no API key + no
    // rooms. The API-key message is more actionable, so it wins.
    const state = getAnalyzeButtonState({
      isAnalyzing: false,
      hasApiKey: false,
      hasRoomsOnCurrentFloor: false,
    });
    expect(state.title).toMatch(/VITE_GEMINI_API_KEY/);
  });
});

describe('clampRoomToBuildableArea (U-11: no more 500ft rooms past the plot)', () => {
  const plan = {
    plotWidth: 30,
    plotHeight: 40,
    setbacks: { top: 3, right: 3, bottom: 3, left: 3 },
  };
  // Buildable area: 24' x 34' (plot minus setbacks on each side).
  const room = (overrides: Partial<{ x: number; y: number; w: number; h: number }> = {}) => ({
    id: 'r1',
    type: 'bedroom',
    floor: 0,
    wallThickness: 9,
    x: 3,
    y: 3,
    w: 12,
    h: 12,
    ...overrides,
  });

  it('returns a room unchanged when it is inside the buildable area', () => {
    const r = room();
    expect(clampRoomToBuildableArea(r, plan)).toEqual(r);
  });

  it('clamps width when the room is too wide', () => {
    const r = room({ w: 500 });
    const clamped = clampRoomToBuildableArea(r, plan);
    expect(clamped.w).toBe(24);
  });

  it('clamps height when the room is too tall', () => {
    const r = room({ h: 500 });
    const clamped = clampRoomToBuildableArea(r, plan);
    expect(clamped.h).toBe(34);
  });

  it('shifts x leftward when the room extends past the right setback', () => {
    // Room at x=20, w=20 → right edge at 40 (10 past the 27 right setback).
    const r = room({ x: 20, w: 20 });
    const clamped = clampRoomToBuildableArea(r, plan);
    // Right edge should not exceed plotWidth - setbacks.right = 27.
    expect(clamped.x + clamped.w).toBeLessThanOrEqual(27);
  });

  it('shifts y upward when the room extends past the bottom setback', () => {
    const r = room({ y: 30, h: 20 });
    const clamped = clampRoomToBuildableArea(r, plan);
    expect(clamped.y + clamped.h).toBeLessThanOrEqual(37);
  });

  it('clamps both axes when the room exceeds the buildable area in both', () => {
    const r = room({ x: 0, y: 0, w: 500, h: 500 });
    const clamped = clampRoomToBuildableArea(r, plan);
    expect(clamped.w).toBe(24);
    expect(clamped.h).toBe(34);
    expect(clamped.x + clamped.w).toBeLessThanOrEqual(27);
    expect(clamped.y + clamped.h).toBeLessThanOrEqual(37);
  });

  it('returns the original room when the buildable area is zero (edge case)', () => {
    // Plot is exactly the size of the setbacks on each axis, so the
    // buildable area is 0. Clamping would produce a 0-size room, which
    // is useless, so the helper returns the input unchanged.
    const tinyPlan = {
      plotWidth: 6,
      plotHeight: 8,
      setbacks: { top: 3, right: 3, bottom: 3, left: 3 },
    };
    const r = room();
    expect(clampRoomToBuildableArea(r, tinyPlan)).toEqual(r);
  });
});

describe('copyToClipboardWithFallback (U-10: handle clipboard rejection)', () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    document.execCommand = originalExecCommand;
  });

  it('uses the clipboard API when it resolves', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    const result = await copyToClipboardWithFallback('https://example.com/plan');
    expect(writeText).toHaveBeenCalledWith('https://example.com/plan');
    expect(result).toEqual({ ok: true, method: 'clipboard' });
  });

  it('falls back to a textarea + execCommand when the clipboard API rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(true);
    const result = await copyToClipboardWithFallback('https://example.com/plan');
    expect(writeText).toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(result).toEqual({ ok: true, method: 'fallback' });
  });

  it('returns { ok: false } when both the clipboard and the fallback fail', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(false);
    const result = await copyToClipboardWithFallback('https://example.com/plan');
    expect(result).toEqual({ ok: false });
  });
});
