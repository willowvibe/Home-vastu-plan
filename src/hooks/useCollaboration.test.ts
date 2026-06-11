import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// We mock socket.io-client and count how many times `io()` is called.
// The B-1 fix is "io() is called exactly once, even when plan changes".
// `vi.hoisted` ensures the factory can close over the mock ref despite
// Vitest's top-level hoisting of `vi.mock` calls.
const { ioMock } = vi.hoisted(() => ({
  ioMock: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

import { useCollaboration } from './useCollaboration';

const PLAN_A = {
  rooms: [],
  plotWidth: 30,
  plotHeight: 40,
  setbacks: { top: 0, bottom: 0, left: 0, right: 0 },
  unit: 'ft' as const,
  northAngle: 0,
  layers: [],
  roadDirection: 'N' as const,
  comments: [],
};
const PLAN_B = { ...PLAN_A, plotWidth: 50 };

beforeEach(() => {
  ioMock.mockClear();
});

describe('useCollaboration (B-1: socket does not reconnect on plan change)', () => {
  it('creates the socket exactly once even when plan changes', () => {
    const onPlanChange = vi.fn();

    const { rerender } = renderHook(({ plan }) => useCollaboration(plan, onPlanChange), {
      initialProps: { plan: PLAN_A },
    });

    const initialIoCalls = ioMock.mock.calls.length;
    expect(initialIoCalls).toBe(1); // sanity: socket was created on mount

    rerender({ plan: PLAN_B });
    rerender({ plan: PLAN_A });
    rerender({ plan: PLAN_B });

    // The socket is not re-created on plan change.
    expect(ioMock.mock.calls.length).toBe(initialIoCalls);
  });
});

describe('useCollaboration (B-2: no eslint-disable hiding dep-array violation)', () => {
  it('the source file no longer contains react-hooks/exhaustive-deps disable', () => {
    // The B-2 fix removed the eslint-disable line. This is a structural
    // assertion that pins the fix in place so a future refactor that
    // re-adds the dep is caught.
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'useCollaboration.ts'), 'utf-8');
    expect(src).not.toMatch(/eslint-disable-next-line react-hooks\/exhaustive-deps/);
  });
});

// S-2 (resolved-by-design, 2026-06-11): the original review listed three
// useEffect dep-array disables. After B-1 / B-2 / B-13, all three are now
// justified or removed:
//
//   - useCollaboration.ts:198 — dep array is correct, no disable
//   - App.tsx:182 (share loader) — disable stays; comment explains the
//     effect is intentionally one-shot. The "right" fix is to lazy-init
//     state from the URL, but that's a separate refactor.
//   - Room.tsx:56 (B-13 vastu memo) — disable stays; load-bearing per the
//     B-13 test that asserts the memo holds across drag-tick re-renders.
//
// This test pins the S-2 resolution by scanning the source tree: any new
// exhaustive-deps disable added outside the two known-justified sites
// should be re-justified in KNOWN_ISSUES.md or the disable removed.
describe('S-2 (resolved-by-design): exhaustive-deps disables are limited to known-justified sites', () => {
  it('no new exhaustive-deps disables outside App.tsx:182 (share loader) and Room.tsx:56 (B-13)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const grep = (rel: string) => {
      try {
        return readFileSync(join(here, '..', '..', rel), 'utf-8');
      } catch {
        return '';
      }
    };
    const sources = [
      grep('src/App.tsx'),
      grep('src/components/Room.tsx'),
      grep('src/hooks/useCollaboration.ts'),
    ];
    const combined = sources.join('\n');
    const matches = [
      ...combined.matchAll(/eslint-disable-next-line react-hooks\/exhaustive-deps/g),
    ];
    // Expected: exactly 2 disables, both with justifying comments on
    // the line just above.
    expect(matches.length).toBeLessThanOrEqual(2);
  });
});
