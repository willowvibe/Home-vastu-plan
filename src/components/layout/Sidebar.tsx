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
} from 'lucide-react';
import { FloorPlan, AppMode, RoomType } from '../../types';
import { LayerManager } from '../LayerManager';
import { ROOM_TYPES, ROOM_CATEGORIES, formatFloor } from '../../constants/floorPlanConstants';

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
      } ${isLocked ? 'opacity-50 pointer-events-none' : ''} bg-white border-r border-slate-200 dark:bg-slate-900 dark:border-slate-700`}
    >
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Map className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Plot Settings
        </h3>

        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-1 block">Plan Template</label>
          <select
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select Template...</option>
            <option value="Small Apartment">Small Apartment (25x35 ft)</option>
            <option value="Medium House">Medium House (35x45 ft)</option>
            <option value="Large Villa">Large Villa (45x60 ft)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs mb-1 block text-slate-500 dark:text-slate-400">
              Width (ft)
            </label>
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
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block text-slate-500 dark:text-slate-400">
              Length (ft)
            </label>
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
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-1 flex items-center justify-between">
            <span>North Direction (Angle)</span>
            <span className="font-mono">{plan.northAngle}°</span>
          </label>
        </div>

        <div className="flex items-center justify-between mt-2">
          <label className="text-xs text-slate-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Snap to Grid
          </label>
          <span className="text-xs text-slate-400">{snapToGrid ? 'On' : 'Off'}</span>
        </div>

        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="359"
            value={plan.northAngle}
            onChange={(e) => updatePlan((p) => ({ ...p, northAngle: Number(e.target.value) }))}
            onMouseUp={commitHistory}
            onTouchEnd={commitHistory}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Up (0°)</span>
            <span>Right (90°)</span>
            <span>Down (180°)</span>
            <span>Left (270°)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Road Facing</label>
            <select
              value={plan.roadDirection}
              onChange={(e) => {
                updatePlan((p) => ({
                  ...p,
                  roadDirection: e.target.value as FloorPlan['roadDirection'],
                }));
                commitHistory();
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="N">North</option>
              <option value="E">East</option>
              <option value="S">South</option>
              <option value="W">West</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Display Unit</label>
            <select
              value={plan.unit}
              onChange={(e) => {
                updatePlan((p) => ({ ...p, unit: e.target.value as FloorPlan['unit'] }));
                commitHistory();
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="ft">Feet (ft)</option>
              <option value="m">Meters (m)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-xs text-slate-500 mb-2 flex items-center justify-between">
            <span>Setbacks (ft)</span>
            <button
              onClick={() => setLinkSetbacks(!linkSetbacks)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-600 transition-colors"
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
                <label className="text-[10px] text-slate-400 block text-center mb-1 capitalize">
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
                  className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg border flex flex-col gap-2 text-xs bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Plot Area:</span>
            <strong className="text-slate-800 dark:text-slate-200">{totalArea} sq ft</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Buildable Area:</span>
            <strong className="text-emerald-700">{buildableArea} sq ft</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">
              Built-up (Floor {currentFloor}):
            </span>
            <strong className="text-indigo-700 dark:text-indigo-400">{builtUpArea} sq ft</strong>
          </div>
          {(() => {
            const totalBuiltUpArea = Math.round(plan.rooms.reduce((sum, r) => sum + r.w * r.h, 0));
            const estCost = (totalBuiltUpArea * 2000).toLocaleString('en-IN');
            return (
              <>
                <div className="w-full h-px bg-slate-200 my-1 dark:bg-slate-700" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Total Built-up (All Floors):</span>
                  <strong className="text-indigo-900">{totalBuiltUpArea} sq ft</strong>
                </div>
                <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/30 p-1.5 -mx-1.5 rounded-md">
                  <span className="text-indigo-700 font-medium tracking-tight">
                    Est. Core Cost:
                  </span>
                  <strong className="text-indigo-700">₹ {estCost}</strong>
                </div>
                <div className="text-[9px] text-slate-400 text-right -mt-1">
                  *Assumes avg structure cost of ₹2000/sq.ft
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="p-5 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">
          Data Management
        </h4>
        <div className="flex gap-2">
          <button
            onClick={handleImportJSON}
            className="flex-1 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <FolderOpen className="w-3 h-3" /> Import JSON
          </button>
          <button
            onClick={handleExportJSON}
            className="flex-1 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <FileText className="w-3 h-3" /> Export JSON
          </button>
        </div>
      </div>

      <div className="p-5 border-b border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" /> Floor
        </h3>
        <div className="flex gap-2 flex-wrap">
          {floorsUsed.map((floor) => (
            <button
              key={floor}
              onClick={() => setCurrentFloor(floor)}
              className={`flex-1 min-w-[3rem] py-2 text-sm font-medium rounded-lg border transition-colors ${
                currentFloor === floor
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {formatFloor(floor)}
            </button>
          ))}
          {lastFloor < maxFloor && (
            <button
              onClick={() => setCurrentFloor(lastFloor + 1)}
              title="Add floor"
              className="px-3 py-2 text-sm font-medium rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
            className="flex-1 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Duplicate {formatFloor(currentFloor)}
          </button>
          <button
            onClick={handleClearFloor}
            title="Clear all rooms on the current floor"
            className="flex-1 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 border border-red-200 dark:border-red-800 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear Floor
          </button>
        </div>
      </div>

      <LayerManager
        layers={plan.layers || []}
        onUpdateLayers={updateLayers}
        rooms={plan.rooms}
        currentFloor={currentFloor}
      />

      <div className="p-5 flex-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-slate-400" /> Add Rooms
        </h3>

        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-2 block">Category Filter</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRoomCategoryFilter(null)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                roomCategoryFilter === null
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              All
            </button>
            {CATEGORY_BUTTONS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setRoomCategoryFilter(cat.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  roomCategoryFilter === cat.id
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search room types..."
            value={roomSearch}
            onChange={(e) => setRoomSearch(e.target.value)}
            className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-slate-500"
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
              className="flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors group bg-white dark:bg-slate-800"
            >
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 text-center">
                {rt.type}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
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
          <p className="text-xs text-slate-400 text-center py-2">No rooms match your search.</p>
        )}
      </div>
    </div>
  );
};
