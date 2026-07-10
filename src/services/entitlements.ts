const PRO_EXPORT_KEY = 'vp_pro_export';

/**
 * Check whether the current user is entitled to watermark-free Pro Export.
 * In M-1 this reads a localStorage dev-override flag.
 * M-2 (Razorpay) will extend this to check Supabase user metadata.
 */
export function getProExportEntitlement(): boolean {
  try {
    return localStorage.getItem(PRO_EXPORT_KEY) === '1';
  } catch {
    // localStorage unavailable (SSR, sandboxed iframe) — default to free tier.
    return false;
  }
}

/**
 * Set or clear the local Pro Export override (dev/testing only).
 * M-2 will replace this with a server-authoritative check.
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
 * Convenience: returns true if the watermark should be applied.
 * `!getProExportEntitlement()`.
 */
export function isWatermarkRequired(): boolean {
  return !getProExportEntitlement();
}
