import React from "react";

interface RulerOverlayProps {
  measuring: boolean;
  measureStart: { x: number; y: number } | null;
  measureEnd: { x: number; y: number } | null;
}

export const RulerOverlay: React.FC<RulerOverlayProps> = React.memo(
  ({ measuring, measureStart, measureEnd }) => {
    const distance =
      measureStart && measureEnd
        ? Math.round(
            Math.sqrt(
              (measureEnd.x - measureStart.x) ** 2 +
                (measureEnd.y - measureStart.y) ** 2,
            ),
          )
        : null;

    return (
      <>
        {measuring && (
          <div className="absolute top-4 right-4 bg-slate-900/80 text-white text-[10px] px-3 py-2 rounded-lg z-20 pointer-events-none">
            Click two points to measure distance
          </div>
        )}
        {distance !== null && (
          <div className="absolute top-12 right-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-2 shadow-sm max-w-[150px] z-30">
            <div className="text-[9px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Measurement
            </div>
            <div className="text-[10px] text-slate-800">
              Distance: {distance}' ft
            </div>
          </div>
        )}
      </>
    );
  },
);
RulerOverlay.displayName = "RulerOverlay";
