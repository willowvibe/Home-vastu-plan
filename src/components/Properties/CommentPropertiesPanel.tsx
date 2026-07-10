import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { FloorPlan, AppMode } from '../../types';

interface CommentPropertiesPanelProps {
  selectedCommentId: string | null;
  plan: FloorPlan;
  appMode: AppMode;
  onUpdateComment: (id: string, updates: Partial<FloorPlan['comments'][number]>) => void;
  onDeleteComment: (id: string) => void;
  onClearSelection: () => void;
}

export const CommentPropertiesPanel: React.FC<CommentPropertiesPanelProps> = ({
  selectedCommentId,
  plan,
  appMode,
  onUpdateComment,
  onDeleteComment,
  onClearSelection,
}) => {
  if (!selectedCommentId) return null;

  const comment = plan.comments?.find((c) => c.id === selectedCommentId);
  if (!comment) {
    return (
      <div className="p-5 border-b border-border-soft bg-warn/10">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-fg ">
          Comment not found
        </h3>
        <button
          onClick={onClearSelection}
          className="mt-3 px-3 py-1.5 text-xs font-medium text-accent hover:bg-surface-warm rounded-md"
        >
          Clear selection
        </button>
      </div>
    );
  }

  const isLocked = appMode !== 'comment';

  return (
    <div className="p-5 border-b border-border-soft bg-warn/10">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-fg  flex items-center gap-2">
            Comment
          </h3>
          <p className="text-xs text-muted dark:text-meta mt-0.5">
            {isLocked ? 'Read-only in view mode' : 'Click the canvas to add more pins'}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onDeleteComment(comment.id)}
            disabled={isLocked}
            className="p-1.5 text-danger hover:bg-danger/10 rounded-md transition-colors border border-transparent hover:border-danger/30 flex items-center gap-1.5 disabled:opacity-50"
            title="Delete comment"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs">Delete</span>
          </button>
          <button
            onClick={onClearSelection}
            className="p-1.5 text-muted hover:bg-surface-warm rounded-md transition-colors border border-transparent hover:border-border"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted block mb-1">Note</label>
          <textarea
            value={comment.text}
            onChange={(e) => onUpdateComment(comment.id, { text: e.target.value })}
            disabled={isLocked}
            placeholder={isLocked ? '' : 'Write your feedback here…'}
            rows={4}
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none bg-bg text-fg resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">Position (ft)</label>
            <div className="text-sm font-medium text-fg bg-surface border border-border rounded-md px-3 py-2">
              {comment.x.toFixed(1)}, {comment.y.toFixed(1)}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Author</label>
            <div className="text-sm font-medium text-fg bg-surface border border-border rounded-md px-3 py-2">
              {comment.author}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
