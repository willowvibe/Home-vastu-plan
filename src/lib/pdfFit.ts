/**
 * Compute the largest (w, h) that fits inside (boxW, boxH) while preserving
 * the (imgW : imgH) aspect ratio. B-9: the PDF export handler previously
 * derived height from a fixed width, so tall plot images overflowed the
 * page. This helper clamps against both axes.
 */
export function fitInside(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): { w: number; h: number } {
  if (imgW <= 0 || imgH <= 0 || boxW <= 0 || boxH <= 0) {
    return { w: 0, h: 0 };
  }
  const scale = Math.min(boxW / imgW, boxH / imgH);
  return { w: imgW * scale, h: imgH * scale };
}
