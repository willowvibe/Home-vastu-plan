import { useCallback, useEffect, useState, type RefObject } from 'react';
import { decompressPlan, decryptPlan, isEncryptedShare } from '../lib/shareLink';
import { v4 as uuidv4 } from 'uuid';
import { AppMode, FloorPlan, Room, RoomCategory, RoomType } from '../types';
import { analyzeFloorPlan } from '../services/gemini';
import { calculateOverallVastuScore } from '../services/vastu';
import { addBreadcrumb, setUser } from '../services/sentry';
import { trackEvent, EVENTS, EVENT_METADATA } from '../services/analytics';
import { useToast } from '../components/Toast';
import { useFloorPlan } from './useFloorPlan';
import { useSelection } from './useSelection';
import { useCollaboration } from './useCollaboration';
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
  generateProtectedShareLink,
  checkPlanSize,
} from '../lib/exports';
import { INITIAL_PLAN, PLAN_TEMPLATES, formatFloorLabel } from '../constants/floorPlanConstants';
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
    commitHistoryUpdate,
    historyIndex,
    historyLength,
  } = useFloorPlan(INITIAL_PLAN);

  const [currentFloor, setCurrentFloor] = useState(0);

  // G-1: multi-user undo across collaboration boundary. Remote edits are
  // committed to local history so they can be undone; local undo/redo can be
  // broadcast to peers via requestUndo / requestRedo.
  const collaboration = useCollaboration(plan, commitHistoryUpdate, {
    onUndoRequest: undo,
    onRedoRequest: redo,
  });

  const {
    selectedRoomIds,
    select: selectRoomRaw,
    clear: clearSelectionRaw,
    replace: replaceSelection,
    selectMany: selectManyRaw,
  } = useSelection();

  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

  // G-11: selecting a room should clear any active comment selection so the
  // right panel shows the relevant properties, not a stale comment card.
  const selectRoom = useCallback(
    (roomId: string | null, isShiftKey: boolean = false) => {
      selectRoomRaw(roomId, isShiftKey);
      setSelectedCommentId(null);
    },
    [selectRoomRaw]
  );

  const selectMany = useCallback(
    (ids: string[], isShiftKey: boolean = false) => {
      selectManyRaw(ids, isShiftKey);
      setSelectedCommentId(null);
    },
    [selectManyRaw]
  );

  const clearSelection = useCallback(() => {
    clearSelectionRaw();
    setSelectedCommentId(null);
  }, [clearSelectionRaw]);

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
  const [showVastuTour, setShowVastuTour] = useState(false);
  const [showPlumbing, setShowPlumbing] = useState(false);
  const [showSunPath, setShowSunPath] = useState(false);
  const [sunDate, setSunDate] = useState(() => new Date());
  const [sunTime, setSunTime] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [snapToGrid, setSnapToGrid] = useState(true);
  const { darkMode } = useTheme();
  const [measuring, setMeasuring] = useState(false);

  const [mobileTab, setMobileTab] = useState<'settings' | 'canvas' | 'properties'>('canvas');

  const [appMode, setAppMode] = useState<AppMode>('edit');
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showPresentationExport, setShowPresentationExport] = useState(false);
  const [showComplianceExport, setShowComplianceExport] = useState(false);
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

  // Load shared plan from URL (plain or password-protected)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedPlan = params.get('plan');
    const mode = params.get('mode') as 'view' | 'comment' | null;

    async function loadShared() {
      if (!sharedPlan) return;
      try {
        if (isEncryptedShare(sharedPlan)) {
          const password = window.prompt(
            'This shared plan is password-protected. Please enter the password:'
          );
          if (!password) {
            showToast('Password required to open protected plan.');
            return;
          }
          const result = await decryptPlan(sharedPlan, password);
          if (!result) {
            showToast('Failed to open protected plan. Password may be incorrect.');
            return;
          }
          replacePlanPreservingHistory(result.plan);
          if (result.analysis) {
            setAnalysis(result.analysis);
          }
          if (mode === 'view' || mode === 'comment') {
            setAppMode(mode);
          }
          showToast(`Shared plan loaded in ${mode} mode.`);
          return;
        }
        const result = decompressPlan(sharedPlan);
        if (result) {
          replacePlanPreservingHistory(result.plan);
          if (result.analysis) {
            setAnalysis(result.analysis);
          }
          if (mode === 'view' || mode === 'comment') {
            setAppMode(mode);
          }
          showToast(`Shared plan loaded in ${mode} mode.`);
        }
      } catch (e) {
        console.error('Failed to load shared plan', e);
        showToast('Failed to load shared plan. The link may be corrupted.');
      } finally {
        if (window.location.search) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }

    loadShared();
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

  const addComment = useCallback(
    (x: number, y: number) => {
      if (appMode !== 'comment') return;
      const newComment = {
        id: uuidv4(),
        text: '',
        x,
        y,
        author: 'Reviewer',
        timestamp: Date.now(),
        floor: currentFloor,
      };
      updatePlan((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), newComment],
      }));
      commitHistory();
      setSelectedCommentId(newComment.id);
      trackEvent(EVENTS.COMMENT_ADDED, {
        props: { floor: currentFloor },
      });
      showToast('Comment pin added', 'success');
    },
    [appMode, currentFloor, updatePlan, commitHistory, showToast]
  );

  const updateComment = useCallback(
    (id: string, updates: Partial<FloorPlan['comments'][number]>) => {
      if (appMode !== 'comment') return;
      updatePlan((prev) => ({
        ...prev,
        comments: (prev.comments || []).map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
    },
    [appMode, updatePlan]
  );

  const deleteComment = useCallback(
    (id: string) => {
      if (appMode !== 'comment') return;
      updatePlan((prev) => ({
        ...prev,
        comments: (prev.comments || []).filter((c) => c.id !== id),
      }));
      commitHistory();
      if (selectedCommentId === id) {
        setSelectedCommentId(null);
      }
      trackEvent(EVENTS.COMMENT_DELETED, {
        props: { floor: currentFloor },
      });
    },
    [appMode, currentFloor, selectedCommentId, updatePlan, commitHistory]
  );

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
    async (mode: 'view' | 'comment', password?: string) => {
      let url: string;
      try {
        url = password
          ? await generateProtectedShareLink(plan, analysis, mode, password)
          : generateShareLink(plan, analysis, mode);
      } catch (error) {
        console.error('Failed to generate share link', error);
        alert(getErrorMessage(error) || 'Failed to generate share link. Plan might be too large.');
        return;
      }
      const result = await copyToClipboardWithFallback(url);
      if (result.ok) {
        trackEvent(mode === 'view' ? EVENTS.SHARE_VIEW_MODE : EVENTS.SHARE_COMMENT_MODE, {
          props: { floor: currentFloor, mode, protected: !!password },
        });
        alert(
          password
            ? `Password-protected share link (${mode} mode) copied to clipboard!`
            : `Share link (${mode} mode) copied to clipboard!`
        );
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
      if (type === 'Staircase') {
        trackEvent(EVENTS.STAIRCASE_ADDED, { props: { roomId } });
      }
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

  const duplicateFloor = useCallback(
    (sourceFloor: number, targetFloor: number) => {
      if (appMode !== 'edit') return;
      if (sourceFloor === targetFloor) return;

      const roomsToCopy = plan.rooms.filter((r) => r.floor === sourceFloor);
      if (roomsToCopy.length === 0) {
        showToast(
          `No rooms on ${formatFloorLabel(sourceFloor, plan.floorNames)} to duplicate`,
          'warning'
        );
        return;
      }

      const targetOffset = { x: 2, y: 2 }; // offset clones so they don't overlap originals if on same view
      const newRooms: Room[] = roomsToCopy.map((room) => ({
        ...room,
        id: uuidv4(),
        floor: targetFloor,
        x: room.x + targetOffset.x,
        y: room.y + targetOffset.y,
        elements: (room.elements || []).map((el) => ({
          ...el,
          id: uuidv4(),
        })),
      }));

      updatePlan((prev) => ({ ...prev, rooms: [...prev.rooms, ...newRooms] }));
      commitHistory();
      setCurrentFloor(targetFloor);
      replaceSelection(newRooms.map((r) => r.id));
      showToast(
        `Duplicated ${roomsToCopy.length} room(s) to ${formatFloorLabel(
          targetFloor,
          plan.floorNames
        )}`,
        'success'
      );
      trackEvent(EVENTS.ROOM_ADDED, {
        props: { source: 'duplicate_floor', count: roomsToCopy.length, targetFloor },
      });
    },
    [
      appMode,
      plan.rooms,
      plan.floorNames,
      updatePlan,
      commitHistory,
      setCurrentFloor,
      replaceSelection,
      showToast,
    ]
  );

  const nudgeSelectedRooms = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (appMode !== 'edit' || selectedRoomIds.length === 0) return;

      const step = 1; // 1 ft per arrow key press
      const dx = direction === 'left' ? -step : direction === 'right' ? step : 0;
      const dy = direction === 'up' ? -step : direction === 'down' ? step : 0;

      const buildableWidth = Math.max(0, plan.plotWidth - plan.setbacks.left - plan.setbacks.right);
      const buildableHeight = Math.max(
        0,
        plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom
      );

      updatePlan((prev) => {
        const updatedRooms = prev.rooms.map((r) => {
          if (!selectedRoomIds.includes(r.id)) return r;
          let nextX = r.x + dx;
          let nextY = r.y + dy;
          // Clamp to buildable area
          nextX = Math.max(
            plan.setbacks.left,
            Math.min(nextX, plan.setbacks.left + buildableWidth - r.w)
          );
          nextY = Math.max(
            plan.setbacks.top,
            Math.min(nextY, plan.setbacks.top + buildableHeight - r.h)
          );
          return { ...r, x: nextX, y: nextY };
        });
        return { ...prev, rooms: updatedRooms };
      });
      commitHistory();
    },
    [
      appMode,
      selectedRoomIds,
      plan.plotWidth,
      plan.plotHeight,
      plan.setbacks,
      updatePlan,
      commitHistory,
    ]
  );

  const handleToggleGrid = useCallback(() => {
    setShowVastuGrid((prev) => {
      const next = !prev;
      trackEvent(EVENTS.VASTU_GRID_TOGGLED, {
        props: { enabled: next },
      });
      return next;
    });
  }, []);

  const handleToggleTour = useCallback(() => {
    setShowVastuTour((prev) => {
      const next = !prev;
      trackEvent(EVENTS.VASTU_TOUR_TOGGLED, { props: { enabled: next } });
      return next;
    });
    setShowVastuGrid(true);
  }, []);

  const handleTogglePlumbing = useCallback(() => {
    setShowPlumbing((prev) => {
      const next = !prev;
      trackEvent(EVENTS.PLUMBING_OVERLAY_TOGGLED, { props: { enabled: next } });
      return next;
    });
  }, []);

  const handleToggleSunPath = useCallback(() => {
    setShowSunPath((prev) => {
      const next = !prev;
      trackEvent(EVENTS.SUN_PATH_TOGGLED, { props: { enabled: next } });
      return next;
    });
  }, []);

  const handleSetSunDate = useCallback((value: string) => {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      setSunDate(parsed);
      trackEvent(EVENTS.SUN_PATH_TIME_CHANGED, { props: { type: 'date', value } });
    }
  }, []);

  const handleSetSunTime = useCallback((value: string) => {
    const [h, m] = value.split(':').map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    setSunTime(Math.max(0, Math.min(1439, h * 60 + m)));
    trackEvent(EVENTS.SUN_PATH_TIME_CHANGED, { props: { type: 'time', value } });
  }, []);

  const handleSetSunNow = useCallback(() => {
    const now = new Date();
    setSunDate(now);
    setSunTime(now.getHours() * 60 + now.getMinutes());
    trackEvent(EVENTS.SUN_PATH_TIME_CHANGED, { props: { type: 'now' } });
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
    onNudge: nudgeSelectedRooms,
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
      confirm(
        `Are you sure you want to clear all rooms on ${formatFloorLabel(
          currentFloor,
          plan.floorNames
        )}?`
      )
    ) {
      updatePlan((prev) => ({
        ...prev,
        rooms: prev.rooms.filter((r) => r.floor !== currentFloor),
      }));
      commitHistory();
      clearSelection();
    }
  }, [currentFloor, plan.floorNames, updatePlan, commitHistory, clearSelection]);

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

    // Comments (G-11)
    selectedCommentId,
    setSelectedCommentId,
    addComment,
    updateComment,
    deleteComment,

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
    showVastuTour,
    setShowVastuTour,
    showPlumbing,
    setShowPlumbing,
    showSunPath,
    setShowSunPath,
    sunDate,
    setSunDate,
    sunTime,
    setSunTime,
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
    showComplianceExport,
    setShowComplianceExport,
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
    duplicateFloor,
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

    // Nudge
    nudgeSelectedRooms,

    // Toggles
    handleToggleGrid,
    handleToggleTour,
    handleTogglePlumbing,
    handleToggleSunPath,
    handleSetSunDate,
    handleSetSunTime,
    handleSetSunNow,
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

    // G-1: collaboration state + undo/redo request helpers
    ...collaboration,
  };
}
