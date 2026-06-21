import { useCallback, useEffect, useState, type RefObject } from 'react';
import LZString from 'lz-string';
import { v4 as uuidv4 } from 'uuid';
import { AppMode, FloorPlan, Room, RoomCategory, RoomType } from '../types';
import { analyzeFloorPlan } from '../services/gemini';
import { calculateOverallVastuScore } from '../services/vastu';
import { addBreadcrumb, setUser } from '../services/sentry';
import { trackEvent, EVENTS, EVENT_METADATA } from '../services/analytics';
import { useToast } from '../components/Toast';
import { useFloorPlan } from './useFloorPlan';
import { useSelection } from './useSelection';
import { useExportWithClearSelection } from './useExportWithClearSelection';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useTheme } from '../contexts/ThemeContext';
import {
  getAnalyzeButtonState,
  getErrorMessage,
  computeInitialRoomPosition,
  copyToClipboardWithFallback,
} from '../utils';
import {
  exportToPNG,
  exportToJSON,
  importJSONFile,
  exportToSVG,
  generateShareLink,
  checkPlanSize,
} from '../lib/exports';
import { INITIAL_PLAN, PLAN_TEMPLATES, formatFloor } from '../constants/floorPlanConstants';
import { DEFAULT_WALL_THICKNESS_IN, INCHES_PER_FOOT } from '../constants/geometry';

export interface UsePlanEditorOptions {
  /** Ref to the DOM node that PNG / PDF export snapshots. Owned by App.tsx. */
  canvasContainerRef: RefObject<HTMLDivElement | null>;
}

export function usePlanEditor({ canvasContainerRef }: UsePlanEditorOptions) {
  const {
    plan,
    updatePlan,
    commitHistory,
    undo,
    redo,
    resetPlan,
    replacePlanPreservingHistory,
    historyIndex,
    historyLength,
  } = useFloorPlan(INITIAL_PLAN);

  const [currentFloor, setCurrentFloor] = useState(0);
  const {
    selectedRoomIds,
    select: selectRoom,
    clear: clearSelection,
    replace: replaceSelection,
    selectMany,
  } = useSelection();

  const { runExport } = useExportWithClearSelection({
    exportFn: async () => {
      if (!canvasContainerRef.current) return;
      await exportToPNG(canvasContainerRef.current, `VastuPlan_Floor_${currentFloor}.png`);
      addBreadcrumb('PNG Exported', 'export', { floor: currentFloor });
    },
    onStaleSelection: clearSelection,
  });

  const [roomSearch, setRoomSearch] = useState('');
  const [roomCategoryFilter, setRoomCategoryFilter] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'design' | 'image'>('design');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [linkSetbacks, setLinkSetbacks] = useState(true);
  const [showVastuGrid, setShowVastuGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const { darkMode } = useTheme();
  const [measuring, setMeasuring] = useState(false);

  const [mobileTab, setMobileTab] = useState<'settings' | 'canvas' | 'properties'>('canvas');

  const [appMode, setAppMode] = useState<AppMode>('edit');
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showPresentationExport, setShowPresentationExport] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem('vastuplan-onboarded') !== 'true';
    } catch {
      return true;
    }
  });

  const { showToast } = useToast();

  // Track dark mode toggle when value changes
  useEffect(() => {
    trackEvent(EVENTS.DARK_MODE_TOGGLED, {
      props: { enabled: darkMode },
    });
  }, [darkMode]);

  // Track onboarding modal open
  useEffect(() => {
    if (showOnboarding) {
      trackEvent(EVENTS.MODAL_OPENED, { props: { modal: 'onboarding' } });
    }
  }, [showOnboarding]);

  // Track plan creation and user activity with Sentry
  useEffect(() => {
    if (appMode !== 'edit') return;
    let userId = localStorage.getItem('vastuplan-user-id');
    if (!userId) {
      userId = `user_${uuidv4()}`;
      localStorage.setItem('vastuplan-user-id', userId);
    }
    setUser(userId);
    addBreadcrumb('App initialized', 'app');
    trackEvent(EVENTS.PLAN_CREATED);
  }, [appMode]);

  // Load shared plan from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedPlan = params.get('plan');
    const mode = params.get('mode') as 'view' | 'comment' | null;

    try {
      if (sharedPlan) {
        const decoded = JSON.parse(LZString.decompressFromEncodedURIComponent(sharedPlan) || '{}');
        if (decoded.rooms) {
          resetPlan(decoded);
          if (decoded.analysis) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAnalysis(decoded.analysis);
          }
          if (mode === 'view' || mode === 'comment') {
            setAppMode(mode);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load shared plan', e);
    } finally {
      if (window.location.search) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On a viewport change to mobile, default the right-sidebar tab to
  // 'properties' so a freshly-added / selected room is visible.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches && selectedRoomIds.length > 0) {
        setMobileTab('properties');
      }
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [selectedRoomIds.length]);

  const addRoom = (type: RoomType, defaultW: number, defaultH: number) => {
    if (appMode !== 'edit') return;
    const { x, y } = computeInitialRoomPosition(plan, plan.rooms, currentFloor);
    const newRoom: Room = {
      id: uuidv4(),
      type,
      x,
      y,
      w: defaultW,
      h: defaultH,
      floor: currentFloor,
      wallThickness: DEFAULT_WALL_THICKNESS_IN,
    };
    updatePlan((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
    commitHistory();
    selectRoom(newRoom.id, false);
    addBreadcrumb(`Room added: ${type}`, 'room', { floor: currentFloor });
    trackEvent(EVENTS.ROOM_ADDED, {
      props: {
        roomType: EVENT_METADATA.roomTypes[type] || type.toLowerCase(),
        floor: currentFloor,
      },
    });
    showToast(`Added ${type} room`, 'success');
  };

  const updateRoom = useCallback(
    (id: string, updates: Partial<Room>) => {
      if (appMode !== 'edit') return;
      updatePlan((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) => {
          if (r.id === id) {
            const updatedRoom = { ...r, ...updates };

            if (
              updates.w !== undefined ||
              updates.h !== undefined ||
              updates.wallThickness !== undefined
            ) {
              const wallFt =
                (updatedRoom.wallThickness || DEFAULT_WALL_THICKNESS_IN) / INCHES_PER_FOOT;
              const innerW = updatedRoom.w - 2 * wallFt;
              const innerH = updatedRoom.h - 2 * wallFt;

              if (updatedRoom.elements) {
                updatedRoom.elements = updatedRoom.elements.map((el) => {
                  const isOpening = el.type === 'Door' || el.type === 'Window';
                  const allowanceX = isOpening ? wallFt : 0;
                  const allowanceY = isOpening ? wallFt : 0;

                  let minX = -allowanceX;
                  let minY = -allowanceY;
                  let maxX = innerW - el.w + allowanceX;
                  let maxY = innerH - el.h + allowanceY;

                  if (el.rotation % 180 !== 0) {
                    minX = -allowanceX + (el.h - el.w) / 2;
                    maxX = innerW - (el.w + el.h) / 2 + allowanceX;
                    minY = -allowanceY + (el.w - el.h) / 2;
                    maxY = innerH - (el.h + el.w) / 2 + allowanceY;
                  }

                  return {
                    ...el,
                    x: Math.max(minX, Math.min(el.x, maxX)),
                    y: Math.max(minY, Math.min(el.y, maxY)),
                  };
                });
              }
            }
            return updatedRoom;
          }
          return r;
        }),
      }));
    },
    [appMode, updatePlan]
  );

  const deleteRoom = useCallback(
    (id: string) => {
      if (appMode !== 'edit') return;
      const room = plan.rooms.find((r) => r.id === id);
      if (!room) {
        commitHistory();
        clearSelection();
        return;
      }
      updatePlan((prev) => ({
        ...prev,
        rooms: prev.rooms.filter((r) => r.id !== id),
      }));
      commitHistory();
      clearSelection();
      trackEvent(EVENTS.ROOM_DELETED, {
        props: {
          roomType: EVENT_METADATA.roomTypes[room.type] || room.type.toLowerCase(),
          floor: room.floor,
        },
      });
    },
    [plan.rooms, updatePlan, commitHistory, appMode, clearSelection]
  );

  const deleteSelectedRooms = useCallback(() => {
    if (appMode !== 'edit') return;
    updatePlan((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => !selectedRoomIds.includes(r.id)),
    }));
    commitHistory();
    clearSelection();
    selectedRoomIds.forEach((id) => {
      const room = plan.rooms.find((r) => r.id === id);
      if (room) {
        trackEvent(EVENTS.ROOM_DELETED, {
          props: {
            roomType: EVENT_METADATA.roomTypes[room.type] || room.type.toLowerCase(),
            floor: room.floor,
          },
        });
      }
    });
  }, [plan.rooms, updatePlan, commitHistory, selectedRoomIds, appMode, clearSelection]);

  const duplicateRoom = useCallback(
    (id: string) => {
      if (appMode !== 'edit') return;
      const roomToCopy = plan.rooms.find((r) => r.id === id);
      if (!roomToCopy) return;

      const newRoom: Room = {
        ...roomToCopy,
        id: uuidv4(),
        x: roomToCopy.x + 2,
        y: roomToCopy.y + 2,
        elements: (roomToCopy.elements || []).map((el) => ({
          ...el,
          id: uuidv4(),
        })),
      };

      updatePlan((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
      commitHistory();
      selectRoom(newRoom.id, false);
    },
    [plan.rooms, updatePlan, commitHistory, appMode, selectRoom]
  );

  const duplicateSelectedRooms = useCallback(() => {
    if (appMode !== 'edit') return;
    const newRooms: Room[] = [];
    selectedRoomIds.forEach((id) => {
      const roomToCopy = plan.rooms.find((r) => r.id === id);
      if (!roomToCopy) return;
      newRooms.push({
        ...roomToCopy,
        id: uuidv4(),
        x: roomToCopy.x + 2,
        y: roomToCopy.y + 2,
        elements: (roomToCopy.elements || []).map((el) => ({
          ...el,
          id: uuidv4(),
        })),
      });
    });
    if (newRooms.length === 0) return;
    updatePlan((prev) => ({ ...prev, rooms: [...prev.rooms, ...newRooms] }));
    commitHistory();
    replaceSelection(newRooms.map((r) => r.id));
  }, [plan.rooms, updatePlan, commitHistory, selectedRoomIds, appMode, replaceSelection]);

  const rotateRoom = useCallback(
    (id: string) => {
      if (appMode !== 'edit') return;
      const room = plan.rooms.find((r) => r.id === id);
      if (room) {
        updateRoom(id, { w: room.h, h: room.w });
        commitHistory();
      }
    },
    [appMode, plan.rooms, updateRoom, commitHistory]
  );

  const rotateSelectedRooms = useCallback(() => {
    if (appMode !== 'edit') return;
    selectedRoomIds.forEach((id) => {
      const room = plan.rooms.find((r) => r.id === id);
      if (room) {
        updateRoom(id, { w: room.h, h: room.w });
      }
    });
    commitHistory();
  }, [appMode, selectedRoomIds, plan.rooms, updateRoom, commitHistory]);

  const updateLayers = useCallback(
    (newLayers: FloorPlan['layers']) => {
      updatePlan((prev) => ({
        ...prev,
        layers: newLayers,
      }));
    },
    [updatePlan]
  );

  const handleAnalyze = useCallback(async () => {
    if (appMode !== 'edit') return;
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    trackEvent(EVENTS.AI_ANALYZED, {
      props: {
        floor: currentFloor,
        roomCount: plan.rooms.filter((r) => r.floor === currentFloor).length,
      },
    });
    try {
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await analyzeFloorPlan(plan, currentFloor);
      setAnalysis(result);
      setAnalysisProgress(100);
      setTimeout(() => {
        setAnalysisProgress(0);
      }, 2000);
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error);
      alert(message || 'Failed to analyze floor plan.');
      setAnalysisProgress(0);
    } finally {
      setIsAnalyzing(false);
    }
  }, [appMode, currentFloor, plan]);

  const handleExport = useCallback(async () => {
    if (!canvasContainerRef.current) return;
    setIsExporting(true);
    const prevSelected = selectedRoomIds.length > 0 ? selectedRoomIds[0] : null;
    try {
      await runExport({
        prevSelectedId: prevSelected,
        setSelectedRoomIds: (ids) => {
          if (ids.length === 0) {
            clearSelection();
          } else {
            selectRoom(ids[0], false);
          }
        },
        isRoomStillPresent: (id) => plan.rooms.some((r) => r.id === id),
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export floor plan.');
    } finally {
      setIsExporting(false);
    }
  }, [canvasContainerRef, runExport, selectedRoomIds, clearSelection, selectRoom, plan.rooms]);

  const handleShare = useCallback(
    async (mode: 'view' | 'comment') => {
      let url: string;
      try {
        url = generateShareLink(plan, analysis, mode);
      } catch (error) {
        console.error('Failed to generate share link', error);
        alert(getErrorMessage(error) || 'Failed to generate share link. Plan might be too large.');
        return;
      }
      const result = await copyToClipboardWithFallback(url);
      if (result.ok) {
        trackEvent(mode === 'view' ? EVENTS.SHARE_VIEW_MODE : EVENTS.SHARE_COMMENT_MODE, {
          props: { floor: currentFloor, mode },
        });
        alert(`Share link (${mode} mode) copied to clipboard!`);
      } else {
        alert(`Couldn't copy the link. Here's the URL: ${url}`);
      }
    },
    [plan, analysis, currentFloor]
  );

  const handleExportJSON = useCallback(() => {
    try {
      exportToJSON(plan, `VastuPlan_Floor_${currentFloor}.json`, analysis);
    } catch (error) {
      console.error('Failed to export JSON', error);
      alert(getErrorMessage(error) || 'Failed to export floor plan as JSON.');
    }
  }, [plan, currentFloor, analysis]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await importJSONFile(file);
        if (result) {
          replacePlanPreservingHistory(result.plan);
          if (result.analysis) {
            setAnalysis(result.analysis);
          }
          alert('Floor plan imported successfully!');
        } else {
          alert('Invalid floor plan format.');
        }
      } catch (error) {
        console.error('Failed to import JSON', error);
        alert(getErrorMessage(error) || 'Failed to import floor plan. Invalid JSON format.');
      }
    };
    input.click();
  }, [replacePlanPreservingHistory]);

  const handlePrint = useCallback(() => {
    const { sizeKB, isLarge } = checkPlanSize(plan, analysis);
    if (isLarge) {
      const confirmPrint = confirm(
        `Your plan is large (${sizeKB} KB). Printing may take time. Do you want to continue?`
      );
      if (!confirmPrint) return;
    }
    const printContent = document.querySelector('.print-area');
    if (printContent) {
      window.print();
      trackEvent(EVENTS.EXPORT_PNG, { props: { format: 'print' } });
    }
  }, [plan, analysis]);

  const handleExportSVG = useCallback(() => {
    try {
      exportToSVG(plan, currentFloor, showVastuGrid);
      addBreadcrumb('SVG Exported', 'export', { floor: currentFloor });
      trackEvent(EVENTS.EXPORT_SVG, { props: { floor: currentFloor } });
    } catch (error) {
      console.error('Failed to export SVG', error);
      alert('Failed to export floor plan as SVG.');
    }
  }, [plan, currentFloor, showVastuGrid]);

  const handleSetbackChange = useCallback(
    (key: keyof FloorPlan['setbacks'], value: number) => {
      updatePlan((p) => {
        const newSetbacks = { ...p.setbacks };
        if (linkSetbacks) {
          newSetbacks.top = value;
          newSetbacks.right = value;
          newSetbacks.bottom = value;
          newSetbacks.left = value;
        } else {
          newSetbacks[key] = value;
        }
        return { ...p, setbacks: newSetbacks };
      });
      commitHistory();
    },
    [linkSetbacks, updatePlan, commitHistory]
  );

  const addRoomElement = useCallback(
    (roomId: string, type: string, w: number, h: number) => {
      updatePlan((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) => {
          if (r.id === roomId) {
            const wallFt = (r.wallThickness || DEFAULT_WALL_THICKNESS_IN) / INCHES_PER_FOOT;
            const innerW = r.w - 2 * wallFt;
            const innerH = r.h - 2 * wallFt;
            const centerX = Math.max(0, (innerW - w) / 2);
            const centerY = Math.max(0, (innerH - h) / 2);

            return {
              ...r,
              elements: [
                ...(r.elements || []),
                { id: uuidv4(), type, x: centerX, y: centerY, w, h, rotation: 0 },
              ],
            };
          }
          return r;
        }),
      }));
      commitHistory();
    },
    [updatePlan, commitHistory]
  );

  const handleDelete = useCallback(() => {
    if (selectedRoomIds.length > 1) {
      deleteSelectedRooms();
    } else if (selectedRoomIds.length === 1) {
      deleteRoom(selectedRoomIds[0]);
    }
  }, [selectedRoomIds, deleteRoom, deleteSelectedRooms]);

  const handleDuplicate = useCallback(() => {
    if (selectedRoomIds.length > 1) {
      duplicateSelectedRooms();
    } else if (selectedRoomIds.length === 1) {
      duplicateRoom(selectedRoomIds[0]);
    }
  }, [selectedRoomIds, duplicateRoom, duplicateSelectedRooms]);

  const handleToggleGrid = useCallback(() => {
    setShowVastuGrid((prev) => {
      const next = !prev;
      trackEvent(EVENTS.VASTU_GRID_TOGGLED, {
        props: { enabled: next },
      });
      return next;
    });
  }, []);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(3, z + 0.1)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(0.1, z - 0.1)), []);
  const handleShowShortcuts = useCallback(() => {
    trackEvent(EVENTS.MODAL_OPENED, { props: { modal: 'shortcuts' } });
    setShowShortcutHelp(true);
  }, []);

  useKeyboardShortcuts({
    undo,
    redo,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onRotate: rotateSelectedRooms,
    onToggleGrid: handleToggleGrid,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onShowShortcuts: handleShowShortcuts,
    hasSelection: selectedRoomIds.length > 0,
    appMode,
  });

  const totalArea = plan.plotWidth * plan.plotHeight;
  const buildableWidth = Math.max(0, plan.plotWidth - plan.setbacks.left - plan.setbacks.right);
  const buildableHeight = Math.max(0, plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom);
  const buildableArea = buildableWidth * buildableHeight;
  const builtUpArea = plan.rooms
    .filter((r) => r.floor === currentFloor)
    .reduce((acc, r) => acc + r.w * r.h, 0);
  const vastuScore = calculateOverallVastuScore(plan);
  const analyzeBtn = getAnalyzeButtonState({
    isAnalyzing,
    hasApiKey: Boolean(import.meta.env.VITE_GEMINI_API_KEY),
    hasRoomsOnCurrentFloor: plan.rooms.filter((r) => r.floor === currentFloor).length > 0,
  });

  const updateRoomCategory = useCallback(
    (roomId: string, category: RoomCategory | undefined) => updateRoom(roomId, { category }),
    [updateRoom]
  );

  const handleSelectTemplate = useCallback(
    (templateName: string) => {
      const template = PLAN_TEMPLATES[templateName];
      if (template) {
        resetPlan(template);
      }
    },
    [resetPlan]
  );

  const handleClearFloor = useCallback(() => {
    if (
      confirm(`Are you sure you want to clear all rooms on ${formatFloor(currentFloor)} floor?`)
    ) {
      updatePlan((prev) => ({
        ...prev,
        rooms: prev.rooms.filter((r) => r.floor !== currentFloor),
      }));
      commitHistory();
      clearSelection();
    }
  }, [currentFloor, updatePlan, commitHistory, clearSelection]);

  return {
    // Plan + history
    plan,
    updatePlan,
    commitHistory,
    undo,
    redo,
    resetPlan,
    replacePlanPreservingHistory,
    historyIndex,
    historyLength,

    // Floor
    currentFloor,
    setCurrentFloor,

    // Selection
    selectedRoomIds,
    selectRoom,
    selectMany,
    clearSelection,
    replaceSelection,

    // UI state
    activeTab,
    setActiveTab,
    mobileTab,
    setMobileTab,
    appMode,
    setAppMode,
    zoom,
    setZoom,
    showVastuGrid,
    setShowVastuGrid,
    snapToGrid,
    setSnapToGrid,
    measuring,
    setMeasuring,
    linkSetbacks,
    setLinkSetbacks,

    // Analysis
    analysis,
    setAnalysis,
    isAnalyzing,
    setIsAnalyzing,
    analysisProgress,
    setAnalysisProgress,

    // Exporting
    isExporting,
    setIsExporting,

    // Modals
    showProjectManager,
    setShowProjectManager,
    showPresentationExport,
    setShowPresentationExport,
    showShortcutHelp,
    setShowShortcutHelp,
    showOnboarding,
    setShowOnboarding,

    // Room handlers
    addRoom,
    updateRoom,
    deleteRoom,
    deleteSelectedRooms,
    duplicateRoom,
    duplicateSelectedRooms,
    rotateRoom,
    rotateSelectedRooms,
    addRoomElement,
    updateRoomCategory,

    // Plan handlers
    updateLayers,
    handleSetbackChange,
    handleClearFloor,
    handleSelectTemplate,

    // Import / export / share / analyze
    handleAnalyze,
    handleExport,
    handleShare,
    handleExportJSON,
    handleImportJSON,
    handlePrint,
    handleExportSVG,

    // Selection action wrappers
    handleDelete,
    handleDuplicate,

    // Toggles
    handleToggleGrid,
    handleZoomIn,
    handleZoomOut,
    handleShowShortcuts,

    // Derived metrics
    totalArea,
    buildableWidth,
    buildableHeight,
    buildableArea,
    builtUpArea,
    vastuScore,
    analyzeBtn,

    // Room filters
    roomSearch,
    setRoomSearch,
    roomCategoryFilter,
    setRoomCategoryFilter,
  };
}
