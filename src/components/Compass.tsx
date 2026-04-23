import React from "react";

interface CompassProps {
  northAngle: number;
}

export const Compass: React.FC<CompassProps> = React.memo(({ northAngle }) => {
  return (
    <div
      className="absolute top-4 left-4 w-16 h-16 pointer-events-none z-20"
      style={{ transform: `rotate(${northAngle}deg)` }}
    >
      {/* Compass background */}
      <div className="w-full h-full rounded-full bg-white/90 border-2 border-slate-300 shadow-sm flex items-center justify-center relative">
        {/* North Arrow */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[14px] border-l-transparent border-r-transparent border-b-red-600" />
        </div>

        {/* Center dot */}
        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />

        {/* South indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[10px] border-l-transparent border-r-transparent border-t-slate-300" />
        </div>

        {/* Directional Labels — counter-rotated to stay upright */}
        <div
          className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-600 leading-none"
          style={{ transform: `rotate(${-northAngle}deg)` }}
        >
          N
        </div>
        <div
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 leading-none"
          style={{ transform: `rotate(${-northAngle}deg)` }}
        >
          S
        </div>
        <div
          className="absolute top-1/2 right-0.5 -translate-y-1/2 text-[9px] font-bold text-slate-500 leading-none"
          style={{ transform: `rotate(${-northAngle}deg)` }}
        >
          E
        </div>
        <div
          className="absolute top-1/2 left-0.5 -translate-y-1/2 text-[9px] font-bold text-slate-500 leading-none"
          style={{ transform: `rotate(${-northAngle}deg)` }}
        >
          W
        </div>
      </div>
    </div>
  );
});
Compass.displayName = "Compass";
