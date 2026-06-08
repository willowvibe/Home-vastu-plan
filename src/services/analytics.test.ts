import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('analytics (S-5: reads VITE_* env vars, not REACT_APP_*)', () => {
  it('disables analytics when VITE_ANALYTICS_ENABLED is "false"', async () => {
    vi.stubEnv('VITE_ANALYTICS_ENABLED', 'false');
    vi.stubEnv('VITE_ANALYTICS_DOMAIN', 'example.com');
    vi.stubEnv('VITE_ANALYTICS_API_HOST', 'https://plausible.example');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { trackEvent } = await import('./analytics');
    trackEvent('test_event');
    expect(logSpy).toHaveBeenCalledWith('[Analytics] Event: test_event', undefined);
  });

  it('source uses VITE_ANALYTICS_* and not REACT_APP_ANALYTICS_*', () => {
    // Structural assertion: the source must reference the Vite-prefixed
    // env vars and not the (Vite-incompatible) React-prefixed ones.
    const src = readFileSync(join(here, 'analytics.ts'), 'utf-8');
    expect(src).not.toMatch(/REACT_APP_ANALYTICS/);
    expect(src).toMatch(/VITE_ANALYTICS/);
  });
});
