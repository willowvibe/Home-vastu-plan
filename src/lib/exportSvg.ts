/**
 * Export the floor plan to an SVG file.
 *
 * The SVG is reconstructed from the `FloorPlan` primitives (not rendered
 * from the DOM) so it is resolution-independent: opening the file in
 * Inkscape / Illustrator gives vector output, not a rasterized PNG.
 *
 * The Vastu 3×3 grid and the north-arrow compass are optional and
 * inlined into the same SVG. Wall thickness on a room is converted from
 * inches (storage) to feet (math) with the shared `INCHES_PER_FOOT`
 * constant from `constants/geometry.ts` — see S-8.
 *
 * The same `scale = 20` px-per-ft has been used since v0.1.0; changing
 * it is a user-visible product decision (the SVG opens at a different
 * size in viewers), not a local concern.
 */

import { FloorPlan } from '../types';
import { INCHES_PER_FOOT, DEFAULT_WALL_THICKNESS_IN } from '../constants/geometry';

export function exportToSVG(plan: FloorPlan, currentFloor: number, showVastuGrid: boolean): void {
  const scale = 20;
  const rooms = plan.rooms
    .filter((r) => r.floor === currentFloor)
    .map(
      (r) => `
    <rect x="${r.x * scale}" y="${r.y * scale}" width="${r.w * scale}" height="${r.h * scale}" fill="#f0fdf4" stroke="#65a30d" stroke-width="${((r.wallThickness || DEFAULT_WALL_THICKNESS_IN) / INCHES_PER_FOOT) * scale}" rx="2"/>
    <text x="${(r.x + r.w / 2) * scale}" y="${(r.y + r.h / 2) * scale}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="12" fill="#1f2937">${r.type}</text>
  `
    )
    .join('');

  const vastuGrid = showVastuGrid
    ? Array.from({ length: 3 })
        .map((_, row) =>
          Array.from({ length: 3 })
            .map(
              (_, col) => `
    <rect x="${((col * (plan.plotWidth - plan.setbacks.left - plan.setbacks.right)) / 3 + plan.setbacks.left) * scale}" y="${((row * (plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom)) / 3 + plan.setbacks.top) * scale}" width="${((plan.plotWidth - plan.setbacks.left - plan.setbacks.right) / 3) * scale}" height="${((plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom) / 3) * scale}" fill="none" stroke="#6366f1" stroke-width="0.5" stroke-dasharray="4,4"/>
  `
            )
            .join('')
        )
        .join('')
    : '';

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${plan.plotWidth * scale}" height="${plan.plotHeight * scale}" viewBox="0 0 ${plan.plotWidth * scale} ${plan.plotHeight * scale}">
  <rect width="100%" height="100%" fill="white"/>
  <defs>
    <pattern id="grid" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
      <path d="M ${scale} 0 L 0 0 0 ${scale}" fill="none" stroke="#e5e7eb" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  ${rooms}
  ${vastuGrid}
  <g transform="translate(${plan.setbacks.left * scale}, ${plan.setbacks.top * scale}) rotate(${plan.northAngle})">
    <path d="M0 -40 L0 40" stroke="#ef4444" stroke-width="2"/>
    <circle cx="0" cy="40" r="4" fill="#ef4444"/>
    <text x="0" y="-45" text-anchor="middle" font-size="12" fill="#ef4444" font-weight="bold">N</text>
  </g>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `VastuPlan_Floor_${currentFloor}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
