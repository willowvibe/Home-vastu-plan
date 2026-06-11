/**
 * Tests for `src/utils.ts`. Pins the S-12 contract: any unknown thrown
 * value should be reduced to a safe string for surfacing to the user.
 *
 * If you change `getErrorMessage`, update the test cases here.
 */

import { describe, it, expect } from 'vitest';
import { cn, getErrorMessage } from './utils';

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
