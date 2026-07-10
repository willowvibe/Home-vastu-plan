import React, { type RefObject } from 'react';
import { Canvas } from '../Canvas';
import { FloorPlan, AppMode, Room } from '../../types';
import { formatFloorLabel } from '../../constants/floorPlanConstants';
import { DEFAULT_GRID_SIZE_FT } from '../../constants/geometry';

export interface CanvasAreaProps {
  canvasContainerRef: RefObject<HTMLDivElement | null>;
  plan: FloorPlan;
  currentFloor: number;
  zoom: number;
  showVastuGrid: boolean;
  showVastuTour?: boolean;
  onToggleVastuTour?: () => void;
  showPlumbing?: boolean;
  showSunPath?: boolean;
  sunDate?: Date;
  sunTime?: number;
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
  showVastuTour,
  onToggleVastuTour,
  showPlumbing,
  showSunPath,
  sunDate,
  sunTime,
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
  const gridSize = plan.gridSize ?? DEFAULT_GRID_SIZE_FT;

  return (
    <>
      <div
        ref={canvasContainerRef}
        data-testid="canvas-container"
        className={`p-4 rounded-xl shadow-sm border inline-block bg-surface border-border   ${
          isViewOnly ? 'pointer-events-none' : ''
        }`}
      >
        <Canvas
          plan={plan}
          currentFloor={currentFloor}
          zoom={zoom}
          showVastuGrid={showVastuGrid}
          showVastuTour={showVastuTour}
          onToggleVastuTour={onToggleVastuTour}
          showPlumbing={showPlumbing}
          showSunPath={showSunPath}
          sunDate={sunDate}
          sunTime={sunTime}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
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
        <div className="p-8 bg-surface">
          <h1 className="text-2xl font-bold mb-4">VastuPlan Floor Plan</h1>
          <p className="text-sm text-muted mb-4">
            {formatFloorLabel(currentFloor, plan.floorNames)} - {new Date().toLocaleDateString()}
          </p>
          <div className="print-only">
            <Canvas
              plan={plan}
              currentFloor={currentFloor}
              zoom={zoom}
              showVastuGrid={showVastuGrid}
              snapToGrid={snapToGrid}
              gridSize={gridSize}
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
