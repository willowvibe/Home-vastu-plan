/**
 * Export the floor plan canvas to a PNG file.
 *
 * The canvas is rendered to a 2× pixel ratio so the saved PNG is sharp
 * enough for printing; we use `html-to-image` rather than `html2canvas`
 * because the latter bleeds across the SW cache chunk warning (see the
 * build report). The download is triggered by creating an `<a>` and
 * clicking it — the only browser-portable way to force a "Save As"
 * without opening a new tab.
 *
 * S-8: `TOLERANCE` and wall defaults are no longer used here (PNG is
 * rasterized from the rendered DOM, not reconstructed from `Room`
 * primitives).
 */

import { toPng } from 'html-to-image';

export async function exportToPNG(canvasElement: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(canvasElement, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
