import React, { useState, useRef, useEffect } from 'react';
import { Room as RoomType, FloorPlan, RoomLayer, AppMode } from '../types';
import { useCanvasDrag } from '../hooks/useCanvasDrag';
import { Room } from './Room';
import { VastuGrid } from './VastuGrid';
import { Compass } from './Compass';
import { RulerOverlay } from './RulerOverlay';
import { RoadIndicator } from './RoadIndicator';

interface CanvasProps {
  plan: FloorPlan;
  currentFloor: number;
  zoom: number;
  showVastuGrid?: boolean;
  snapToGrid?: boolean;
  measuring?: boolean;
  setMeasuring?: (value: boolean) => void;
  onUpdateRoom: (id: string, updates: Partial<RoomType>) => void;
  onUpdateRoomEnd?: () => void;
  onSelectRoom: (roomId: string | null, isShiftKey?: boolean) => void;
  selectedRoomIds: string[];
  layers?: RoomLayer[];
  appMode?: AppMode;
}

export const Canvas: React.FC<CanvasProps> = ({
  plan,
  currentFloor,
  zoom,
  showVastuGrid,
  snapToGrid = true,
  measuring = false,
  setMeasuring,
  onUpdateRoom,
  onUpdateRoomEnd,
  onSelectRoom,
  selectedRoomIds,
  layers,
  appMode = 'edit',
}) => {
  const PIXELS_PER_FOOT = 20 * zoom;
  const canvasRef = useRef<HTMLDivElement>(null);

  const [measureStart, setMeasureStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);

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

  return (
    <div
      className="relative bg-white border-2 border-slate-300 shadow-inner overflow-visible mx-auto mt-8 ml-8"
      style={{
        width: plan.plotWidth * PIXELS_PER_FOOT,
        height: plan.plotHeight * PIXELS_PER_FOOT,
        backgroundImage:
          'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
        backgroundSize: `${PIXELS_PER_FOOT}px ${PIXELS_PER_FOOT}px`,
      }}
      ref={canvasRef}
      onPointerDown={(e) => {
        if (!e.shiftKey) onSelectRoom(null);
        if (measuring && setMeasuring) {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const x = (e.clientX - rect.left) / PIXELS_PER_FOOT;
            const y = (e.clientY - rect.top) / PIXELS_PER_FOOT;
            if (!measureStart) {
              setMeasureStart({ x, y });
            } else {
              setMeasureEnd({ x, y });
              setMeasuring(false);
            }
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
        />
      ))}

      <Compass northAngle={plan.northAngle} />

      {snapToGrid && (
        <div className="absolute top-4 right-4 bg-slate-900/70 text-white text-[9px] px-2 py-1 rounded z-20 pointer-events-none">
          GRID SNAP ON
        </div>
      )}

      <RoadIndicator roadDirection={plan.roadDirection} />
    </div>
  );
};
