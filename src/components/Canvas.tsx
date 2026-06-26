import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Room as RoomType, FloorPlan, RoomLayer, AppMode } from '../types';
import { useCanvasDrag } from '../hooks/useCanvasDrag';
import { Room } from './Room';
import { VastuGrid } from './VastuGrid';
import { VastuTour } from './VastuTour';
import { PlumbingOverlay } from './PlumbingOverlay';
import { SunPathOverlay } from './SunPathOverlay';
import { Compass } from './Compass';
import { RulerOverlay } from './RulerOverlay';
import { RoadIndicator } from './RoadIndicator';
import { formatFloorLabel } from '../constants/floorPlanConstants';
import { MessageSquare } from 'lucide-react';
import { DEFAULT_GRID_SIZE_FT } from '../constants/geometry';

interface CanvasProps {
  plan: FloorPlan;
  currentFloor: number;
  zoom: number;
  showVastuGrid?: boolean;
  showVastuTour?: boolean;
  onToggleVastuTour?: () => void;
  showPlumbing?: boolean;
  showSunPath?: boolean;
  sunDate?: Date;
  sunTime?: number;
  snapToGrid?: boolean;
  gridSize?: number;
  measuring?: boolean;
  setMeasuring?: (value: boolean) => void;
  onUpdateRoom: (id: string, updates: Partial<RoomType>) => void;
  onUpdateRoomEnd?: () => void;
  onSelectRoom: (roomId: string | null, isShiftKey?: boolean) => void;
  onSelectMany?: (roomIds: string[], isShiftKey?: boolean) => void;
  selectedRoomIds: string[];
  layers?: RoomLayer[];
  appMode?: AppMode;
  selectedCommentId?: string | null;
  onSelectComment?: (id: string | null) => void;
  onAddComment?: (x: number, y: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  plan,
  currentFloor,
  zoom,
  showVastuGrid,
  showVastuTour,
  onToggleVastuTour,
  showPlumbing,
  showSunPath,
  sunDate,
  sunTime,
  snapToGrid = true,
  gridSize = DEFAULT_GRID_SIZE_FT,
  measuring = false,
  setMeasuring,
  onUpdateRoom,
  onUpdateRoomEnd,
  onSelectRoom,
  onSelectMany,
  selectedRoomIds,
  layers,
  appMode = 'edit',
  selectedCommentId,
  onSelectComment,
  onAddComment,
}) => {
  const PIXELS_PER_FOOT = 20 * zoom;
  const canvasRef = useRef<HTMLDivElement>(null);

  const [measureStart, setMeasureStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);

  // B-8: marquee drag-select state. Coordinates are in feet relative to
  // the canvas origin. The overlay renders the active selection box.
  const [marquee, setMarquee] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    shiftKey: boolean;
  } | null>(null);

  // Reset measurement state when measuring mode is toggled on
  useEffect(() => {
    if (measuring) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMeasureStart(null);

      setMeasureEnd(null);
    }
  }, [measuring]);

  const { handlePointerDown, handleElementPointerDown } = useCanvasDrag({
    plan,
    currentFloor,
    pixelsPerFoot: PIXELS_PER_FOOT,
    snapToGrid,
    gridSize,
    canvasRef,
    onUpdateRoom,
    onUpdateRoomEnd,
    appMode,
  });

  const floorRooms = plan.rooms.filter((r) => {
    if (r.floor !== currentFloor) return false;
    if (!layers || layers.length === 0) return true;
    const layer = layers.find((l) => l.name === r.category);
    if (!layer) return true;
    return layer.visible;
  });

  // B-8: marquee pointer lifecycle. Updates the live box on move and
  // commits the selection on up/cancel/loss-of-focus.
  const toCanvasFeet = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / PIXELS_PER_FOOT,
        y: (clientY - rect.top) / PIXELS_PER_FOOT,
      };
    },
    [PIXELS_PER_FOOT]
  );

  useEffect(() => {
    if (!marquee) return;

    const handlePointerMove = (e: PointerEvent) => {
      const pos = toCanvasFeet(e.clientX, e.clientY);
      if (!pos) return;
      setMarquee((prev) => (prev ? { ...prev, current: pos } : prev));
    };

    const finalize = (e: PointerEvent) => {
      setMarquee((prev) => {
        if (!prev) return prev;
        const x1 = Math.min(prev.start.x, prev.current.x);
        const y1 = Math.min(prev.start.y, prev.current.y);
        const x2 = Math.max(prev.start.x, prev.current.x);
        const y2 = Math.max(prev.start.y, prev.current.y);
        // Degenerate clicks produce an empty box; those were already handled
        // by onSelectRoom(null) in pointerdown for non-shift clicks.
        const ids = floorRooms
          .filter((r) => r.x < x2 && r.x + r.w > x1 && r.y < y2 && r.y + r.h > y1)
          .map((r) => r.id);
        if (ids.length > 0) {
          onSelectMany?.(ids, prev.shiftKey);
        }
        return null;
      });
      if (canvasRef.current) {
        try {
          canvasRef.current.releasePointerCapture(e.pointerId);
        } catch {
          // ignore release failures
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finalize);
    window.addEventListener('pointercancel', finalize);
    window.addEventListener('blur', finalize as EventListener);
    document.addEventListener('visibilitychange', finalize as EventListener);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finalize);
      window.removeEventListener('pointercancel', finalize);
      window.removeEventListener('blur', finalize as EventListener);
      document.removeEventListener('visibilitychange', finalize as EventListener);
    };
  }, [marquee, floorRooms, onSelectMany, toCanvasFeet]);

  return (
    <div
      className="relative bg-white border-2 border-slate-300 shadow-inner overflow-visible mx-auto mt-8 ml-8"
      style={{
        width: plan.plotWidth * PIXELS_PER_FOOT,
        height: plan.plotHeight * PIXELS_PER_FOOT,
        backgroundImage:
          'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
        backgroundSize: `${gridSize * PIXELS_PER_FOOT}px ${gridSize * PIXELS_PER_FOOT}px`,
      }}
      data-testid="canvas"
      ref={canvasRef}
      onPointerDown={(e) => {
        // B-5: only the edit surface may manipulate selection.
        if (appMode === 'view') return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left) / PIXELS_PER_FOOT;
        const y = (e.clientY - rect.top) / PIXELS_PER_FOOT;

        // G-11: comment mode lets reviewers drop pins on the canvas
        // background. Room clicks are disabled in comment mode via the
        // appMode guard in Room.tsx, so a background click always lands
        // here.
        if (appMode === 'comment') {
          onSelectRoom?.(null);
          onAddComment?.(x, y);
          return;
        }

        // B-8: start a marquee drag-select from the canvas background.
        // Room pointerdowns stop propagation, so this only fires on the
        // background. Measuring mode consumes the pointer instead.
        if (!measuring) {
          if (!e.shiftKey) onSelectRoom(null);
          if (canvasRef.current) {
            setMarquee({ start: { x, y }, current: { x, y }, shiftKey: e.shiftKey });
            try {
              canvasRef.current.setPointerCapture(e.pointerId);
            } catch {
              // setPointerCapture can fail for unsupported input; marquee
              // still works via the window pointerup listener.
            }
          }
        }

        if (measuring && setMeasuring) {
          if (!measureStart) {
            setMeasureStart({ x, y });
          } else {
            setMeasureEnd({ x, y });
            setMeasuring(false);
          }
        }
      }}
    >
      <RulerOverlay
        measuring={measuring}
        measureStart={measureStart}
        measureEnd={measureEnd}
        unit={plan.unit}
      />

      {/* Plot Dimensions */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 bg-slate-800 text-white text-xs px-2 py-1 rounded font-mono z-20 shadow-sm">
        {plan.plotWidth}'
      </div>
      <div className="absolute top-1/2 left-0 -translate-x-6 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded font-mono z-20 -rotate-90 shadow-sm">
        {plan.plotHeight}'
      </div>

      {/* Vastu Grid */}
      {showVastuGrid && (
        <VastuGrid
          plotWidth={plan.plotWidth}
          plotHeight={plan.plotHeight}
          setbacks={plan.setbacks}
          northAngle={plan.northAngle}
          pixelsPerFoot={PIXELS_PER_FOOT}
        />
      )}

      {/* G-10: guided Vastu zone tour overlay */}
      {showVastuTour && (
        <VastuTour
          plan={plan}
          pixelsPerFoot={PIXELS_PER_FOOT}
          onClose={() => onToggleVastuTour?.()}
        />
      )}

      {/* G-4: plumbing route overlay for kitchens and bathrooms */}
      {showPlumbing && (
        <PlumbingOverlay plan={plan} rooms={floorRooms} pixelsPerFoot={PIXELS_PER_FOOT} />
      )}

      {/* G-5: sun-path shadow overlay */}
      {showSunPath && sunDate && sunTime !== undefined && (
        <SunPathOverlay
          plan={plan}
          rooms={floorRooms}
          pixelsPerFoot={PIXELS_PER_FOOT}
          date={sunDate}
          minutesSinceMidnight={sunTime}
        />
      )}

      {/* U-12: empty-state hint shown when no rooms are on the
          current floor. Without this, switching to a fresh floor
          looks like the app is broken ("where did my rooms go?").
          The hint points the user at the Add Rooms panel and the
          lowest-used floor (usually the default 0th). */}
      {floorRooms.length === 0 && (
        <div
          data-testid="canvas-empty-state"
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No rooms on this floor yet. Add a room from the left panel, or switch back to{' '}
            {formatFloorLabel(
              plan.rooms.length > 0 ? Math.min(...plan.rooms.map((r) => r.floor)) : 0,
              plan.floorNames
            )}
            .
          </p>
        </div>
      )}

      {/* Rooms */}
      {floorRooms.map((room) => (
        <Room
          key={room.id}
          room={room}
          plan={plan}
          pixelsPerFoot={PIXELS_PER_FOOT}
          isSelected={selectedRoomIds.includes(room.id)}
          floorRooms={floorRooms}
          onPointerDown={handlePointerDown}
          onElementPointerDown={handleElementPointerDown}
          onUpdateRoom={onUpdateRoom}
          onUpdateRoomEnd={onUpdateRoomEnd}
          // U-3: a click on a room must select it. The room-body
          // pointerdown fires both this and the drag branch, guarded
          // by `e.target === e.currentTarget` so child clicks (label,
          // elements, resize handles) still bail. The shift path
          // toggles selection (B-8 multi-select P1 hook contract).
          onSelectRoom={onSelectRoom}
          appMode={appMode}
        />
      ))}

      {/* G-11: comment pins (visible in view and comment modes). */}
      {(appMode === 'comment' || appMode === 'view') &&
        (plan.comments || [])
          .filter((c) => (c.floor ?? 0) === currentFloor)
          .map((comment) => (
            <button
              key={comment.id}
              data-testid={`comment-pin-${comment.id}`}
              onClick={() => onSelectComment?.(comment.id)}
              className={`absolute flex items-center justify-center w-6 h-6 -ml-3 -mt-6 rounded-full shadow-sm border transition-colors z-20 ${
                selectedCommentId === comment.id
                  ? 'bg-amber-400 border-amber-600 text-amber-900 scale-110'
                  : 'bg-amber-100 border-amber-400 text-amber-700 hover:bg-amber-200'
              }`}
              style={{
                left: comment.x * PIXELS_PER_FOOT,
                top: comment.y * PIXELS_PER_FOOT,
              }}
              title={comment.text || 'Click to view comment'}
            >
              <MessageSquare className="w-3 h-3" />
            </button>
          ))}

      <Compass northAngle={plan.northAngle} />

      {appMode === 'comment' && (
        <div className="absolute top-4 left-4 bg-amber-100 border border-amber-300 text-amber-800 text-[10px] px-2 py-1 rounded z-20 pointer-events-none">
          Click anywhere on the canvas to add a comment.
        </div>
      )}

      {snapToGrid && (
        <div className="absolute top-4 right-4 bg-slate-900/70 text-white text-[9px] px-2 py-1 rounded z-20 pointer-events-none">
          GRID SNAP ON · {gridSize} ft
        </div>
      )}

      <RoadIndicator roadDirection={plan.roadDirection} />

      {/* B-8: live marquee selection box. pointer-events-none so it never
          steals pointer events from the canvas or rooms. */}
      {marquee && (
        <div
          data-testid="canvas-marquee"
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-30"
          style={{
            left: Math.min(marquee.start.x, marquee.current.x) * PIXELS_PER_FOOT,
            top: Math.min(marquee.start.y, marquee.current.y) * PIXELS_PER_FOOT,
            width: Math.abs(marquee.current.x - marquee.start.x) * PIXELS_PER_FOOT,
            height: Math.abs(marquee.current.y - marquee.start.y) * PIXELS_PER_FOOT,
          }}
        />
      )}
    </div>
  );
};
