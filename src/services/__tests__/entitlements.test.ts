import { describe, it, expect, beforeEach } from 'vitest';

// Install a real in-memory localStorage shim (pattern from useDarkMode.test.ts).
const memStore: Record<string, string> = {};
const localStorageImpl = {
  getItem: (k: string) => (k in memStore ? memStore[k] : null),
  setItem: (k: string, v: string) => {
    memStore[k] = String(v);
  },
  removeItem: (k: string) => {
    delete memStore[k];
  },
  clear: () => {
    for (const k of Object.keys(memStore)) delete memStore[k];
  },
  length: 0,
  key: () => null,
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageImpl,
  writable: true,
  configurable: true,
});

// Import AFTER installing the shim so the module reads our store.
import {
  getProExportEntitlement,
  setLocalProExportOverride,
  isWatermarkRequired,
  refreshProExportEntitlement,
} from '../entitlements';

describe('entitlements', () => {
  beforeEach(() => {
    // Clear the in-memory store between tests.
    for (const k of Object.keys(memStore)) delete memStore[k];
  });

  describe('getProExportEntitlement', () => {
    it('returns false when localStorage key is absent', () => {
      expect(getProExportEntitlement()).toBe(false);
    });

    it('returns true when localStorage key is "1"', () => {
      memStore['vp_pro_export'] = '1';
      expect(getProExportEntitlement()).toBe(true);
    });

    it('returns false when localStorage key is "0"', () => {
      memStore['vp_pro_export'] = '0';
      expect(getProExportEntitlement()).toBe(false);
    });

    it('returns false when localStorage key is some other value', () => {
      memStore['vp_pro_export'] = 'garbage';
      expect(getProExportEntitlement()).toBe(false);
    });
  });

  describe('setLocalProExportOverride', () => {
    it('sets key to "1" when enabled is true', () => {
      setLocalProExportOverride(true);
      expect(memStore['vp_pro_export']).toBe('1');
    });

    it('removes key when enabled is false', () => {
      memStore['vp_pro_export'] = '1';
      setLocalProExportOverride(false);
      expect('vp_pro_export' in memStore).toBe(false);
    });
  });

  describe('refreshProExportEntitlement', () => {
    beforeEach(() => {
      // Clear any cached server entitlement between tests.
      refreshProExportEntitlement(null).catch(() => {});
      vi.stubGlobal('fetch', vi.fn());
      (import.meta.env as Record<string, string>).VITE_API_URL = 'http://localhost:3001';
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns false and clears cache when no session is provided', async () => {
      const result = await refreshProExportEntitlement(null);
      expect(result).toBe(false);
      expect(getProExportEntitlement()).toBe(false);
    });

    it('fetches the server entitlement and returns true when active', async () => {
      const session = {
        access_token: 'token_123',
      } as unknown as import('@supabase/supabase-js').Session;
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ tier: 'pro_export', expiresAt: null, isActive: true }), {
          status: 200,
        })
      );

      const result = await refreshProExportEntitlement(session);

      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/payments/entitlement', {
        headers: {
          Authorization: 'Bearer token_123',
          'Content-Type': 'application/json',
        },
      });
      expect(result).toBe(true);
      expect(getProExportEntitlement()).toBe(true);
    });

    it('falls back to free when the server reports an inactive entitlement', async () => {
      const session = {
        access_token: 'token_123',
      } as unknown as import('@supabase/supabase-js').Session;
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ tier: 'free', expiresAt: null, isActive: false }), {
          status: 200,
        })
      );

      const result = await refreshProExportEntitlement(session);

      expect(result).toBe(false);
      expect(getProExportEntitlement()).toBe(false);
    });

    it('preserves the local override even when the server says inactive', async () => {
      memStore['vp_pro_export'] = '1';
      const session = {
        access_token: 'token_123',
      } as unknown as import('@supabase/supabase-js').Session;
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ tier: 'free', expiresAt: null, isActive: false }), {
          status: 200,
        })
      );

      const result = await refreshProExportEntitlement(session);

      expect(result).toBe(true);
      expect(getProExportEntitlement()).toBe(true);
    });
  });

  describe('isWatermarkRequired', () => {
    it('returns true when not Pro (no key)', () => {
      expect(isWatermarkRequired()).toBe(true);
    });

    it('returns false when Pro (key is "1")', () => {
      memStore['vp_pro_export'] = '1';
      expect(isWatermarkRequired()).toBe(false);
    });
  });
});
