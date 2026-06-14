import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from './useSelection';

describe('useSelection (reducer for selectedRoomIds)', () => {
  it('initial state is an empty selection', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selectedRoomIds).toEqual([]);
  });

  it('select(id) without shift replaces any prior selection', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.select('a'));
    act(() => result.current.select('b'));
    expect(result.current.selectedRoomIds).toEqual(['b']);
  });

  it('select(id) with shift adds to the selection', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.select('a'));
    act(() => result.current.select('b', true));
    act(() => result.current.select('c', true));
    expect(result.current.selectedRoomIds).toEqual(['a', 'b', 'c']);
  });

  it('select(id) with shift on already-selected id removes it', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.select('a'));
    act(() => result.current.select('b', true));
    act(() => result.current.select('a', true)); // toggle off
    expect(result.current.selectedRoomIds).toEqual(['b']);
  });

  it('select(null) without shift clears the selection', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.select('a'));
    act(() => result.current.select(null));
    expect(result.current.selectedRoomIds).toEqual([]);
  });

  it('select(null) with shift is a no-op', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.select('a'));
    act(() => result.current.select(null, true));
    expect(result.current.selectedRoomIds).toEqual(['a']);
  });

  it('clear() empties the selection', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.select('a'));
    act(() => result.current.select('b', true));
    act(() => result.current.clear());
    expect(result.current.selectedRoomIds).toEqual([]);
  });
});
