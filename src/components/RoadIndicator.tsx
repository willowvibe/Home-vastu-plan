import React from 'react';
import { cn } from '../utils';

interface RoadIndicatorProps {
  roadDirection: 'N' | 'E' | 'S' | 'W';
}

export const RoadIndicator: React.FC<RoadIndicatorProps> = React.memo(({ roadDirection }) => {
  return (
    <div
      className={cn(
        'absolute bg-slate-800 text-white text-xs font-bold flex items-center justify-center pointer-events-none z-20',
        roadDirection === 'N'
          ? 'top-0 left-0 right-0 h-4'
          : roadDirection === 'S'
            ? 'bottom-0 left-0 right-0 h-4'
            : roadDirection === 'E'
              ? 'top-0 bottom-0 right-0 w-4'
              : 'top-0 bottom-0 left-0 w-4'
      )}
    >
      <span
        className={cn(
          roadDirection === 'E' || roadDirection === 'W' ? '-rotate-90 whitespace-nowrap' : ''
        )}
      >
        ROAD
      </span>
    </div>
  );
});
RoadIndicator.displayName = 'RoadIndicator';
