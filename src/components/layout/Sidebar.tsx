import React from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Map,
  FolderOpen,
  FileText,
  Link as LinkIcon,
  Unlink,
  Search,
  Eye,
  Droplets,
  Sun,
} from 'lucide-react';
import { FloorPlan, AppMode, RoomType } from '../../types';
import { LayerManager } from '../LayerManager';
import { ROOM_TYPES, ROOM_CATEGORIES, formatFloorLabel } from '../../constants/floorPlanConstants';
import { DEFAULT_GRID_SIZE_FT, GRID_SIZE_OPTIONS_FT, FT_PER_METER } from '../../constants/geometry';
import { DEFAULT_COST_PER_SQFT, formatCurrency, getTotalCost } from '../../utils';

export interface SidebarProps {
  plan: FloorPlan;
  currentFloor: number;
  setCurrentFloor: (floor: number) => void;
  updatePlan: (updater: FloorPlan | ((prev: FloorPlan) => FloorPlan)) => void;
  commitHistory: () => void;
  handleSetbackChange: (key: keyof FloorPlan['setbacks'], value: number) => void;
  linkSetbacks: boolean;
  setLinkSetbacks: (value: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (value: boolean) => void;
  showVastuGrid?: boolean;
  onToggleVastuGrid?: () => void;
  showPlumbing?: boolean;
  onTogglePlumbing?: () => void;
  showSunPath?: boolean;
  onToggleSunPath?: () => void;
  sunDate?: Date;
  onSetSunDate?: (value: string) => void;
  sunTime?: number;
  onSetSunTime?: (value: string) => void;
  onSetSunNow?: () => void;
  handleSelectTemplate: (name: string) => void;
  handleClearFloor: () => void;
  handleImportJSON: () => void;
  handleExportJSON: () => void;
  updateLayers: (layers: FloorPlan['layers']) => void;
  addRoom: (type: RoomType, w: number, h: number) => void;
  onDuplicateFloor?: (sourceFloor: number, targetFloor: number) => void;
  roomSearch: string;
  setRoomSearch: (value: string) => void;
  roomCategoryFilter: string | null;
  setRoomCategoryFilter: (value: string | null) => void;
  appMode: AppMode;
  mobileTab: 'settings' | 'canvas' | 'properties';
  totalArea: number;
  buildableArea: number;
  builtUpArea: number;
}

const CATEGORY_BUTTONS = [
  { id: 'Living', label: 'Living' },
  { id: 'Sleeping', label: 'Sleeping' },
  { id: 'Kitchen', label: 'Kitchen' },
  { id: 'Bathroom', label: 'Bath' },
  { id: 'Special', label: 'Special' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  plan,
  currentFloor,
  setCurrentFloor,
  updatePlan,
  commitHistory,
  handleSetbackChange,
  linkSetbacks,
  setLinkSetbacks,
  snapToGrid,
  setSnapToGrid,
  showVastuGrid,
  onToggleVastuGrid,
  showPlumbing,
  onTogglePlumbing,
  showSunPath,
  onToggleSunPath,
  sunDate,
  onSetSunDate,
  sunTime,
  onSetSunTime,
  onSetSunNow,
  handleSelectTemplate,
  handleClearFloor,
  handleImportJSON,
  handleExportJSON,
  updateLayers,
  addRoom,
  onDuplicateFloor,
  roomSearch,
  setRoomSearch,
  roomCategoryFilter,
  setRoomCategoryFilter,
  appMode,
  mobileTab,
  totalArea,
  buildableArea,
  builtUpArea,
}) => {
  const isLocked = appMode !== 'edit';

  const floorsUsed = Array.from(new Set([currentFloor, ...plan.rooms.map((r) => r.floor)])).sort(
    (a, b) => a - b
  );
  const maxFloor = 9;
  const lastFloor = floorsUsed[floorsUsed.length - 1];

  return (
    <div
      className={`w-full md:w-72 flex flex-col-reverse overflow-y-auto shrink-0 min-h-0 custom-scrollbar ${
        mobileTab === 'settings' ? 'flex' : 'hidden md:flex'
      } ${isLocked ? 'opacity-50 pointer-events-none' : ''} bg-surface border-r border-border`}
    >
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 text-fg">
          <Map className="w-4 h-4 text-meta" /> Plot Settings
        </h3>

        <div className="mb-4">
          <label className="text-xs text-muted mb-1 block">Plan Template</label>
          <select
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="min-h-11 w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
          >
            <option value="">Select Template...</option>
            <option value="Small Apartment">Small Apartment (25x35 ft)</option>
            <option value="Medium House">Medium House (35x45 ft)</option>
            <option value="Large Villa">Large Villa (45x60 ft)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs mb-1 block text-muted dark:text-meta">Width (ft)</label>
            <input
              type="number"
              min="5"
              max="500"
              value={plan.plotWidth}
              onChange={(e) => {
                const val = Math.max(5, Math.min(500, Number(e.target.value) || 10));
                updatePlan((p) => ({ ...p, plotWidth: val }));
                commitHistory();
              }}
              className="min-h-11 w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block text-muted dark:text-meta">Length (ft)</label>
            <input
              type="number"
              min="5"
              max="500"
              value={plan.plotHeight}
              onChange={(e) => {
                const val = Math.max(5, Math.min(500, Number(e.target.value) || 10));
                updatePlan((p) => ({ ...p, plotHeight: val }));
                commitHistory();
              }}
              className="min-h-11 w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted mb-1 flex items-center justify-between">
            <span>North Direction (Angle)</span>
            <span className="font-mono">{plan.northAngle}°</span>
          </label>
        </div>

        <div className="flex items-center justify-between mt-2">
          <label className="text-xs text-muted flex items-center gap-2">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="rounded text-accent focus:ring-accent"
            />
            Snap to Grid
          </label>
          <span className="text-xs text-meta">{snapToGrid ? 'On' : 'Off'}</span>
        </div>

        {snapToGrid && (
          <div className="flex items-center justify-between mt-2 mb-2">
            <label htmlFor="grid-step" className="text-xs text-muted">
              Grid Step
            </label>
            <select
              id="grid-step"
              value={plan.gridSize ?? DEFAULT_GRID_SIZE_FT}
              onChange={(e) => {
                const gridSize = Number(e.target.value);
                updatePlan((p) => ({ ...p, gridSize }));
                commitHistory();
              }}
              className="min-h-11 text-xs border border-border rounded-lg px-2 py-1 focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
            >
              {GRID_SIZE_OPTIONS_FT.map((ft) => {
                const label =
                  plan.unit === 'ft' ? `${ft} ft` : `${(ft * FT_PER_METER).toFixed(2)} m`;
                return (
                  <option key={ft} value={ft}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="359"
            value={plan.northAngle}
            onChange={(e) => updatePlan((p) => ({ ...p, northAngle: Number(e.target.value) }))}
            onMouseUp={commitHistory}
            onTouchEnd={commitHistory}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-meta mt-1">
            <span>Up (0°)</span>
            <span>Right (90°)</span>
            <span>Down (180°)</span>
            <span>Left (270°)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted mb-1 block">Road Facing</label>
            <select
              value={plan.roadDirection}
              onChange={(e) => {
                updatePlan((p) => ({
                  ...p,
                  roadDirection: e.target.value as FloorPlan['roadDirection'],
                }));
                commitHistory();
              }}
              className="min-h-11 w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
            >
              <option value="N">North</option>
              <option value="E">East</option>
              <option value="S">South</option>
              <option value="W">West</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Display Unit</label>
            <select
              value={plan.unit}
              onChange={(e) => {
                updatePlan((p) => ({ ...p, unit: e.target.value as FloorPlan['unit'] }));
                commitHistory();
              }}
              className="min-h-11 w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
            >
              <option value="ft">Feet (ft)</option>
              <option value="m">Meters (m)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-xs text-muted mb-2 flex items-center justify-between">
            <span>Setbacks (ft)</span>
            <button
              onClick={() => setLinkSetbacks(!linkSetbacks)}
              className="min-w-11 min-h-11 p-2 hover:bg-surface-warm rounded text-meta hover:text-accent transition-colors"
              title={linkSetbacks ? 'Unlink setbacks' : 'Link setbacks'}
            >
              {linkSetbacks ? (
                <LinkIcon className="w-3.5 h-3.5" />
              ) : (
                <Unlink className="w-3.5 h-3.5" />
              )}
            </button>
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {(['top', 'right', 'bottom', 'left'] as const).map((key) => (
              <div key={key}>
                <label className="text-[10px] text-meta block text-center mb-1 capitalize">
                  {key}
                </label>
                <input
                  type="number"
                  min="0"
                  max={key === 'top' || key === 'bottom' ? plan.plotHeight : plan.plotWidth}
                  value={plan.setbacks[key]}
                  onChange={(e) => {
                    const max =
                      key === 'top' || key === 'bottom' ? plan.plotHeight : plan.plotWidth;
                    handleSetbackChange(
                      key,
                      Math.max(0, Math.min(max, Number(e.target.value) || 0))
                    );
                  }}
                  className="min-h-11 w-full border border-border rounded-md px-2 py-1 text-xs text-center focus:ring-1 focus:ring-accent outline-none bg-bg text-fg"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg border border-border flex flex-col gap-2 text-xs bg-surface">
          <div className="flex justify-between items-center">
            <span className="text-muted dark:text-meta">Plot Area:</span>
            <strong className="text-fg">{totalArea} sq ft</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted dark:text-meta">Buildable Area:</span>
            <strong className="text-success">{buildableArea} sq ft</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted dark:text-meta">Built-up (Floor {currentFloor}):</span>
            <strong className="text-accent">{builtUpArea} sq ft</strong>
          </div>
          {(() => {
            const totalBuiltUpArea = Math.round(plan.rooms.reduce((sum, r) => sum + r.w * r.h, 0));
            const estCost = getTotalCost(plan.rooms);
            return (
              <>
                <div className="w-full h-px bg-border my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-muted">Total Built-up (All Floors):</span>
                  <strong className="text-accent">{totalBuiltUpArea} sq ft</strong>
                </div>
                <div className="flex justify-between items-center bg-surface-warm p-1.5 -mx-1.5 rounded-md">
                  <span className="text-accent font-medium tracking-tight">Est. Core Cost:</span>
                  <strong className="text-accent">{formatCurrency(estCost)}</strong>
                </div>
                <div className="text-[9px] text-meta text-right -mt-1">
                  *Assumes avg structure cost of ₹{DEFAULT_COST_PER_SQFT}/sq.ft; override per room
                  in properties
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="p-5 border-t border-border">
        <h4 className="text-xs text-muted dark:text-meta mb-3 uppercase tracking-wider">
          Data Management
        </h4>
        <div className="flex gap-2">
          <button
            onClick={handleImportJSON}
            className="min-h-11 min-h-11 flex-1 py-2 text-xs font-medium text-accent hover:bg-surface-warm border border-border rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <FolderOpen className="w-3 h-3" /> Import JSON
          </button>
          <button
            onClick={handleExportJSON}
            className="min-h-11 flex-1 py-2 text-xs font-medium text-accent hover:bg-surface-warm border border-border rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <FileText className="w-3 h-3" /> Export JSON
          </button>
        </div>
      </div>

      <div className="p-5 border-y border-border">
        <h3 className="text-sm font-semibold text-fg uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-meta" /> Floor
        </h3>
        <div className="flex gap-2 flex-wrap">
          {floorsUsed.map((floor) => (
            <button
              key={floor}
              onClick={() => setCurrentFloor(floor)}
              className={`min-h-11 flex-1 min-w-[3rem] py-2 text-sm font-medium rounded-lg border transition-colors ${
                currentFloor === floor
                  ? 'bg-surface-warm border-border text-accent'
                  : 'bg-surface border-border text-muted dark:text-meta hover:bg-surface-warm'
              }`}
            >
              {formatFloorLabel(floor, plan.floorNames)}
            </button>
          ))}
          {lastFloor < maxFloor && (
            <button
              onClick={() => setCurrentFloor(lastFloor + 1)}
              title="Add floor"
              className="min-h-11 px-3 py-2 text-sm font-medium rounded-lg border bg-surface border-border text-muted dark:text-meta hover:bg-surface-warm"
            >
              +
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() =>
              onDuplicateFloor?.(currentFloor, lastFloor < maxFloor ? lastFloor + 1 : currentFloor)
            }
            disabled={
              !onDuplicateFloor || plan.rooms.filter((r) => r.floor === currentFloor).length === 0
            }
            title="Duplicate current floor to the next unused floor"
            className="min-h-11 flex-1 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-surface border-border text-muted dark:text-meta hover:bg-surface-warm"
          >
            Duplicate {formatFloorLabel(currentFloor, plan.floorNames)}
          </button>
          <button
            onClick={handleClearFloor}
            title="Clear all rooms on the current floor"
            className="min-h-11 flex-1 py-2 text-xs font-medium text-danger hover:bg-danger/10 hover:text-danger border border-danger/30 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear Floor
          </button>
        </div>
      </div>

      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-fg uppercase tracking-wider mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-meta" /> Overlays
        </h3>
        <div className="space-y-2">
          <label className="min-h-11 py-2 flex items-center justify-between text-xs text-muted dark:text-meta cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5" /> Vastu Grid
            </span>
            <input
              type="checkbox"
              checked={showVastuGrid}
              onChange={onToggleVastuGrid}
              className="rounded text-accent focus:ring-accent"
            />
          </label>
          <label className="min-h-11 py-2 flex items-center justify-between text-xs text-muted dark:text-meta cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5" /> Plumbing
            </span>
            <input
              type="checkbox"
              checked={showPlumbing}
              onChange={onTogglePlumbing}
              className="rounded text-accent focus:ring-accent"
            />
          </label>
          <label className="min-h-11 py-2 flex items-center justify-between text-xs text-muted dark:text-meta cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" /> Sun Path
            </span>
            <input
              type="checkbox"
              checked={showSunPath}
              onChange={onToggleSunPath}
              className="rounded text-accent focus:ring-accent"
            />
          </label>

          {showSunPath && (
            <div className="pt-2 border-t border-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted dark:text-meta block mb-1">Date</label>
                  <input
                    type="date"
                    value={sunDate ? sunDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => onSetSunDate?.(e.target.value)}
                    className="min-h-11 w-full text-xs border border-border rounded-lg px-2 py-1 bg-bg text-fg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted dark:text-meta block mb-1">Time</label>
                  <input
                    type="time"
                    value={
                      sunTime !== undefined
                        ? `${String(Math.floor(sunTime / 60)).padStart(2, '0')}:${String(sunTime % 60).padStart(2, '0')}`
                        : ''
                    }
                    onChange={(e) => onSetSunTime?.(e.target.value)}
                    className="min-h-11 w-full text-xs border border-border rounded-lg px-2 py-1 bg-bg text-fg"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted dark:text-meta block mb-1">
                  Latitude ({plan.latitude ?? 'default'}°)
                </label>
                <input
                  type="number"
                  min="-90"
                  max="90"
                  step="0.0001"
                  value={plan.latitude ?? 28.6139}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!Number.isNaN(val)) {
                      updatePlan((p) => ({ ...p, latitude: Math.max(-90, Math.min(90, val)) }));
                    }
                  }}
                  className="min-h-11 w-full text-xs border border-border rounded-lg px-2 py-1 bg-bg text-fg"
                />
              </div>
              <button
                onClick={onSetSunNow}
                className="min-h-11 w-full text-xs py-2 px-2 bg-surface-warm border border-border rounded hover:border-border-strong hover:bg-surface transition-colors text-accent font-medium"
              >
                Use current time
              </button>
            </div>
          )}
        </div>
      </div>

      <LayerManager
        layers={plan.layers || []}
        onUpdateLayers={updateLayers}
        rooms={plan.rooms}
        currentFloor={currentFloor}
      />

      <div className="p-5 flex-1">
        <h3 className="text-sm font-semibold text-fg uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-meta" /> Add Rooms
        </h3>

        <div className="mb-4">
          <label className="text-xs text-muted mb-2 block">Category Filter</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRoomCategoryFilter(null)}
              className={`min-h-11 px-3 py-2 text-xs font-medium rounded-full border transition-colors ${
                roomCategoryFilter === null
                  ? 'bg-surface-warm border-accent text-accent'
                  : 'bg-surface border-border text-muted dark:text-meta hover:bg-surface-warm'
              }`}
            >
              All
            </button>
            {CATEGORY_BUTTONS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setRoomCategoryFilter(cat.id)}
                className={`min-h-11 px-3 py-2 text-xs font-medium rounded-full border transition-colors ${
                  roomCategoryFilter === cat.id
                    ? 'bg-surface-warm border-accent text-accent'
                    : 'bg-surface border-border text-muted dark:text-meta hover:bg-surface-warm'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-meta" />
          <input
            type="text"
            placeholder="Search room types..."
            value={roomSearch}
            onChange={(e) => setRoomSearch(e.target.value)}
            className="min-h-11 w-full border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg placeholder:text-meta"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ROOM_TYPES.filter((rt) => {
            if (roomSearch && !rt.type.toLowerCase().includes(roomSearch.toLowerCase())) {
              return false;
            }
            if (roomCategoryFilter) {
              const roomCategory = ROOM_CATEGORIES[rt.type];
              if (roomCategory !== roomCategoryFilter) {
                return false;
              }
            }
            return true;
          }).map((rt) => (
            <button
              key={rt.type}
              onClick={() => addRoom(rt.type, rt.w, rt.h)}
              className="min-h-11 flex flex-col items-center justify-center p-3 border border-border rounded-xl hover:border-accent hover:bg-surface-warm transition-colors group bg-surface"
            >
              <span className="text-xs font-medium text-fg-2 text-center">{rt.type}</span>
              <span className="text-[10px] text-meta mt-1">
                {rt.w}'x{rt.h}'
              </span>
            </button>
          ))}
        </div>
        {ROOM_TYPES.filter((rt) => {
          if (roomSearch && !rt.type.toLowerCase().includes(roomSearch.toLowerCase())) {
            return false;
          }
          if (roomCategoryFilter) {
            const roomCategory = ROOM_CATEGORIES[rt.type];
            if (roomCategory !== roomCategoryFilter) {
              return false;
            }
          }
          return true;
        }).length === 0 && (
          <p className="text-xs text-meta text-center py-2">No rooms match your search.</p>
        )}
      </div>
    </div>
  );
};
