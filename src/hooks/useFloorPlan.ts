import { useState, useCallback, useRef, useEffect } from "react";
import { FloorPlan } from "../types";

const MAX_HISTORY_SIZE = 50;
const AUTO_SAVE_KEY = "vastuplan_autosave";

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

  // Use a ref to avoid stale closure issues in nested setState callbacks
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

  const historyRef = useRef(history);
  historyRef.current = history;

  const updatePlan = useCallback(
    (newPlan: FloorPlan | ((prev: FloorPlan) => FloorPlan)) => {
      setPlan((prev) =>
        typeof newPlan === "function" ? (newPlan as (prev: FloorPlan) => FloorPlan)(prev) : newPlan,
      );
    },
    [],
  );

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
    setPlan,
    updatePlan,
    commitHistory,
    undo,
    redo,
    resetPlan,
    historyIndex,
    historyLength: history.length,
  };
}
