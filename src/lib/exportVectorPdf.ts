import { FloorPlan } from '../types';
import { INCHES_PER_FOOT } from '../constants/geometry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VectorPdfOp =
  | {
      type: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      rx?: number;
      dashPattern?: number[];
    }
  | {
      type: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      strokeWidth: number;
      dashPattern?: number[];
    }
  | {
      type: 'text';
      text: string;
      x: number;
      y: number;
      fontSize: number;
      font?: string;
      fontStyle?: string;
      align?: 'left' | 'center' | 'right';
      color?: string;
      angle?: number;
    }
  | {
      type: 'circle';
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      type: 'watermark';
      text: string;
      x: number;
      y: number;
      w: number;
      h: number;
      angle: number;
      color: string;
      fontSize: number;
    };

export interface VectorPdfExportOptions {
  /** Feet-to-inches scale. Default: computed to fit 7x7.7" drawing area. */
  scale?: number;
  /** Whether to include the Vastu 3x3 grid overlay. Default: true. */
  showVastuGrid?: boolean;
  /** Whether to include the north compass. Default: true. */
  showCompass?: boolean;
  /** Whether to include the watermark. Default: true (free tier). */
  watermark?: boolean;
  /** Watermark text. Default: "VastuPlan 2D — Free Plan". */
  watermarkText?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRAW_AREA_W = 7; // inches (letter landscape, left of title block)
const DRAW_AREA_H = 7.7; // inches
const GRID_COLOR = '#e5e7eb';
const ROOM_FILL = '#f0fdf4';
const ROOM_STROKE = '#65a30d';
const ELEMENT_FILL = '#e2e8f0';
const ELEMENT_STROKE = '#94a3b8';
const VASTU_GRID_COLOR = '#6366f1';
const COMPASS_COLOR = '#ef4444';
const WATERMARK_COLOR = '#94a3b8';
const DEFAULT_WATERMARK_TEXT = 'VastuPlan 2D — Free Plan';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultScale(plan: FloorPlan): number {
  return Math.min(DRAW_AREA_W / plan.plotWidth, DRAW_AREA_H / plan.plotHeight);
}

function ftToIn(feet: number, scale: number): number {
  return feet * scale;
}

function wallStrokeWidth(wallThicknessIn: number, scale: number): number {
  return (wallThicknessIn / INCHES_PER_FOOT) * scale;
}

// ---------------------------------------------------------------------------
// buildVectorPdfOps
// ---------------------------------------------------------------------------

/**
 * Build a list of vector drawing operations from FloorPlan primitives.
 * Pure function — no DOM, no jsPDF. Easy to unit-test.
 */
export function buildVectorPdfOps(
  plan: FloorPlan,
  currentFloor: number,
  opts?: VectorPdfExportOptions
): VectorPdfOp[] {
  const scale = opts?.scale ?? defaultScale(plan);
  const showVastuGrid = opts?.showVastuGrid ?? true;
  const showCompass = opts?.showCompass ?? true;
  const watermark = opts?.watermark ?? true;
  const watermarkText = opts?.watermarkText ?? DEFAULT_WATERMARK_TEXT;

  const ops: VectorPdfOp[] = [];

  const plotW = ftToIn(plan.plotWidth, scale);
  const plotH = ftToIn(plan.plotHeight, scale);

  // 1. Plot boundary (white background)
  ops.push({
    type: 'rect',
    x: 0,
    y: 0,
    w: plotW,
    h: plotH,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 0.01,
  });

  // 2. 1-ft grid lines
  for (let fx = 0; fx <= plan.plotWidth; fx += 1) {
    const ix = ftToIn(fx, scale);
    ops.push({
      type: 'line',
      x1: ix,
      y1: 0,
      x2: ix,
      y2: plotH,
      stroke: GRID_COLOR,
      strokeWidth: 0.002,
    });
  }
  for (let fy = 0; fy <= plan.plotHeight; fy += 1) {
    const iy = ftToIn(fy, scale);
    ops.push({
      type: 'line',
      x1: 0,
      y1: iy,
      x2: plotW,
      y2: iy,
      stroke: GRID_COLOR,
      strokeWidth: 0.002,
    });
  }

  // 3. Setback lines (dashed)
  const sl = ftToIn(plan.setbacks.left, scale);
  const sr = ftToIn(plan.plotWidth - plan.setbacks.right, scale);
  const st = ftToIn(plan.setbacks.top, scale);
  const sb = ftToIn(plan.plotHeight - plan.setbacks.bottom, scale);

  const setbackDash = [0.1, 0.1];
  ops.push({
    type: 'line',
    x1: sl,
    y1: st,
    x2: sr,
    y2: st,
    stroke: '#94a3b8',
    strokeWidth: 0.005,
    dashPattern: setbackDash,
  });
  ops.push({
    type: 'line',
    x1: sl,
    y1: sb,
    x2: sr,
    y2: sb,
    stroke: '#94a3b8',
    strokeWidth: 0.005,
    dashPattern: setbackDash,
  });
  ops.push({
    type: 'line',
    x1: sl,
    y1: st,
    x2: sl,
    y2: sb,
    stroke: '#94a3b8',
    strokeWidth: 0.005,
    dashPattern: setbackDash,
  });
  ops.push({
    type: 'line',
    x1: sr,
    y1: st,
    x2: sr,
    y2: sb,
    stroke: '#94a3b8',
    strokeWidth: 0.005,
    dashPattern: setbackDash,
  });

  // 4. Rooms (current floor only)
  const floorRooms = plan.rooms.filter((r) => r.floor === currentFloor);
  for (const room of floorRooms) {
    const rx = ftToIn(room.x, scale);
    const ry = ftToIn(room.y, scale);
    const rw = ftToIn(room.w, scale);
    const rh = ftToIn(room.h, scale);
    const sw = wallStrokeWidth(room.wallThickness, scale);

    ops.push({
      type: 'rect',
      x: rx,
      y: ry,
      w: rw,
      h: rh,
      fill: ROOM_FILL,
      stroke: ROOM_STROKE,
      strokeWidth: sw,
      rx: 0.02,
    });

    // Room label
    ops.push({
      type: 'text',
      text: room.type,
      x: rx + rw / 2,
      y: ry + rh / 2,
      fontSize: Math.max(0.08, scale * 0.6),
      font: 'helvetica',
      fontStyle: 'normal',
      align: 'center',
      color: '#1f2937',
    });

    // Room elements (furniture)
    if (room.elements && room.elements.length > 0) {
      for (const el of room.elements) {
        const ex = ftToIn(room.x + el.x, scale);
        const ey = ftToIn(room.y + el.y, scale);
        const ew = ftToIn(el.w, scale);
        const eh = ftToIn(el.h, scale);

        ops.push({
          type: 'rect',
          x: ex,
          y: ey,
          w: ew,
          h: eh,
          fill: ELEMENT_FILL,
          stroke: ELEMENT_STROKE,
          strokeWidth: 0.003,
        });

        // Element label (smaller text)
        ops.push({
          type: 'text',
          text: el.type,
          x: ex + ew / 2,
          y: ey + eh / 2,
          fontSize: Math.max(0.06, scale * 0.4),
          font: 'helvetica',
          fontStyle: 'normal',
          align: 'center',
          color: '#475569',
        });
      }
    }
  }

  // 5. Vastu 3x3 grid (optional)
  if (showVastuGrid) {
    const buildableLeft = ftToIn(plan.setbacks.left, scale);
    const buildableTop = ftToIn(plan.setbacks.top, scale);
    const buildableW = ftToIn(
      plan.plotWidth - plan.setbacks.left - plan.setbacks.right,
      scale
    );
    const buildableH = ftToIn(
      plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom,
      scale
    );
    const cellW = buildableW / 3;
    const cellH = buildableH / 3;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        ops.push({
          type: 'rect',
          x: buildableLeft + col * cellW,
          y: buildableTop + row * cellH,
          w: cellW,
          h: cellH,
          fill: undefined,
          stroke: VASTU_GRID_COLOR,
          strokeWidth: 0.003,
          dashPattern: [0.08, 0.08],
        });
      }
    }
  }

  // 6. North compass (optional)
  if (showCompass) {
    const cx = ftToIn(plan.setbacks.left + 1.5, scale);
    const cy = ftToIn(plan.setbacks.top + 1.5, scale);
    const cr = ftToIn(1, scale);

    ops.push({
      type: 'circle',
      cx,
      cy,
      r: cr,
      fill: undefined,
      stroke: COMPASS_COLOR,
      strokeWidth: 0.005,
    });

    // North arrow line
    const angleRad = (plan.northAngle * Math.PI) / 180;
    const arrowLen = ftToIn(1.2, scale);
    ops.push({
      type: 'line',
      x1: cx,
      y1: cy,
      x2: cx + Math.sin(angleRad) * arrowLen,
      y2: cy - Math.cos(angleRad) * arrowLen,
      stroke: COMPASS_COLOR,
      strokeWidth: 0.008,
    });

    // "N" label
    const labelDist = ftToIn(1.4, scale);
    ops.push({
      type: 'text',
      text: 'N',
      x: cx + Math.sin(angleRad) * labelDist,
      y: cy - Math.cos(angleRad) * labelDist,
      fontSize: Math.max(0.1, scale * 0.8),
      font: 'helvetica',
      fontStyle: 'bold',
      align: 'center',
      color: COMPASS_COLOR,
    });
  }

  // 7. Watermark (conditional)
  if (watermark) {
    ops.push({
      type: 'watermark',
      text: watermarkText,
      x: 0,
      y: 0,
      w: plotW,
      h: plotH,
      angle: 30,
      color: WATERMARK_COLOR,
      fontSize: Math.max(0.3, scale * 2.5),
    });
  }

  return ops;
}

// ---------------------------------------------------------------------------
// renderOpsToPdf
// ---------------------------------------------------------------------------

/**
 * Replay a list of VectorPdfOp commands onto a jsPDF instance.
 * Thin imperative shell — the logic lives in buildVectorPdfOps.
 */
export function renderOpsToPdf(ops: VectorPdfOp[], pdf: import('jspdf').jsPDF): void {
  for (const op of ops) {
    switch (op.type) {
      case 'rect': {
        if (op.fill) {
          pdf.setFillColor(op.fill);
          pdf.rect(op.x, op.y, op.w, op.h, 'F');
        }
        if (op.stroke) {
          pdf.setDrawColor(op.stroke);
          pdf.setLineWidth(op.strokeWidth ?? 0.005);
          if (op.dashPattern) {
            // jsPDF 4.x supports dashed lines via setLineDashPattern
            pdf.setLineDashPattern(op.dashPattern, 0);
          }
          pdf.rect(op.x, op.y, op.w, op.h, 'S');
          if (op.dashPattern) {
            pdf.setLineDashPattern([], 0); // reset
          }
        }
        break;
      }
      case 'line': {
        pdf.setDrawColor(op.stroke);
        pdf.setLineWidth(op.strokeWidth);
        if (op.dashPattern) {
          pdf.setLineDashPattern(op.dashPattern, 0);
        }
        pdf.line(op.x1, op.y1, op.x2, op.y2);
        if (op.dashPattern) {
          pdf.setLineDashPattern([], 0);
        }
        break;
      }
      case 'text': {
        pdf.setTextColor(op.color ?? '#000000');
        pdf.setFontSize(op.fontSize);
        const font = op.font ?? 'helvetica';
        const style = op.fontStyle ?? 'normal';
        pdf.setFont(font, style);
        pdf.text(op.text, op.x, op.y, {
          align: op.align ?? 'left',
          angle: op.angle,
        });
        break;
      }
      case 'circle': {
        if (op.fill) {
          pdf.setFillColor(op.fill);
          pdf.circle(op.cx, op.cy, op.r, 'F');
        }
        if (op.stroke) {
          pdf.setDrawColor(op.stroke);
          pdf.setLineWidth(op.strokeWidth ?? 0.005);
          pdf.circle(op.cx, op.cy, op.r, 'S');
        }
        break;
      }
      case 'watermark': {
        // Draw diagonal watermark text across the drawing area.
        pdf.setTextColor(op.color);
        pdf.setFontSize(op.fontSize);
        pdf.setFont('helvetica', 'normal');

        // Use jsPDF's GState to set opacity for a subtle watermark.
        const gs = pdf.GState({ opacity: 0.15 });
        pdf.setGState(gs);

        // Center the watermark text diagonally.
        const cx = op.x + op.w / 2;
        const cy = op.y + op.h / 2;
        pdf.text(op.text, cx, cy, {
          align: 'center',
          angle: op.angle,
        });

        // Reset opacity.
        pdf.setGState(pdf.GState({ opacity: 1 }));
        break;
      }
    }
  }
}
