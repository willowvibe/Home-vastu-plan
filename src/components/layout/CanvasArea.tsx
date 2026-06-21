import React, { type RefObject } from 'react';
import { Canvas } from '../Canvas';
import { FloorPlan, AppMode, Room } from '../../types';
import { formatFloor } from '../../constants/floorPlanConstants';

export interface CanvasAreaProps {
  canvasContainerRef: RefObject<HTMLDivElement | null>;
  plan: FloorPlan;
  currentFloor: number;
  zoom: number;
  showVastuGrid: boolean;
  snapToGrid: boolean;
  measuring: boolean;
  setMeasuring: (value: boolean) => void;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
  onUpdateRoomEnd: () => void;
  onSelectRoom: (id: string | null, shiftKey: boolean) => void;
  onSelectMany: (ids: string[], shiftKey: boolean) => void;
  selectedRoomIds: string[];
  layers?: FloorPlan['layers'];
  appMode: AppMode;
  selectedCommentId?: string | null;
  onSelectComment?: (id: string | null) => void;
  onAddComment?: (x: number, y: number) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  canvasContainerRef,
  plan,
  currentFloor,
  zoom,
  showVastuGrid,
  snapToGrid,
  measuring,
  setMeasuring,
  onUpdateRoom,
  onUpdateRoomEnd,
  onSelectRoom,
  onSelectMany,
  selectedRoomIds,
  layers,
  appMode,
  selectedCommentId,
  onSelectComment,
  onAddComment,
}) => {
  const isViewOnly = appMode === 'view';

  return (
    <>
      <div
        ref={canvasContainerRef}
        data-testid="canvas-container"
        className={`p-4 rounded-xl shadow-sm border inline-block bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 ${
          isViewOnly ? 'pointer-events-none' : ''
        }`}
      >
        <Canvas
          plan={plan}
          currentFloor={currentFloor}
          zoom={zoom}
          showVastuGrid={showVastuGrid}
          snapToGrid={snapToGrid}
          measuring={measuring}
          setMeasuring={setMeasuring}
          onUpdateRoom={onUpdateRoom}
          onUpdateRoomEnd={onUpdateRoomEnd}
          onSelectRoom={onSelectRoom}
          onSelectMany={onSelectMany}
          selectedRoomIds={selectedRoomIds}
          layers={layers}
          appMode={appMode}
          selectedCommentId={selectedCommentId}
          onSelectComment={onSelectComment}
          onAddComment={onAddComment}
        />
      </div>

      {/* Print Area (hidden on screen, visible when printing) */}
      <div className="hidden print-area print:block">
        <div className="p-8 bg-white">
          <h1 className="text-2xl font-bold mb-4">VastuPlan Floor Plan</h1>
          <p className="text-sm text-slate-600 mb-4">
            Floor {formatFloor(currentFloor)} - {new Date().toLocaleDateString()}
          </p>
          <div className="print-only">
            <Canvas
              plan={plan}
              currentFloor={currentFloor}
              zoom={zoom}
              showVastuGrid={showVastuGrid}
              snapToGrid={snapToGrid}
              measuring={measuring}
              setMeasuring={setMeasuring}
              onUpdateRoom={() => {}}
              onUpdateRoomEnd={() => {}}
              onSelectRoom={() => {}}
              onSelectMany={() => {}}
              selectedRoomIds={[]}
              layers={layers}
              appMode={appMode}
            />
          </div>
        </div>
      </div>
    </>
  );
};
