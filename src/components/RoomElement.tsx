import React from 'react';
import { RoomElement as RoomElementType } from '../types';
import { cn } from '../utils';

const ELEMENT_COLORS: Record<string, string> = {
  Bed: 'bg-[oklab(0.88_-0.02_0.08)] dark:bg-[oklab(0.30_-0.01_0.04)] border-[oklab(0.72_-0.03_0.12)] dark:border-[oklab(0.50_-0.02_0.08)] text-[oklab(0.40_-0.03_0.12)] dark:text-[oklab(0.85_-0.02_0.10)]',
  Cupboard:
    'bg-[oklab(0.88_0.04_0.10)] dark:bg-[oklab(0.32_0.03_0.06)] border-[oklab(0.72_0.06_0.14)] dark:border-[oklab(0.52_0.05_0.10)] text-[oklab(0.40_0.05_0.12)] dark:text-[oklab(0.88_0.04_0.10)]',
  'Side Table':
    'bg-[oklab(0.89_0.03_0.09)] dark:bg-[oklab(0.34_0.02_0.05)] border-[oklab(0.73_0.05_0.13)] dark:border-[oklab(0.54_0.04_0.09)] text-[oklab(0.42_0.04_0.11)] dark:text-[oklab(0.88_0.03_0.09)]',
  Stove:
    'bg-[oklab(0.88_-0.05_0.06)] dark:bg-[oklab(0.32_-0.04_0.04)] border-[oklab(0.72_-0.07_0.08)] dark:border-[oklab(0.52_-0.06_0.06)] text-[oklab(0.42_-0.06_0.07)] dark:text-[oklab(0.90_-0.05_0.07)]',
  Sink: 'bg-[oklab(0.88_-0.05_-0.03)] dark:bg-[oklab(0.32_-0.04_-0.02)] border-[oklab(0.72_-0.07_-0.04)] dark:border-[oklab(0.52_-0.06_-0.03)] text-[oklab(0.40_-0.07_-0.05)] dark:text-[oklab(0.88_-0.05_-0.04)]',
  Fridge: 'bg-surface-100 border-border-strong text-fg-2',
  Sofa: 'bg-[oklab(0.88_0.05_0.02)] dark:bg-[oklab(0.32_0.04_0.01)] border-[oklab(0.72_0.08_0.03)] dark:border-[oklab(0.52_0.06_0.02)] text-[oklab(0.40_0.07_0.03)] dark:text-[oklab(0.88_0.05_0.02)]',
  'TV Unit': 'bg-surface-warm border-border-strong text-fg-2',
  'Coffee Table': 'bg-surface-100 border-border-strong text-fg-2',
  Toilet:
    'bg-[oklab(0.88_-0.04_-0.04)] dark:bg-[oklab(0.32_-0.03_-0.03)] border-[oklab(0.72_-0.06_-0.06)] dark:border-[oklab(0.52_-0.05_-0.05)] text-[oklab(0.40_-0.06_-0.06)] dark:text-[oklab(0.88_-0.04_-0.04)]',
  'Wash Basin':
    'bg-[oklab(0.88_-0.04_-0.06)] dark:bg-[oklab(0.32_-0.03_-0.05)] border-[oklab(0.72_-0.06_-0.09)] dark:border-[oklab(0.52_-0.05_-0.07)] text-[oklab(0.40_-0.06_-0.09)] dark:text-[oklab(0.88_-0.04_-0.08)]',
  Shower:
    'bg-[oklab(0.88_-0.05_-0.02)] dark:bg-[oklab(0.32_-0.04_-0.01)] border-[oklab(0.72_-0.07_-0.03)] dark:border-[oklab(0.52_-0.06_-0.02)] text-[oklab(0.40_-0.07_-0.04)] dark:text-[oklab(0.88_-0.05_-0.03)]',
  Mandir:
    'bg-[oklab(0.90_0.00_0.10)] dark:bg-[oklab(0.34_0.00_0.06)] border-[oklab(0.78_0.01_0.14)] dark:border-[oklab(0.54_0.00_0.10)] text-[oklab(0.45_0.01_0.12)] dark:text-[oklab(0.90_0.00_0.10)]',
  'Dining Table':
    'bg-[oklab(0.88_0.07_-0.03)] dark:bg-[oklab(0.32_0.05_-0.02)] border-[oklab(0.72_0.10_-0.04)] dark:border-[oklab(0.52_0.08_-0.03)] text-[oklab(0.40_0.09_-0.05)] dark:text-[oklab(0.88_0.07_-0.04)]',
  Chair:
    'bg-[oklab(0.88_0.06_-0.01)] dark:bg-[oklab(0.32_0.04_-0.01)] border-[oklab(0.72_0.09_-0.02)] dark:border-[oklab(0.52_0.07_-0.01)] text-[oklab(0.40_0.08_-0.02)] dark:text-[oklab(0.88_0.06_-0.02)]',
  Plants:
    'bg-[oklab(0.88_-0.05_0.05)] dark:bg-[oklab(0.32_-0.04_0.03)] border-[oklab(0.72_-0.08_0.08)] dark:border-[oklab(0.52_-0.07_0.06)] text-[oklab(0.40_-0.07_0.06)] dark:text-[oklab(0.88_-0.05_0.05)]',
  Desk: 'bg-[oklab(0.88_0.03_-0.06)] dark:bg-[oklab(0.32_0.02_-0.04)] border-[oklab(0.72_0.05_-0.10)] dark:border-[oklab(0.52_0.04_-0.08)] text-[oklab(0.40_0.05_-0.10)] dark:text-[oklab(0.88_0.03_-0.09)]',
  Bookshelf:
    'bg-[oklab(0.88_0.04_-0.07)] dark:bg-[oklab(0.32_0.03_-0.05)] border-[oklab(0.72_0.06_-0.11)] dark:border-[oklab(0.52_0.05_-0.09)] text-[oklab(0.40_0.06_-0.11)] dark:text-[oklab(0.88_0.04_-0.10)]',
  Shelf: 'bg-surface-warm border-border-strong text-fg-2',
  Car: 'bg-surface-warm border-border-strong text-fg',
  Bike: 'bg-surface-warm border-border text-fg-2',
  Staircase:
    'bg-[oklab(0.89_0.03_0.10)] dark:bg-[oklab(0.33_0.02_0.06)] border-[oklab(0.73_0.05_0.14)] dark:border-[oklab(0.53_0.04_0.10)] text-[oklab(0.42_0.04_0.12)] dark:text-[oklab(0.88_0.03_0.10)]',
  Door: 'bg-[oklab(0.45_0.03_0.10)] border-[oklab(0.35_0.02_0.08)] text-accent-on z-20 shadow-md',
  Window:
    'bg-[oklab(0.90_-0.03_-0.04)]/80 border-[oklab(0.68_-0.06_-0.07)] border-[1.5px] text-[oklab(0.38_-0.06_-0.08)] z-20 shadow-sm backdrop-blur-sm',
};

interface RoomElementProps {
  element: RoomElementType;
  pixelsPerFoot: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export const RoomElement: React.FC<RoomElementProps> = React.memo(
  ({ element, pixelsPerFoot, onPointerDown, onDoubleClick }) => {
    const colorClass = ELEMENT_COLORS[element.type] || 'bg-surface-100/80 border-border text-muted';
    const isStaircase = element.type === 'Staircase';
    const pxW = element.w * pixelsPerFoot;
    const pxH = element.h * pixelsPerFoot;

    return (
      <div
        className={cn(
          'absolute border flex items-center justify-center cursor-move shadow-sm text-[8px] font-medium overflow-hidden',
          colorClass
        )}
        style={{
          left: element.x * pixelsPerFoot,
          top: element.y * pixelsPerFoot,
          width: pxW,
          height: pxH,
          transform: `rotate(${element.rotation}deg)`,
          ...(isStaircase && {
            backgroundImage:
              'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(120, 53, 15, 0.15) 4px, rgba(120, 53, 15, 0.15) 8px)',
          }),
        }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        {isStaircase ? (
          <>
            <span className="z-10 px-0.5 bg-surface-warm/80 rounded">{element.type}</span>
            {/* Step hatch lines — drawn as simple horizontal rules so the cut-out
                reads as a staircase even at small sizes. */}
            <div className="absolute inset-0 flex flex-col justify-between py-0.5 pointer-events-none">
              {Array.from({ length: Math.max(3, Math.floor(pxH / 8)) }, (_, i) => (
                <div key={i} className="w-full h-px bg-border-strong/30" />
              ))}
            </div>
          </>
        ) : (
          element.type
        )}
      </div>
    );
  }
);
RoomElement.displayName = 'RoomElement';
