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

// Marker for password-protected share payloads so the loader can route them
// to decryption instead of plain LZ-string decompression.
const ENCRYPTED_PREFIX = 'enc:v1:';

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

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPlan(
  plan: FloorPlan,
  analysis: string | null,
  password: string
): Promise<string> {
  const jsonString = compressPlan(plan, analysis);
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(jsonString)
  );
  return `${ENCRYPTED_PREFIX}${bufferToBase64url(salt)}.${bufferToBase64url(iv)}.${bufferToBase64url(
    cipher
  )}`;
}

export async function decryptPlan(
  encrypted: string,
  password: string
): Promise<{ plan: FloorPlan; analysis?: string } | null> {
  if (!encrypted.startsWith(ENCRYPTED_PREFIX)) return null;
  const payload = encrypted.slice(ENCRYPTED_PREFIX.length);
  const parts = payload.split('.');
  if (parts.length !== 3) return null;
  try {
    const salt = new Uint8Array(base64urlToBuffer(parts[0]));
    const iv = new Uint8Array(base64urlToBuffer(parts[1]));
    const cipher = base64urlToBuffer(parts[2]);
    const key = await deriveKey(password, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    const decoder = new TextDecoder();
    const data = JSON.parse(decoder.decode(plain));
    if (!data || !data.rooms || !Array.isArray(data.rooms)) return null;
    const { analysis, ...plan } = data;
    return { plan, analysis };
  } catch {
    return null;
  }
}

export function isEncryptedShare(encoded: string): boolean {
  return encoded.startsWith(ENCRYPTED_PREFIX);
}

export function generateShareLink(
  plan: FloorPlan,
  analysis: string | null,
  mode: 'view' | 'comment',
  password?: string
): string {
  if (password) {
    throw new Error('generateShareLink password variant is async; use generateProtectedShareLink');
  }
  const jsonString = compressPlan(plan, analysis);
  if (jsonString.length > MAX_SHARE_BYTES) {
    throw new Error(
      `Plan is too large to share. Exceeds ${MAX_SHARE_BYTES} bytes. Try removing some rooms or elements.`
    );
  }
  const encoded = LZString.compressToEncodedURIComponent(jsonString);
  return `${window.location.origin}${window.location.pathname}?mode=${mode}&plan=${encoded}`;
}

export async function generateProtectedShareLink(
  plan: FloorPlan,
  analysis: string | null,
  mode: 'view' | 'comment',
  password: string
): Promise<string> {
  const jsonString = compressPlan(plan, analysis);
  if (jsonString.length > MAX_SHARE_BYTES) {
    throw new Error(
      `Plan is too large to share. Exceeds ${MAX_SHARE_BYTES} bytes. Try removing some rooms or elements.`
    );
  }
  const encrypted = await encryptPlan(plan, analysis, password);
  return `${window.location.origin}${window.location.pathname}?mode=${mode}&plan=${encrypted}`;
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
