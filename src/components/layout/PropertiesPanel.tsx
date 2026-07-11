import React from 'react';
import { Sparkles, Info, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { RoomPropertiesPanel } from '../Properties/RoomPropertiesPanel';
import { CommentPropertiesPanel } from '../Properties/CommentPropertiesPanel';
import { FloorPlan, AppMode, Room, RoomCategory } from '../../types';
import { AnalyzeButtonState } from '../../utils';

export interface PropertiesPanelProps {
  selectedRoomIds: string[];
  plan: FloorPlan;
  appMode: AppMode;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
  onCommitHistory: () => void;
  onDuplicate: () => void;
  onRotate: () => void;
  onDelete: () => void;
  addRoomElement: (roomId: string, type: string, w: number, h: number) => void;
  updateRoomCategory: (roomId: string, category: RoomCategory | undefined) => void;
  onClearSelection: () => void;
  analysis: string | null;
  isAnalyzing: boolean;
  analysisProgress: number;
  analyzeBtn: AnalyzeButtonState;
  onAnalyze: () => void;
  mobileTab: 'settings' | 'canvas' | 'properties';
  selectedCommentId?: string | null;
  onUpdateComment?: (id: string, updates: Partial<FloorPlan['comments'][number]>) => void;
  onDeleteComment?: (id: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedRoomIds,
  plan,
  appMode,
  onUpdateRoom,
  onCommitHistory,
  onDuplicate,
  onRotate,
  onDelete,
  addRoomElement,
  updateRoomCategory,
  onClearSelection,
  analysis,
  isAnalyzing,
  analysisProgress,
  analyzeBtn,
  onAnalyze,
  mobileTab,
  selectedCommentId,
  onUpdateComment,
  onDeleteComment,
}) => {
  return (
    <div
      className={`w-full md:w-80 flex-col overflow-hidden shrink-0 ${
        mobileTab === 'properties' ? 'flex' : 'hidden md:flex'
      } bg-bg border-l border-border`}
    >
      <CommentPropertiesPanel
        selectedCommentId={selectedCommentId}
        plan={plan}
        appMode={appMode}
        onUpdateComment={onUpdateComment || (() => {})}
        onDeleteComment={onDeleteComment || (() => {})}
        onClearSelection={onClearSelection}
      />

      <RoomPropertiesPanel
        selectedRoomIds={selectedRoomIds}
        plan={plan}
        appMode={appMode}
        onUpdateRoom={onUpdateRoom}
        onCommitHistory={onCommitHistory}
        onDuplicate={onDuplicate}
        onRotate={onRotate}
        onDelete={onDelete}
        onStaleSelection={onClearSelection}
        onClearSelection={onClearSelection}
        addRoomElement={addRoomElement}
        updateRoomCategory={updateRoomCategory}
      />

      <div className="p-5 flex-1 overflow-y-auto flex flex-col custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-fg  uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warn" /> AI Vastu & Build Guide
          </h3>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onAnalyze}
            disabled={analyzeBtn.disabled}
            title={analyzeBtn.title}
            className="min-h-11 w-full font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4 shrink-0 bg-accent hover:bg-accent-hover text-accent-on"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
              </>
            ) : (
              'Analyze Floor Plan'
            )}
          </button>
          {isAnalyzing && (
            <div className="w-full h-1.5 bg-surface  rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-200 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          )}
        </div>

        {isAnalyzing && !analysis ? (
          <div className="flex-1 flex flex-col gap-3 animate-pulse">
            <div className="h-5 rounded w-3/4 bg-surface " />
            <div className="h-3 rounded w-full bg-surface " />
            <div className="h-3 rounded w-5/6 bg-surface " />
            <div className="h-4 rounded w-1/2 mt-2 bg-surface " />
            <div className="h-3 rounded w-full bg-surface " />
            <div className="h-3 rounded w-4/5 bg-surface " />
            <div className="h-3 rounded w-2/3 bg-surface " />
            <div className="h-4 rounded w-2/3 mt-2 bg-surface " />
            <div className="h-3 rounded w-full bg-surface " />
            <div className="h-3 rounded w-3/4 bg-surface " />
          </div>
        ) : analysis ? (
          <div className="prose prose-sm max-w-none dark:prose-invert flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border  rounded-xl bg-bg dark:bg-surface">
            <Info className="w-8 h-8 text-meta mb-3" />
            <p className="text-sm text-muted dark:text-meta">
              Add rooms to your floor plan and click analyze to get Vastu Shastra compliance scores
              and construction tips.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
