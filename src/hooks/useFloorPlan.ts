import { useState, useCallback } from "react";
import { FloorPlan } from "../types";

export function useFloorPlan(initialPlan: FloorPlan) {
  const [plan, setPlan] = useState<FloorPlan>(initialPlan);
  const [history, setHistory] = useState<FloorPlan[]>([initialPlan]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updatePlan = useCallback(
    (newPlan: FloorPlan | ((prev: FloorPlan) => FloorPlan)) => {
      setPlan((prev) =>
        typeof newPlan === "function" ? newPlan(prev) : newPlan,
      );
    },
    [],
  );

  const commitHistory = useCallback(() => {
    setPlan((currentPlan) => {
      setHistory((prevHistory) => {
        const lastHistory = prevHistory[historyIndex];
        if (JSON.stringify(lastHistory) !== JSON.stringify(currentPlan)) {
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          newHistory.push(currentPlan);
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        }
        return prevHistory;
      });
      return currentPlan;
    });
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPlan(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPlan(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  return {
    plan,
    setPlan,
    updatePlan,
    commitHistory,
    undo,
    redo,
    historyIndex,
    historyLength: history.length,
  };
}
