import React, { useMemo, useState } from 'react';
import { FloorPlan } from '../types';
import { getVastuZone, getVastuZoneInfo } from '../constants/vastuZones';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface VastuTourProps {
  plan: FloorPlan;
  pixelsPerFoot: number;
  onClose: () => void;
}

export const VastuTour: React.FC<VastuTourProps> = ({ plan, pixelsPerFoot, onClose }) => {
  const [step, setStep] = useState(0);

  const buildableW = Math.max(0, plan.plotWidth - plan.setbacks.left - plan.setbacks.right);
  const buildableH = Math.max(0, plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom);

  const cells = useMemo(() => {
    return Array.from({ length: 9 }, (_, i) => {
      const zone = getVastuZone(i, plan.northAngle);
      const info = getVastuZoneInfo(zone);
      const col = i % 3;
      const row = Math.floor(i / 3);
      return {
        ...info,
        left: (plan.setbacks.left + (col * buildableW) / 3) * pixelsPerFoot,
        top: (plan.setbacks.top + (row * buildableH) / 3) * pixelsPerFoot,
        width: (buildableW / 3) * pixelsPerFoot,
        height: (buildableH / 3) * pixelsPerFoot,
      };
    });
  }, [plan, pixelsPerFoot, buildableW, buildableH]);

  const active = cells[step];

  return (
    <>
      {/* Canvas-relative highlight: scrolls with the plan. */}
      {active && (
        <div
          className="absolute border-2 border-success bg-success/20 rounded transition-all duration-300 z-40 pointer-events-none"
          style={{
            left: active.left,
            top: active.top,
            width: active.width,
            height: active.height,
          }}
          data-testid="vastu-tour-highlight"
        />
      )}

      {/* Viewport-centered info card: stays on-screen even when the canvas
          is much larger than the viewport (especially on mobile). */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-none"
        data-testid="vastu-tour-overlay"
        aria-modal="true"
        role="dialog"
      >
        <div className="bg-surface-100 dark:bg-surface border border-border rounded-xl shadow-xl p-6 max-w-md w-full pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-fg">{active?.name ?? ''}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-surface text-muted"
              aria-label="Close tour"
              data-testid="vastu-tour-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {active && (
            <div className="space-y-2 text-sm text-fg-2">
              <p>
                <span className="font-medium">Element:</span> {active.element}
              </p>
              <p>
                <span className="font-medium">Ideal for:</span> {active.idealFor}
              </p>
              <p className="italic text-muted">{active.tip}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-50 text-sm"
              data-testid="vastu-tour-prev"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs text-meta">
              {step + 1} / {cells.length}
            </span>
            {step < cells.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success hover:bg-success/90 text-accent-on text-sm"
                data-testid="vastu-tour-next"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-success hover:bg-success/90 text-accent-on text-sm"
                data-testid="vastu-tour-finish"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
