import React from 'react';
import { getVastuZone, getVastuZoneInfo } from '../constants/vastuZones';

interface VastuGridProps {
  plotWidth: number;
  plotHeight: number;
  setbacks: { top: number; right: number; bottom: number; left: number };
  northAngle: number;
  pixelsPerFoot: number;
}

export const VastuGrid: React.FC<VastuGridProps> = React.memo(
  ({ plotWidth, plotHeight, setbacks, northAngle, pixelsPerFoot }) => {
    const buildableW = Math.max(0, plotWidth - setbacks.left - setbacks.right);
    const buildableH = Math.max(0, plotHeight - setbacks.top - setbacks.bottom);

    return (
      <div
        className="absolute border-2 border-dashed border-success/30 bg-success/10 pointer-events-none"
        style={{
          left: setbacks.left * pixelsPerFoot,
          top: setbacks.top * pixelsPerFoot,
          width: buildableW * pixelsPerFoot,
          height: buildableH * pixelsPerFoot,
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-success text-accent-on text-[10px] px-1.5 py-0.5 rounded-t font-mono">
          {buildableW}'
        </div>
        <div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 bg-success text-accent-on text-[10px] px-1.5 py-0.5 rounded-l font-mono -rotate-90 origin-right">
          {buildableH}'
        </div>

        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
          {Array.from({ length: 9 }).map((_, i) => {
            const zone = getVastuZone(i, northAngle);
            const info = getVastuZoneInfo(zone);
            return (
              <div
                key={i}
                data-testid={`vastu-zone-${zone.toLowerCase().replace(/\s+/g, '-')}`}
                title={`${info.name}\nElement: ${info.element}\nIdeal for: ${info.idealFor}\nTip: ${info.tip}`}
                className="border border-accent/20 flex flex-col items-center justify-center bg-accent/10 backdrop-blur-[1px]"
              >
                <span className="text-[10px] font-bold text-accent/60 uppercase tracking-wider text-center px-1">
                  {zone}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
VastuGrid.displayName = 'VastuGrid';
