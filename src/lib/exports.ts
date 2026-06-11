import { toPng } from 'html-to-image';
import LZString from 'lz-string';
import { FloorPlan } from '../types';
import { INCHES_PER_FOOT, DEFAULT_WALL_THICKNESS_IN } from '../constants/geometry';

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

export function exportToJSON(plan: FloorPlan, filename: string, analysis?: string | null): void {
  const planData = {
    ...plan,
    ...(analysis ? { analysis } : {}),
    exportedAt: new Date().toISOString(),
    version: '2.0',
  };
  const jsonString = JSON.stringify(planData, null, 2);
  const maxSize = 2_000_000;
  if (jsonString.length > maxSize) {
    throw new Error(`Plan is too large to export. Exceeds ${maxSize} bytes.`);
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
    const maxSize = 5_000_000;
    if (file.size > maxSize) {
      reject(new Error(`File is too large. Maximum allowed size is ${maxSize} bytes.`));
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

export function generateShareLink(
  plan: FloorPlan,
  analysis: string | null,
  mode: 'view' | 'comment'
): string {
  const planWithAnalysis = {
    ...plan,
    analysis: analysis || undefined,
  };
  const jsonString = JSON.stringify(planWithAnalysis);
  const maxSize = 1_000_000;
  if (jsonString.length > maxSize) {
    throw new Error(
      `Plan is too large to share. Exceeds ${maxSize} bytes. Try removing some rooms or elements.`
    );
  }
  const encoded = LZString.compressToEncodedURIComponent(jsonString);
  return `${window.location.origin}${window.location.pathname}?mode=${mode}&plan=${encoded}`;
}

export function printCanvas(printRef: HTMLElement | null): void {
  if (printRef) {
    window.print();
  }
}

export function checkPlanSize(
  plan: FloorPlan,
  analysis: string | null
): {
  sizeKB: string;
  isLarge: boolean;
  maxSize: number;
} {
  const jsonString = JSON.stringify({
    ...plan,
    analysis: analysis || undefined,
  });
  const sizeKB = (jsonString.length / 1024).toFixed(2);
  const isLarge = jsonString.length > 1_000_000;
  return { sizeKB, isLarge, maxSize: 1_000_000 };
}
