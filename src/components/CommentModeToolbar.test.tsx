import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentModeToolbar } from './CommentModeToolbar';
import { FloorPlan } from '../types';

const basePlan: FloorPlan = {
  plotWidth: 30,
  plotHeight: 40,
  northAngle: 0,
  roadDirection: 'N',
  unit: 'ft',
  setbacks: { top: 0, right: 0, bottom: 0, left: 0 },
  rooms: [],
  comments: [
    { id: 'c1', text: 'Move kitchen east', x: 10, y: 12, author: 'Ravi', timestamp: 1, floor: 0 },
    { id: 'c2', text: '', x: 5, y: 5, author: 'Reviewer', timestamp: 2, floor: 0 },
    { id: 'c3', text: 'Balcony too small', x: 20, y: 20, author: 'Priya', timestamp: 3, floor: 1 },
  ],
};

describe('CommentModeToolbar', () => {
  it('renders nothing outside comment mode', () => {
    const { container } = render(
      <CommentModeToolbar
        plan={basePlan}
        appMode="view"
        currentFloor={0}
        selectedCommentId={null}
        author="Reviewer"
        onAuthorChange={vi.fn()}
        onAddPin={vi.fn()}
        onSelectComment={vi.fn()}
        onDeleteComment={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows comment mode badge and instructions in comment mode', () => {
    render(
      <CommentModeToolbar
        plan={basePlan}
        appMode="comment"
        currentFloor={0}
        selectedCommentId={null}
        author="Reviewer"
        onAuthorChange={vi.fn()}
        onAddPin={vi.fn()}
        onSelectComment={vi.fn()}
        onDeleteComment={vi.fn()}
      />
    );
    expect(screen.getByText('Comment Mode')).toBeInTheDocument();
    expect(
      screen.getByText('Click the canvas to drop a pin, then write a note.')
    ).toBeInTheDocument();
  });

  it('lists only current-floor comments', () => {
    render(
      <CommentModeToolbar
        plan={basePlan}
        appMode="comment"
        currentFloor={0}
        selectedCommentId={null}
        author="Reviewer"
        onAuthorChange={vi.fn()}
        onAddPin={vi.fn()}
        onSelectComment={vi.fn()}
        onDeleteComment={vi.fn()}
      />
    );
    expect(screen.getByText('Move kitchen east')).toBeInTheDocument();
    expect(screen.getByText('Empty note')).toBeInTheDocument();
    expect(screen.queryByText('Balcony too small')).not.toBeInTheDocument();
  });

  it('fires add pin callback', () => {
    const onAddPin = vi.fn();
    render(
      <CommentModeToolbar
        plan={basePlan}
        appMode="comment"
        currentFloor={0}
        selectedCommentId={null}
        author="Reviewer"
        onAuthorChange={vi.fn()}
        onAddPin={onAddPin}
        onSelectComment={vi.fn()}
        onDeleteComment={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('comment-add-pin-button'));
    expect(onAddPin).toHaveBeenCalledTimes(1);
  });

  it('fires author change callback', () => {
    const onAuthorChange = vi.fn();
    render(
      <CommentModeToolbar
        plan={basePlan}
        appMode="comment"
        currentFloor={0}
        selectedCommentId={null}
        author="Reviewer"
        onAuthorChange={onAuthorChange}
        onAddPin={vi.fn()}
        onSelectComment={vi.fn()}
        onDeleteComment={vi.fn()}
      />
    );
    const input = screen.getByTestId('comment-author-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Arun' } });
    expect(onAuthorChange).toHaveBeenCalledWith('Arun');
  });

  it('selects a comment when clicking a list item', () => {
    const onSelectComment = vi.fn();
    render(
      <CommentModeToolbar
        plan={basePlan}
        appMode="comment"
        currentFloor={0}
        selectedCommentId={null}
        author="Reviewer"
        onAuthorChange={vi.fn()}
        onAddPin={vi.fn()}
        onSelectComment={onSelectComment}
        onDeleteComment={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('comment-list-item-c1'));
    expect(onSelectComment).toHaveBeenCalledWith('c1');
  });

  it('deletes a comment when clicking its trash icon', () => {
    const onDeleteComment = vi.fn();
    const onSelectComment = vi.fn();
    render(
      <CommentModeToolbar
        plan={basePlan}
        appMode="comment"
        currentFloor={0}
        selectedCommentId={null}
        author="Reviewer"
        onAuthorChange={vi.fn()}
        onAddPin={vi.fn()}
        onSelectComment={onSelectComment}
        onDeleteComment={onDeleteComment}
      />
    );
    const item = screen.getByTestId('comment-list-item-c1');
    const trash = item.querySelector('[aria-label="Delete comment"]')!;
    fireEvent.click(trash);
    expect(onDeleteComment).toHaveBeenCalledWith('c1');
    expect(onSelectComment).not.toHaveBeenCalled();
  });
});
