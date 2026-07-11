import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommentAuthor } from './useCommentAuthor';

describe('useCommentAuthor', () => {
  let stored: Record<string, string> = {};

  beforeEach(() => {
    stored = {};
    vi.spyOn(localStorage, 'getItem').mockImplementation((key: string) => stored[key] ?? null);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      stored[key] = value;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to Reviewer when no name is stored', () => {
    const { result } = renderHook(() => useCommentAuthor());
    expect(result.current.author).toBe('Reviewer');
  });

  it('reads the stored author name', () => {
    stored['vastuplan-comment-author'] = 'Architect Arun';
    const { result } = renderHook(() => useCommentAuthor());
    expect(result.current.author).toBe('Architect Arun');
  });

  it('writes the author name to localStorage', () => {
    const { result } = renderHook(() => useCommentAuthor());
    act(() => result.current.setAuthor('Contractor Ravi'));
    expect(result.current.author).toBe('Contractor Ravi');
    expect(stored['vastuplan-comment-author']).toBe('Contractor Ravi');
  });

  it('falls back to Reviewer for empty/whitespace names', () => {
    const { result } = renderHook(() => useCommentAuthor());
    act(() => result.current.setAuthor('  '));
    expect(result.current.author).toBe('Reviewer');
    expect(stored['vastuplan-comment-author']).toBe('Reviewer');
  });
});
