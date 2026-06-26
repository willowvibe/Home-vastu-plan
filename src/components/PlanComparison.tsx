import React, { useState, useMemo } from 'react';
import { X, Download, Activity } from 'lucide-react';
import { FloorPlan, Room } from '../types';
import { Canvas } from './Canvas';

interface PlanComparisonProps {
  plans: { name: string; plan: FloorPlan; timestamp: number }[];
  onClose: () => void;
}

interface RoomDiff {
  id: string;
  type: 'added' | 'removed' | 'modified';
  room?: Room;
  prevRoom?: Room;
}

type DiffType = 'all' | 'added' | 'removed' | 'modified';

export const PlanComparison: React.FC<PlanComparisonProps> = ({ plans, onClose }) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'merged'>('side-by-side');
  const [diffType, setDiffType] = useState<DiffType>('all');

  // Get the two most recent plans for comparison
  const basePlan = plans[0]?.plan || null;
  const comparePlan = plans[1]?.plan || null;

  const comparePlanName = plans[1]?.name || 'Current Plan';
  const basePlanName = plans[0]?.name || 'Previous Version';

  // Calculate room differences
  const roomDiffs = useMemo((): RoomDiff[] => {
    if (!basePlan || !comparePlan) return [];

    const baseRooms = new Map(basePlan.rooms.map((r) => [r.id, r]));
    const compareRooms = new Map(comparePlan.rooms.map((r) => [r.id, r]));

    const diffs: RoomDiff[] = [];

    // Check for added rooms
    comparePlan.rooms.forEach((room) => {
      if (!baseRooms.has(room.id)) {
        diffs.push({ id: room.id, type: 'added', room });
      }
    });

    // Check for removed rooms
    basePlan.rooms.forEach((room) => {
      if (!compareRooms.has(room.id)) {
        diffs.push({ id: room.id, type: 'removed', room });
      }
    });

    // Check for modified rooms
    basePlan.rooms.forEach((room) => {
      const compareRoom = compareRooms.get(room.id);
      if (compareRoom) {
        const isModified =
          room.w !== compareRoom.w ||
          room.h !== compareRoom.h ||
          room.x !== compareRoom.x ||
          room.y !== compareRoom.y;
        if (isModified) {
          diffs.push({ id: room.id, type: 'modified', room, prevRoom: compareRoom });
        }
      }
    });

    return diffs;
  }, [basePlan, comparePlan]);

  const filteredDiffs = useMemo(() => {
    if (diffType === 'all') return roomDiffs;
    return roomDiffs.filter((d) => d.type === diffType);
  }, [roomDiffs, diffType]);

  if (!basePlan || !comparePlan) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Plans to Compare</h2>
          <p className="text-slate-500 mb-6">
            At least two plans are needed for comparison. Save your plan or load a previous version.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Plan Comparison
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Comparing <span className="font-medium text-slate-700">{basePlanName}</span> vs{' '}
              <span className="font-medium text-slate-700">{comparePlanName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">View:</span>
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'side-by-side'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Side by Side
              </button>
              <button
                onClick={() => setViewMode('merged')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'merged'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Merged
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Filter:</span>
            <div className="flex rounded-lg bg-slate-100 p-1 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'added', label: 'Added' },
                  { id: 'modified', label: 'Modified' },
                  { id: 'removed', label: 'Removed' },
                ] as { id: DiffType; label: string }[]
              ).map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setDiffType(filter.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    diffType === filter.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-slate-600">
              Added:{' '}
              <strong className="text-emerald-700">
                {roomDiffs.filter((d) => d.type === 'added').length}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-slate-600">
              Removed:{' '}
              <strong className="text-rose-700">
                {roomDiffs.filter((d) => d.type === 'removed').length}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-slate-600">
              Modified:{' '}
              <strong className="text-amber-700">
                {roomDiffs.filter((d) => d.type === 'modified').length}
              </strong>
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 overflow-y-auto min-h-0 flex-1 bg-slate-50">
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 font-medium text-sm text-slate-700">
                  {basePlanName}
                </div>
                <div className="flex-1 overflow-auto p-4 bg-white">
                  <Canvas
                    plan={basePlan}
                    currentFloor={0}
                    zoom={1}
                    showVastuGrid={false}
                    snapToGrid={true}
                    measuring={false}
                    setMeasuring={() => {}}
                    onUpdateRoom={() => {}}
                    onUpdateRoomEnd={() => {}}
                    onSelectRoom={() => {}}
                    selectedRoomIds={[]}
                    layers={[]}
                  />
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 font-medium text-sm text-slate-700">
                  {comparePlanName}
                </div>
                <div className="flex-1 overflow-auto p-4 bg-white">
                  <Canvas
                    plan={comparePlan}
                    currentFloor={0}
                    zoom={1}
                    showVastuGrid={false}
                    snapToGrid={true}
                    measuring={false}
                    setMeasuring={() => {}}
                    onUpdateRoom={() => {}}
                    onUpdateRoomEnd={() => {}}
                    onSelectRoom={() => {}}
                    selectedRoomIds={[]}
                    layers={[]}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[500px] flex flex-col">
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 font-medium text-sm text-slate-700">
                Merged View (Diffs highlighted)
              </div>
              <div className="flex-1 overflow-auto p-4 bg-white relative">
                <Canvas
                  plan={comparePlan}
                  currentFloor={0}
                  zoom={1}
                  showVastuGrid={false}
                  snapToGrid={true}
                  measuring={false}
                  setMeasuring={() => {}}
                  onUpdateRoom={() => {}}
                  onUpdateRoomEnd={() => {}}
                  onSelectRoom={() => {}}
                  selectedRoomIds={[]}
                  layers={[]}
                />
                {/* Diffs overlay would be rendered here in a full implementation */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg p-4 max-w-xs shadow-lg border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Legend</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-700"></div>
                      <span className="text-xs text-slate-600">Added room</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500 border-2 border-rose-700"></div>
                      <span className="text-xs text-slate-600">Removed room</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-amber-700"></div>
                      <span className="text-xs text-slate-600">Modified room</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Diff Details */}
          {filteredDiffs.length > 0 && (
            <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700">Room Changes</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredDiffs.map((diff) => (
                  <div key={diff.id} className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                              diff.type === 'added'
                                ? 'bg-emerald-100 text-emerald-700'
                                : diff.type === 'removed'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {diff.type}
                          </span>
                          <span className="text-sm font-medium text-slate-900">
                            {diff.room?.type || diff.prevRoom?.type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          {diff.type === 'modified' && (
                            <>
                              <div>
                                Size: {diff.prevRoom?.w}'x{diff.prevRoom?.h}' → {diff.room?.w}'x
                                {diff.room?.h}'
                              </div>
                              <div>
                                Position: ({diff.prevRoom?.x}, {diff.prevRoom?.y}) → ({diff.room?.x}
                                , {diff.room?.y})
                              </div>
                            </>
                          )}
                          {diff.type === 'added' && (
                            <div>
                              Room added: {diff.room?.w}'x{diff.room?.h}' at ({diff.room?.x},{' '}
                              {diff.room?.y})
                            </div>
                          )}
                          {diff.type === 'removed' && (
                            <div>
                              Room removed: {diff.prevRoom?.w}'x{diff.prevRoom?.h}' at (
                              {diff.prevRoom?.x}, {diff.prevRoom?.y})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Showing {filteredDiffs.length} of {roomDiffs.length} changes
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => alert('Export comparison report (placeholder)')}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
