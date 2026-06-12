/**
 * Share-link helpers: encode a `FloorPlan` + analysis into a URL the
 * recipient can open to view (or comment on) the same plan.
 *
 * `generateShareLink`:
 *  - LZ-string-compresses the JSON so the URL fits in the practical
 *    2 KB-3 KB most chat clients / email clients accept.
 *  - Caps at 1 MB uncompressed (~250 KB compressed is the typical cap
 *    in the wild). Going over is the right time to tell the user
 *    "your plan is too big to share" — silently truncating would
 *    produce a link that decodes to an empty plan.
 *
 * `checkPlanSize`:
 *  - Surfaces the same 1 MB cap to the share UI so the button can be
 *    disabled before the user clicks it. The returned `maxSize` is
 *    exported (not just used internally) so the UI can render the
 *    same number the encoder enforces.
 *
 * `compressPlan` / `decompressPlan`:
 *  - The pure round-trip pair used by the unit test and by anything
 *    that wants to encode/decode without the URL wrapper.
 */

import LZString from 'lz-string';
import { FloorPlan } from '../types';

const MAX_SHARE_BYTES = 1_000_000;

export function compressPlan(plan: FloorPlan, analysis: string | null): string {
  const planWithAnalysis = {
    ...plan,
    analysis: analysis || undefined,
  };
  return JSON.stringify(planWithAnalysis);
}

export function decompressPlan(encoded: string): { plan: FloorPlan; analysis?: string } | null {
  const json = LZString.decompressFromEncodedURIComponent(encoded);
  if (!json) return null;
  const data = JSON.parse(json);
  if (!data || !data.rooms || !Array.isArray(data.rooms)) return null;
  const { analysis, ...plan } = data;
  return { plan, analysis };
}

export function generateShareLink(
  plan: FloorPlan,
  analysis: string | null,
  mode: 'view' | 'comment'
): string {
  const jsonString = compressPlan(plan, analysis);
  if (jsonString.length > MAX_SHARE_BYTES) {
    throw new Error(
      `Plan is too large to share. Exceeds ${MAX_SHARE_BYTES} bytes. Try removing some rooms or elements.`
    );
  }
  const encoded = LZString.compressToEncodedURIComponent(jsonString);
  return `${window.location.origin}${window.location.pathname}?mode=${mode}&plan=${encoded}`;
}

export function checkPlanSize(
  plan: FloorPlan,
  analysis: string | null
): {
  sizeKB: string;
  isLarge: boolean;
  maxSize: number;
} {
  const jsonString = compressPlan(plan, analysis);
  const sizeKB = (jsonString.length / 1024).toFixed(2);
  const isLarge = jsonString.length > MAX_SHARE_BYTES;
  return { sizeKB, isLarge, maxSize: MAX_SHARE_BYTES };
}
