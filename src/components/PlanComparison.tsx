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
      <div className="fixed inset-0 bg-fg/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-bg rounded-2xl shadow-elev-raised p-8 max-w-md text-center">
          <Activity className="w-12 h-12 text-meta mx-auto mb-4" />
          <h2 className="text-xl font-bold text-fg-2 mb-2">No Plans to Compare</h2>
          <p className="text-muted mb-6">
            At least two plans are needed for comparison. Save your plan or load a previous version.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-accent text-accent-on rounded-lg hover:bg-accent-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-fg/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg rounded-2xl shadow-elev-raised w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-soft bg-bg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-fg-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              Plan Comparison
            </h2>
            <p className="text-sm text-muted mt-1">
              Comparing <span className="font-medium text-fg-2">{basePlanName}</span> vs{' '}
              <span className="font-medium text-fg-2">{comparePlanName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-meta hover:text-muted hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border-soft bg-bg flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted">View:</span>
            <div className="flex rounded-lg bg-surface-warm p-1">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'side-by-side'
                    ? 'bg-bg text-accent shadow-elev-ring'
                    : 'text-muted hover:text-fg'
                }`}
              >
                Side by Side
              </button>
              <button
                onClick={() => setViewMode('merged')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'merged'
                    ? 'bg-bg text-accent shadow-elev-ring'
                    : 'text-muted hover:text-fg'
                }`}
              >
                Merged
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted">Filter:</span>
            <div className="flex rounded-lg bg-surface-warm p-1 overflow-x-auto">
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
                      ? 'bg-bg text-accent shadow-elev-ring'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-3 border-b border-border-soft bg-bg flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-muted">
              Added:{' '}
              <strong className="text-success">
                {roomDiffs.filter((d) => d.type === 'added').length}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger"></div>
            <span className="text-muted">
              Removed:{' '}
              <strong className="text-danger">
                {roomDiffs.filter((d) => d.type === 'removed').length}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warn"></div>
            <span className="text-muted">
              Modified:{' '}
              <strong className="text-warn">
                {roomDiffs.filter((d) => d.type === 'modified').length}
              </strong>
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 overflow-y-auto min-h-0 flex-1 bg-bg">
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
              <div className="bg-bg rounded-xl border border-border overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-border-soft bg-bg font-medium text-sm text-fg-2">
                  {basePlanName}
                </div>
                <div className="flex-1 overflow-auto p-4 bg-bg">
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
              <div className="bg-bg rounded-xl border border-border overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-border-soft bg-bg font-medium text-sm text-fg-2">
                  {comparePlanName}
                </div>
                <div className="flex-1 overflow-auto p-4 bg-bg">
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
            <div className="bg-bg rounded-xl border border-border overflow-hidden h-[500px] flex flex-col">
              <div className="px-4 py-2 border-b border-border-soft bg-bg font-medium text-sm text-fg-2">
                Merged View (Diffs highlighted)
              </div>
              <div className="flex-1 overflow-auto p-4 bg-bg relative">
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
                <div className="absolute bottom-4 right-4 bg-bg/90 backdrop-blur rounded-lg p-4 max-w-xs shadow-elev-raised border border-border">
                  <h4 className="text-sm font-semibold text-fg-2 mb-2">Legend</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-success border-2 border-success"></div>
                      <span className="text-xs text-muted">Added room</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-danger border-2 border-danger"></div>
                      <span className="text-xs text-muted">Removed room</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-warn border-2 border-warn/30"></div>
                      <span className="text-xs text-muted">Modified room</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Diff Details */}
          {filteredDiffs.length > 0 && (
            <div className="mt-6 bg-bg rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border-soft bg-bg">
                <h3 className="text-sm font-semibold text-fg-2">Room Changes</h3>
              </div>
              <div className="divide-y divide-border-soft">
                {filteredDiffs.map((diff) => (
                  <div key={diff.id} className="px-4 py-3 hover:bg-bg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                              diff.type === 'added'
                                ? 'bg-success/15 text-success'
                                : diff.type === 'removed'
                                  ? 'bg-danger/15 text-danger'
                                  : 'bg-warn/15 text-warn'
                            }`}
                          >
                            {diff.type}
                          </span>
                          <span className="text-sm font-medium text-fg">
                            {diff.room?.type || diff.prevRoom?.type}
                          </span>
                        </div>
                        <div className="text-xs text-muted space-y-0.5">
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
        <div className="px-6 py-4 border-t border-border-soft bg-bg flex justify-between items-center">
          <div className="text-xs text-muted">
            Showing {filteredDiffs.length} of {roomDiffs.length} changes
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted hover:bg-surface rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => alert('Export comparison report (placeholder)')}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-on rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
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
