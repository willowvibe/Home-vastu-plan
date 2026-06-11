// S-22: builds a per-deploy cache name so new deploys force a fresh service
// worker cache and old caches self-prune in the activate handler.
//
// Pure: given input bytes (typically dist/index.html), returns
// "vastuplan-<8-char-hex>". Extracted so the hash step can be unit-tested
// without booting Vite, and so vite.config.ts (Node) and any future CLI tool
// (e.g. a deploy script) can share the same name.
import { createHash } from 'node:crypto';

export function getBuildHash(contents: string | Buffer): string {
  return createHash('sha256').update(contents).digest('hex').slice(0, 8);
}

export function getCacheName(contents: string | Buffer): string {
  return `vastuplan-${getBuildHash(contents)}`;
}
