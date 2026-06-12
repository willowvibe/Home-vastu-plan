/**
 * Import + export the floor plan as a JSON file.
 *
 * Export:
 *  - Embeds the AI analysis (if any) and a `version: '2.0'` field so
 *    future readers can detect old formats.
 *  - Rejects plans over 2 MB on the way out (most browsers refuse
 *    a Blob URL larger than that).
 *
 * Import:
 *  - Caps input at 5 MB (the FileReader will still read the whole file,
 *    but we fail fast with a useful message).
 *  - Pulls `analysis` out of the top-level object so the result
 *    `{ plan, analysis }` matches the shape of the live state.
 *  - Returns `null` (not throws) for a syntactically valid JSON that
 *    has no `rooms` array — that's "wrong shape", not "corrupt file".
 *
 * The `version: '2.0'` literal has not changed since 2026-04; bumping
 * it is a migration concern, not a local one.
 */

import { FloorPlan } from '../types';

const MAX_EXPORT_BYTES = 2_000_000;
const MAX_IMPORT_BYTES = 5_000_000;
const JSON_EXPORT_VERSION = '2.0';

export function exportToJSON(plan: FloorPlan, filename: string, analysis?: string | null): void {
  const planData = {
    ...plan,
    ...(analysis ? { analysis } : {}),
    exportedAt: new Date().toISOString(),
    version: JSON_EXPORT_VERSION,
  };
  const jsonString = JSON.stringify(planData, null, 2);
  if (jsonString.length > MAX_EXPORT_BYTES) {
    throw new Error(`Plan is too large to export. Exceeds ${MAX_EXPORT_BYTES} bytes.`);
  }
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function importJSONFile(file: File): Promise<{ plan: FloorPlan; analysis?: string } | null> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMPORT_BYTES) {
      reject(new Error(`File is too large. Maximum allowed size is ${MAX_IMPORT_BYTES} bytes.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.rooms && Array.isArray(data.rooms)) {
          const { analysis, ...plan } = data;
          resolve({ plan, analysis });
        } else {
          resolve(null);
        }
      } catch {
        reject(new Error('Failed to import floor plan. Invalid JSON format.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
