import { useState, useCallback, useRef, useEffect } from 'react';
import { FloorPlan } from '../types';

const MAX_HISTORY_SIZE = 50;
const AUTO_SAVE_KEY = 'vastuplan_autosave';

function loadAutoSave(): FloorPlan | null {
  try {
    const saved = localStorage.getItem(AUTO_SAVE_KEY);
    if (saved) return JSON.parse(saved) as FloorPlan;
  } catch {
    // ignore
  }
  return null;
}

export function useFloorPlan(initialPlan: FloorPlan) {
  const savedPlan = loadAutoSave();
  const startPlan = savedPlan || initialPlan;

  const [plan, setPlan] = useState<FloorPlan>(startPlan);
  const [history, setHistory] = useState<FloorPlan[]>([startPlan]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Use refs to avoid stale closure issues in nested setState callbacks
  // Update refs via useEffect to avoid errors during render
  const historyIndexRef = useRef(historyIndex);
  const historyRef = useRef(history);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const updatePlan = useCallback((newPlan: FloorPlan | ((prev: FloorPlan) => FloorPlan)) => {
    setPlan((prev) =>
      typeof newPlan === 'function' ? (newPlan as (prev: FloorPlan) => FloorPlan)(prev) : newPlan
    );
  }, []);

  const commitHistory = useCallback(() => {
    setPlan((currentPlan) => {
      const currentIndex = historyIndexRef.current;
      const currentHistory = historyRef.current;
      const lastHistory = currentHistory[currentIndex];
      if (JSON.stringify(lastHistory) === JSON.stringify(currentPlan)) {
        return currentPlan;
      }
      const newHistory = currentHistory.slice(0, currentIndex + 1);
      newHistory.push(currentPlan);

      // Enforce max history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        setHistoryIndex(MAX_HISTORY_SIZE - 1);
      } else {
        setHistoryIndex(newHistory.length - 1);
      }
      setHistory(newHistory);
      return currentPlan;
    });
  }, []);

  const undo = useCallback(() => {
    const currentIndex = historyIndexRef.current;
    const currentHistory = historyRef.current;
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const newPlan = currentHistory[newIndex];
      setPlan(newPlan);
      setHistoryIndex(newIndex);
    }
  }, []);

  const redo = useCallback(() => {
    const currentIndex = historyIndexRef.current;
    const currentHistory = historyRef.current;
    if (currentIndex < currentHistory.length - 1) {
      const newIndex = currentIndex + 1;
      const newPlan = currentHistory[newIndex];
      setPlan(newPlan);
      setHistoryIndex(newIndex);
    }
  }, []);

  const resetPlan = useCallback((newPlan: FloorPlan) => {
    setPlan(newPlan);
    setHistory([newPlan]);
    setHistoryIndex(0);
    try {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(newPlan));
    } catch {
      // ignore
    }
  }, []);

  // U-8: replace the current plan but preserve the pre-plan in the
  // undo history so Ctrl+Z can revert an import (or any other
  // bulk-replace flow that wants to remain undoable). Behavior matches
  // `resetPlan` (set the plan, persist to localStorage) but builds
  // the new history as [prePlan, newPlan] with index 1 — Ctrl+Z
  // restores the pre-plan; Ctrl+Y re-applies the new plan.
  const replacePlanPreservingHistory = useCallback((newPlan: FloorPlan) => {
    setPlan((currentPlan) => {
      const prePlan = currentPlan;
      setHistory([prePlan, newPlan]);
      setHistoryIndex(1);
      try {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(newPlan));
      } catch {
        // ignore — same fallback resetPlan uses
      }
      return newPlan;
    });
  }, []);

  // Auto-save plan to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(plan));
    } catch {
      // ignore (e.g. quota exceeded)
    }
  }, [plan]);

  return {
    plan,
    // S-3: setPlan removed from the public API. The hook only exposes
    // `updatePlan` (which accepts a value OR an updater function) plus
    // the history controls. The internal `setPlan` is still used by
    // `undo` / `redo` / `resetPlan` / `commitHistory` /
    // `replacePlanPreservingHistory` — those are the only legitimate
    // non-functional sites, because they already know the exact target
    // value (a history snapshot or a loaded plan).
    updatePlan,
    commitHistory,
    undo,
    redo,
    resetPlan,
    replacePlanPreservingHistory,
    historyIndex,
    historyLength: history.length,
  };
}
