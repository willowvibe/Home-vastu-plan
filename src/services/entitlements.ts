import type { Session } from '@supabase/supabase-js';

const PRO_EXPORT_KEY = 'vp_pro_export';

interface CachedEntitlement {
  active: boolean;
  expiresAt: string | null;
}

let serverEntitlement: CachedEntitlement | null = null;

/**
 * Check whether the current user is entitled to watermark-free Pro Export.
 *
 * Priority:
 * 1. localStorage dev override (`vp_pro_export = "1"`) — always wins.
 * 2. Cached server entitlement from `/api/payments/entitlement`.
 * 3. Free tier fallback.
 */
export function getProExportEntitlement(): boolean {
  try {
    if (localStorage.getItem(PRO_EXPORT_KEY) === '1') {
      return true;
    }
  } catch {
    // localStorage unavailable (SSR, sandboxed iframe) — fall through.
  }
  return serverEntitlement?.active ?? false;
}

/**
 * Set or clear the local Pro Export override (dev/testing only).
 */
export function setLocalProExportOverride(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(PRO_EXPORT_KEY, '1');
    } else {
      localStorage.removeItem(PRO_EXPORT_KEY);
    }
  } catch {
    // localStorage unavailable — silently no-op.
  }
}

/**
 * Fetch the server-side entitlement for the authenticated user and cache it.
 *
 * Call this when the Supabase session changes (sign-in / sign-out / restore).
 * It is safe to call with a null session; the cache is cleared and the local
 * override remains respected.
 */
export async function refreshProExportEntitlement(session: Session | null): Promise<boolean> {
  if (!session) {
    serverEntitlement = null;
    return getProExportEntitlement();
  }

  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!apiUrl) {
    serverEntitlement = null;
    return getProExportEntitlement();
  }

  try {
    const response = await fetch(`${apiUrl}/api/payments/entitlement`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Entitlement fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      tier: string;
      expiresAt: string | null;
      isActive: boolean;
    };

    serverEntitlement = { active: data.isActive, expiresAt: data.expiresAt };
    return getProExportEntitlement();
  } catch (error) {
    console.error('[entitlements] Failed to refresh server entitlement:', error);
    // Keep the previous cache on transient errors so paid users keep exporting.
    return getProExportEntitlement();
  }
}

/**
 * Convenience: returns true if the watermark should be applied.
 * `!getProExportEntitlement()`.
 */
export function isWatermarkRequired(): boolean {
  return !getProExportEntitlement();
}
