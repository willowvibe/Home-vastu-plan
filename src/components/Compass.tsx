import React from "react";

interface CompassProps {
  northAngle: number;
}

export const Compass: React.FC<CompassProps> = React.memo(({ northAngle }) => {
  return (
    <div
      className="absolute top-4 left-4 flex flex-col items-center opacity-70 pointer-events-none transition-transform duration-300"
      style={{ transform: `rotate(${northAngle}deg)` }}
    >
      <span className="text-xs font-bold text-red-600 mb-1">N</span>
      <div className="w-0.5 h-8 bg-slate-400 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 border-l-2 border-t-2 border-red-600 rotate-45"></div>
      </div>
    </div>
  );
});
Compass.displayName = "Compass";
