import React from 'react';

interface VastuGridProps {
  plotWidth: number;
  plotHeight: number;
  setbacks: { top: number; right: number; bottom: number; left: number };
  northAngle: number;
  pixelsPerFoot: number;
}

const getVastuZone = (index: number, northAngle: number): string => {
  if (index === 4) return 'Brahmasthan';

  const col = index % 3;
  const row = Math.floor(index / 3);
  const dx = col - 1;
  const dy = row - 1;

  const cellAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  let compassAngle = (cellAngle + 90 - northAngle) % 360;
  if (compassAngle < 0) compassAngle += 360;

  const snapped = (Math.round(compassAngle / 45) * 45) % 360;

  const zones: Record<number, string> = {
    0: 'North',
    45: 'North-East',
    90: 'East',
    135: 'South-East',
    180: 'South',
    225: 'South-West',
    270: 'West',
    315: 'North-West',
  };

  return zones[snapped] || '';
};

export const VastuGrid: React.FC<VastuGridProps> = React.memo(
  ({ plotWidth, plotHeight, setbacks, northAngle, pixelsPerFoot }) => {
    const buildableW = Math.max(0, plotWidth - setbacks.left - setbacks.right);
    const buildableH = Math.max(0, plotHeight - setbacks.top - setbacks.bottom);

    return (
      <div
        className="absolute border-2 border-dashed border-emerald-500/30 bg-emerald-50/10 pointer-events-none"
        style={{
          left: setbacks.left * pixelsPerFoot,
          top: setbacks.top * pixelsPerFoot,
          width: buildableW * pixelsPerFoot,
          height: buildableH * pixelsPerFoot,
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-t font-mono">
          {buildableW}'
        </div>
        <div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-l font-mono -rotate-90 origin-right">
          {buildableH}'
        </div>

        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-30">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="border border-indigo-500/20 flex flex-col items-center justify-center bg-indigo-50/10 backdrop-blur-[1px]"
            >
              <span className="text-[10px] font-bold text-indigo-800/60 uppercase tracking-wider text-center px-1">
                {getVastuZone(i, northAngle)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
VastuGrid.displayName = 'VastuGrid';
