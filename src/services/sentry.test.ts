import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/react', () => ({
  setUser: vi.fn(),
  setTag: vi.fn(),
  addBreadcrumb: vi.fn(),
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((cb) => cb({ setContext: vi.fn() })),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

import * as Sentry from '@sentry/react';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('sentry (S-7: setUser/addBreadcrumb are no-ops when not initialized)', () => {
  it('setUser is a no-op when initSentry was not called', async () => {
    const { setUser, isSentryInitialized } = await import('./sentry');
    expect(isSentryInitialized()).toBe(false);
    setUser('u1', 'a@b.c', 'Bob');
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it('addBreadcrumb is a no-op when initSentry was not called', async () => {
    const { addBreadcrumb, isSentryInitialized } = await import('./sentry');
    expect(isSentryInitialized()).toBe(false);
    addBreadcrumb('test', 'cat', { foo: 'bar' });
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
  });
});
