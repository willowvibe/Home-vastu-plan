import { describe, it, expect } from 'vitest';
import { getBuildHash, getCacheName } from './buildHash';

describe('buildHash (S-22)', () => {
  it('returns a deterministic 8-char hex for the same input', () => {
    const a = getBuildHash('<!doctype html><html></html>');
    const b = getBuildHash('<!doctype html><html></html>');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it('returns a different hash when the input changes', () => {
    expect(getBuildHash('v1')).not.toBe(getBuildHash('v2'));
  });

  it('treats string and Buffer inputs as equivalent', () => {
    const s = '<!doctype html><html></html>';
    expect(getBuildHash(s)).toBe(getBuildHash(Buffer.from(s)));
  });

  it('prefixes the cache name with vastuplan-', () => {
    expect(getCacheName('hello')).toBe(`vastuplan-${getBuildHash('hello')}`);
    expect(getCacheName('hello')).toMatch(/^vastuplan-[0-9a-f]{8}$/);
  });
});
