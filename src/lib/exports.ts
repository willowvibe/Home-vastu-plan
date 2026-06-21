/**
 * Barrel for the export/print/share helpers.
 *
 * Q-12: this file used to be a 160-line grab-bag of 7 functions across
 * 5 concerns (PNG / JSON / SVG / share-link / print). It is now a
 * 1-purpose file that re-exports the five per-concern modules. The
 * per-concern files are the source of truth; this barrel exists for
 * back-compat with `App.tsx` and any future caller that prefers the
 * short import path.
 *
 *   `import { exportToPNG } from './lib/exports';`            ← still works
 *   `import { exportToPNG } from './lib/exportPng';`          ← preferred
 *
 * If you add a new export helper, add it to the right per-concern
 * file and re-export it here.
 */

export { exportToPNG } from './exportPng';
export { exportToSVG } from './exportSvg';
export { exportToJSON, importJSONFile } from './exportJson';
export {
  generateShareLink,
  generateProtectedShareLink,
  checkPlanSize,
  compressPlan,
  decompressPlan,
  encryptPlan,
  decryptPlan,
  isEncryptedShare,
} from './shareLink';
export { printCanvas } from './printPlan';
