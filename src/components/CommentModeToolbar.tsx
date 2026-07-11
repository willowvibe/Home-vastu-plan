import React from 'react';
import { MessageSquare, MapPin, Trash2, User } from 'lucide-react';
import { FloorPlan, AppMode } from '../types';
import { formatFloorLabel } from '../constants/floorPlanConstants';

interface CommentModeToolbarProps {
  plan: FloorPlan;
  appMode: AppMode;
  currentFloor: number;
  selectedCommentId: string | null;
  author: string;
  onAuthorChange: (name: string) => void;
  onAddPin: () => void;
  onSelectComment: (id: string | null) => void;
  onDeleteComment: (id: string) => void;
}

export const CommentModeToolbar: React.FC<CommentModeToolbarProps> = ({
  plan,
  appMode,
  currentFloor,
  selectedCommentId,
  author,
  onAuthorChange,
  onAddPin,
  onSelectComment,
  onDeleteComment,
}) => {
  if (appMode !== 'comment') return null;

  const comments = (plan.comments || [])
    .slice()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const currentFloorComments = comments.filter((c) => (c.floor ?? 0) === currentFloor);
  const otherFloorComments = comments.filter((c) => (c.floor ?? 0) !== currentFloor);

  return (
    <div className="w-full max-w-[calc(100%-2rem)] z-10 mb-4">
      <div className="bg-warn/10 border border-warn/30 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-warn text-accent-on">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs font-bold uppercase tracking-wider">Comment Mode</span>
            </div>
            <p className="text-xs text-muted dark:text-meta truncate">
              Click the canvas to drop a pin, then write a note.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2 py-1.5">
              <User className="w-3.5 h-3.5 text-muted" />
              <input
                type="text"
                value={author}
                onChange={(e) => onAuthorChange(e.target.value)}
                placeholder="Your name"
                className="bg-transparent text-xs text-fg placeholder:text-muted outline-none min-w-[6rem] max-w-[10rem]"
                data-testid="comment-author-input"
              />
            </div>
            <button
              onClick={onAddPin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent hover:bg-accent-hover text-accent-on transition-colors shadow-sm"
              data-testid="comment-add-pin-button"
            >
              <MapPin className="w-3.5 h-3.5" />
              Add pin
            </button>
          </div>
        </div>

        {comments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-warn/20">
            <p className="text-[10px] uppercase tracking-wider text-muted dark:text-meta mb-2">
              Comments ({currentFloorComments.length} on this floor)
            </p>
            <div className="flex flex-wrap gap-2">
              {currentFloorComments.map((comment) => (
                <button
                  key={comment.id}
                  onClick={() => onSelectComment(comment.id)}
                  data-testid={`comment-list-item-${comment.id}`}
                  className={`group flex items-center gap-2 max-w-[16rem] px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                    selectedCommentId === comment.id
                      ? 'bg-warn/20 border-warn text-fg'
                      : 'bg-surface border-border hover:border-warn/50 text-fg'
                  }`}
                >
                  <MessageSquare className="w-3 h-3 shrink-0 text-warn" />
                  <span className="text-xs truncate">
                    {comment.text.trim() || <span className="italic text-muted">Empty note</span>}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteComment(comment.id);
                    }}
                    className="ml-1 p-0.5 rounded hover:bg-danger/10 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete comment"
                    role="button"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                </button>
              ))}

              {otherFloorComments.length > 0 && (
                <div className="w-full text-[10px] text-muted dark:text-meta mt-1">
                  {otherFloorComments.length} on other floors:{' '}
                  {otherFloorComments.map((comment) => {
                    const label = formatFloorLabel(comment.floor ?? 0, plan.floorNames);
                    return (
                      <button
                        key={comment.id}
                        onClick={() => onSelectComment(comment.id)}
                        className="inline-flex items-center gap-1 ml-2 underline hover:text-fg"
                        data-testid={`comment-other-floor-${comment.id}`}
                      >
                        {label}
                        {comment.text.trim() ? `: ${comment.text.slice(0, 20)}` : ': empty note'}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
