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

describe('sentry (process.env regression)', () => {
  it('capture helpers do not throw when global process is undefined', async () => {
    vi.stubGlobal('process', undefined);
    try {
      const { captureError, captureMessage } = await import('./sentry');
      expect(() => captureError(new Error('boom'))).not.toThrow();
      expect(() => captureMessage('hello')).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('captureError is a dev-mode log when initialized in test (import.meta.env.DEV)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { initSentry, captureError } = await import('./sentry');
    initSentry({ dsn: 'https://abc@example.com/1', enabled: true });
    captureError(new Error('boom'));
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error captured (Sentry disabled in dev):',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
