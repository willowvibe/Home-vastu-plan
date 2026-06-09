import React from 'react';

interface RulerOverlayProps {
  measuring: boolean;
  measureStart: { x: number; y: number } | null;
  measureEnd: { x: number; y: number } | null;
  unit?: 'ft' | 'm';
}

// Convert raw ft distance to the user's display unit and round to half-foot
// (or half-meter) precision so sub-grid precision isn't discarded when
// snap-to-grid is off. Mirrors the half-foot convention used elsewhere in
// the canvas drag math (see useCanvasDrag.ts:119).
const formatDistance = (rawFt: number, unit: 'ft' | 'm'): { value: number; unit: string } => {
  if (unit === 'm') {
    const meters = rawFt * 0.3048;
    return { value: Math.round(meters * 2) / 2, unit: 'm' };
  }
  return { value: Math.round(rawFt * 2) / 2, unit: 'ft' };
};

export const RulerOverlay: React.FC<RulerOverlayProps> = React.memo(
  ({ measuring, measureStart, measureEnd, unit = 'ft' }) => {
    const formatted =
      measureStart && measureEnd
        ? formatDistance(
            Math.sqrt((measureEnd.x - measureStart.x) ** 2 + (measureEnd.y - measureStart.y) ** 2),
            unit
          )
        : null;

    return (
      <>
        {measuring && (
          <div className="absolute top-4 right-4 bg-slate-900/80 text-white text-[10px] px-3 py-2 rounded-lg z-20 pointer-events-none">
            Click two points to measure distance
          </div>
        )}
        {formatted && (
          <div className="absolute top-12 right-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-2 shadow-sm max-w-[150px] z-30">
            <div className="text-[9px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Measurement
            </div>
            <div className="text-[10px] text-slate-800">
              Distance: {formatted.value} {formatted.unit}
            </div>
          </div>
        )}
      </>
    );
  }
);
RulerOverlay.displayName = 'RulerOverlay';
