import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Canvas } from './components/Canvas';
import { ImageEditor } from './components/ImageEditor';
import { FloorPlan, Room, RoomType, AppMode } from './types';
import { analyzeFloorPlan } from './services/gemini';
import { analyzeRoomVastu, calculateOverallVastuScore } from './services/vastu';
import { setUser, addBreadcrumb } from './services/sentry';
import { trackEvent, EVENTS, EVENT_METADATA } from './services/analytics';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useToast } from './components/Toast';
import {
  Layers,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Info,
  RotateCw,
  Compass,
  Map,
  Ruler,
  Download,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Unlink,
  ZoomIn,
  ZoomOut,
  Grid,
  FolderOpen,
  Share2,
  FileText,
  Copy,
  Search,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import LZString from 'lz-string';
import { ProjectManager } from './components/ProjectManager';
import { PresentationExport } from './components/PresentationExport';
import { Header } from './components/layout/Header';
import { ShortcutHelp } from './components/ShortcutHelp';
import { Onboarding } from './components/Onboarding';
import { LayerManager } from './components/LayerManager';
import { useFloorPlan } from './hooks/useFloorPlan';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  exportToPNG,
  exportToJSON,
  importJSONFile,
  exportToSVG,
  generateShareLink,
  checkPlanSize,
} from './lib/exports';
import {
  ROOM_TYPES,
  INITIAL_PLAN,
  PLAN_TEMPLATES,
  ROOM_ELEMENTS,
  COMMON_ELEMENTS,
  ROOM_CATEGORIES,
} from './constants/floorPlanConstants';

export default function App() {
  const {
    plan,
    setPlan,
    updatePlan,
    commitHistory,
    undo,
    redo,
    resetPlan,
    historyIndex,
    historyLength,
  } = useFloorPlan(INITIAL_PLAN);

  const [currentFloor, setCurrentFloor] = useState(0);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
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
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('vastuplan-darkmode') === 'true';
    } catch {
      return false;
    }
  });
  const [measuring, setMeasuring] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('vastuplan-darkmode', String(darkMode));
    } catch {
      // ignore
    }
  }, [darkMode]);

  useEffect(() => {
    // Track dark mode toggle when value changes
    trackEvent(EVENTS.DARK_MODE_TOGGLED, {
      props: { enabled: darkMode },
    });
  }, [darkMode]);

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

  // Track onboarding modal open
  useEffect(() => {
    if (showOnboarding) {
      trackEvent(EVENTS.MODAL_OPENED, { props: { modal: 'onboarding' } });
    }
  }, [showOnboarding]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // T10: real toast helper (S-10). The old (window as any).showToast?.()
  // was a silent no-op.
  const { showToast } = useToast();

  // Track plan creation and user activity with Sentry
  useEffect(() => {
    // B-5: skip Sentry init / analytics in non-edit modes. The dep array
    // is [appMode] (not []) so a mode change re-evaluates the gate.
    if (appMode !== 'edit') return;
    // Generate a unique user ID from localStorage or create one
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
    const mode = params.get('mode') as 'view' | 'comment';

    try {
      if (sharedPlan) {
        const decoded = JSON.parse(LZString.decompressFromEncodedURIComponent(sharedPlan) || '{}');
        if (decoded.rooms) {
          resetPlan(decoded);
          // Note: setAnalysis called synchronously here to populate analysis
          // from the shared plan immediately after loading
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
      // B-10: always strip the query string so a refresh loads from
      // localStorage, not from the shared plan. Without this, the user's
      // edits are silently reverted on the next refresh.
      if (window.location.search) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectRoom = useCallback((roomId: string | null, isShiftKey: boolean = false) => {
    if (roomId === null) {
      if (!isShiftKey) setSelectedRoomIds([]);
      return;
    }
    if (isShiftKey) {
      setSelectedRoomIds((prev) =>
        prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
      );
    } else {
      setSelectedRoomIds([roomId]);
    }
  }, []);

  const addRoom = (type: RoomType, defaultW: number, defaultH: number) => {
    if (appMode !== 'edit') return;
    const newRoom: Room = {
      id: uuidv4(),
      type,
      x: plan.setbacks.left,
      y: plan.setbacks.top,
      w: defaultW,
      h: defaultH,
      floor: currentFloor,
      wallThickness: 9, // Default 9 inches
    };
    updatePlan((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
    commitHistory();
    setSelectedRoomIds([newRoom.id]);
    // Sentry breadcrumb for room addition
    addBreadcrumb(`Room added: ${type}`, 'room', { floor: currentFloor });
    // Track room addition event
    trackEvent(EVENTS.ROOM_ADDED, {
      props: {
        roomType: EVENT_METADATA.roomTypes[type] || type.toLowerCase(),
        floor: currentFloor,
      },
    });
    // Show toast notification
    showToast(`Added ${type} room`, 'success');
  };

  const updateRoom = (id: string, updates: Partial<Room>) => {
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
            const wallFt = (updatedRoom.wallThickness || 9) / 12;
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
  };

  const deleteRoom = useCallback(
    (id: string) => {
      if (appMode !== 'edit') return;
      const room = plan.rooms.find((r) => r.id === id);
      if (!room) {
        commitHistory();
        setSelectedRoomIds([]);
        return;
      }
      updatePlan((prev) => ({
        ...prev,
        rooms: prev.rooms.filter((r) => r.id !== id),
      }));
      commitHistory();
      setSelectedRoomIds([]);
      // Track room deletion
      trackEvent(EVENTS.ROOM_DELETED, {
        props: {
          roomType: EVENT_METADATA.roomTypes[room.type] || room.type.toLowerCase(),
          floor: room.floor,
        },
      });
    },
    [plan.rooms, updatePlan, commitHistory, appMode]
  );

  const deleteSelectedRooms = useCallback(() => {
    if (appMode !== 'edit') return;
    updatePlan((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => !selectedRoomIds.includes(r.id)),
    }));
    commitHistory();
    setSelectedRoomIds([]);
    // Track room deletion for each deleted room
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
  }, [plan.rooms, updatePlan, commitHistory, selectedRoomIds, appMode]);

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
      setSelectedRoomIds([newRoom.id]);
    },
    [plan.rooms, updatePlan, commitHistory, appMode]
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
    setSelectedRoomIds(newRooms.map((r) => r.id));
  }, [plan.rooms, updatePlan, commitHistory, selectedRoomIds, appMode]);

  const rotateRoom = (id: string) => {
    if (appMode !== 'edit') return;
    const room = plan.rooms.find((r) => r.id === id);
    if (room) {
      updateRoom(id, { w: room.h, h: room.w });
      commitHistory();
    }
  };

  const rotateSelectedRooms = () => {
    if (appMode !== 'edit') return;
    selectedRoomIds.forEach((id) => {
      const room = plan.rooms.find((r) => r.id === id);
      if (room) {
        updateRoom(id, { w: room.h, h: room.w });
      }
    });
    commitHistory();
  };

  const updateLayers = (newLayers: typeof plan.layers) => {
    updatePlan((prev) => ({
      ...prev,
      layers: newLayers,
    }));
  };

  const handleAnalyze = async () => {
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
      alert('Failed to analyze floor plan.');
      setAnalysisProgress(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = async () => {
    if (!canvasContainerRef.current) return;
    setIsExporting(true);

    const prevSelected = selectedRoomIds.length > 0 ? selectedRoomIds[0] : null;
    setSelectedRoomIds([]);

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      await exportToPNG(canvasContainerRef.current, `VastuPlan_Floor_${currentFloor}.png`);
      addBreadcrumb('PNG Exported', 'export', { floor: currentFloor });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export floor plan.');
    } finally {
      if (prevSelected) setSelectedRoomIds([prevSelected]);
      setIsExporting(false);
    }
  };

  const handleShare = (mode: 'view' | 'comment') => {
    try {
      const url = generateShareLink(plan, analysis, mode);
      navigator.clipboard.writeText(url);
      trackEvent(mode === 'view' ? EVENTS.SHARE_VIEW_MODE : EVENTS.SHARE_COMMENT_MODE, {
        props: { floor: currentFloor, mode },
      });
      alert(`Share link (${mode} mode) copied to clipboard!`);
    } catch (error: any) {
      console.error('Failed to generate share link', error);
      alert(error.message || 'Failed to generate share link. Plan might be too large.');
    }
  };

  const handleExportJSON = () => {
    try {
      exportToJSON(plan, `VastuPlan_Floor_${currentFloor}.json`, analysis);
    } catch (error: any) {
      console.error('Failed to export JSON', error);
      alert(error.message || 'Failed to export floor plan as JSON.');
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await importJSONFile(file);
        if (result) {
          resetPlan(result.plan);
          if (result.analysis) {
            setAnalysis(result.analysis);
          }
          alert('Floor plan imported successfully!');
        } else {
          alert('Invalid floor plan format.');
        }
      } catch (error: any) {
        console.error('Failed to import JSON', error);
        alert(error.message || 'Failed to import floor plan. Invalid JSON format.');
      }
    };
    input.click();
  };

  const handlePrint = () => {
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
  };

  const handleExportSVG = () => {
    try {
      exportToSVG(plan, currentFloor, showVastuGrid);
      addBreadcrumb('SVG Exported', 'export', { floor: currentFloor });
      trackEvent(EVENTS.EXPORT_SVG, { props: { floor: currentFloor } });
    } catch (error) {
      console.error('Failed to export SVG', error);
      alert('Failed to export floor plan as SVG.');
    }
  };

  const handleSetbackChange = (key: keyof FloorPlan['setbacks'], value: number) => {
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
  };

  const addRoomElement = (roomId: string, type: string, w: number, h: number) => {
    updatePlan((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id === roomId) {
          const wallFt = (r.wallThickness || 9) / 12;
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
  };

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

  const handleToggleGrid = () => {
    setShowVastuGrid((prev) => !prev);
    trackEvent(EVENTS.VASTU_GRID_TOGGLED, {
      props: { enabled: !showVastuGrid },
    });
  };

  useKeyboardShortcuts({
    undo,
    redo,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onRotate: rotateSelectedRooms,
    onToggleGrid: handleToggleGrid,
    onZoomIn: () => setZoom((z) => Math.min(3, z + 0.1)),
    onZoomOut: () => setZoom((z) => Math.max(0.1, z - 0.1)),
    onShowShortcuts: () => {
      trackEvent(EVENTS.MODAL_OPENED, { props: { modal: 'shortcuts' } });
      setShowShortcutHelp(true);
    },
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

  return (
    <div
      className={`min-h-screen flex flex-col font-sans ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* Header */}
      <Header
        plan={plan}
        appMode={appMode}
        setAppMode={setAppMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setShowProjectManager={setShowProjectManager}
        vastuScore={vastuScore}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        setShowShortcutHelp={() => setShowShortcutHelp(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="md:hidden flex border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={() => setMobileTab('settings')}
            className={`flex-1 py-3 text-sm font-medium ${mobileTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Settings
          </button>
          <button
            onClick={() => setMobileTab('canvas')}
            className={`flex-1 py-3 text-sm font-medium ${mobileTab === 'canvas' ? 'text-indigo-600 border-b-2 border-indigo-600' : darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Canvas
          </button>
          <button
            onClick={() => setMobileTab('properties')}
            className={`flex-1 py-3 text-sm font-medium ${mobileTab === 'properties' ? 'text-indigo-600 border-b-2 border-indigo-600' : darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Properties
          </button>
        </div>

        {activeTab === 'design' ? (
          <>
            {/* Left Sidebar */}
            <div
              className={`w-full md:w-72 flex-col overflow-y-auto shrink-0 custom-scrollbar ${mobileTab === 'settings' ? 'flex' : 'hidden md:flex'} ${appMode !== 'edit' ? 'opacity-50 pointer-events-none' : ''} ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className={`p-5 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <h3
                  className={`text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}
                >
                  <Map className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />{' '}
                  Plot Settings
                </h3>

                <div className="mb-4">
                  <label className="text-xs text-slate-500 mb-1 block">Plan Template</label>
                  <select
                    onChange={(e) => {
                      const template = PLAN_TEMPLATES[e.target.value];
                      if (template) {
                        resetPlan(template);
                      }
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select Template...</option>
                    <option value="Small Apartment">Small Apartment (25x35 ft)</option>
                    <option value="Medium House">Medium House (35x45 ft)</option>
                    <option value="Large Villa">Large Villa (45x60 ft)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label
                      className={`text-xs mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      Width (ft)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={plan.plotWidth}
                      onChange={(e) => {
                        const val = Math.max(5, Math.min(500, Number(e.target.value) || 10));
                        updatePlan((p) => ({
                          ...p,
                          plotWidth: val,
                        }));
                        commitHistory();
                      }}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                    />
                  </div>
                  <div>
                    <label
                      className={`text-xs mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      Length (ft)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={plan.plotHeight}
                      onChange={(e) => {
                        const val = Math.max(5, Math.min(500, Number(e.target.value) || 10));
                        updatePlan((p) => ({
                          ...p,
                          plotHeight: val,
                        }));
                        commitHistory();
                      }}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                    <span>North Direction (Angle)</span>
                    <span className="font-mono">{plan.northAngle}°</span>
                  </label>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <label className="text-xs text-slate-600 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={(e) => setSnapToGrid(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Snap to Grid
                  </label>
                  <span className="text-xs text-slate-400">{snapToGrid ? 'On' : 'Off'}</span>
                </div>

                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max="359"
                    value={plan.northAngle}
                    onChange={(e) =>
                      updatePlan((p) => ({
                        ...p,
                        northAngle: Number(e.target.value),
                      }))
                    }
                    onMouseUp={commitHistory}
                    onTouchEnd={commitHistory}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Up (0°)</span>
                    <span>Right (90°)</span>
                    <span>Down (180°)</span>
                    <span>Left (270°)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Road Facing</label>
                    <select
                      value={plan.roadDirection}
                      onChange={(e) => {
                        updatePlan((p) => ({
                          ...p,
                          roadDirection: e.target.value as any,
                        }));
                        commitHistory();
                      }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="N">North</option>
                      <option value="E">East</option>
                      <option value="S">South</option>
                      <option value="W">West</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Display Unit</label>
                    <select
                      value={plan.unit}
                      onChange={(e) => {
                        updatePlan((p) => ({
                          ...p,
                          unit: e.target.value as any,
                        }));
                        commitHistory();
                      }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="ft">Feet (ft)</option>
                      <option value="m">Meters (m)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs text-slate-500 mb-2 flex items-center justify-between">
                    <span>Setbacks (ft)</span>
                    <button
                      onClick={() => setLinkSetbacks(!linkSetbacks)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                      title={linkSetbacks ? 'Unlink setbacks' : 'Link setbacks'}
                    >
                      {linkSetbacks ? (
                        <LinkIcon className="w-3.5 h-3.5" />
                      ) : (
                        <Unlink className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block text-center mb-1">
                        Top
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={plan.plotHeight}
                        value={plan.setbacks.top}
                        onChange={(e) =>
                          handleSetbackChange(
                            'top',
                            Math.max(0, Math.min(plan.plotHeight, Number(e.target.value) || 0))
                          )
                        }
                        className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block text-center mb-1">
                        Right
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={plan.plotWidth}
                        value={plan.setbacks.right}
                        onChange={(e) =>
                          handleSetbackChange(
                            'right',
                            Math.max(0, Math.min(plan.plotWidth, Number(e.target.value) || 0))
                          )
                        }
                        className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block text-center mb-1">
                        Bottom
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={plan.plotHeight}
                        value={plan.setbacks.bottom}
                        onChange={(e) =>
                          handleSetbackChange(
                            'bottom',
                            Math.max(0, Math.min(plan.plotHeight, Number(e.target.value) || 0))
                          )
                        }
                        className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block text-center mb-1">
                        Left
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={plan.plotWidth}
                        value={plan.setbacks.left}
                        onChange={(e) =>
                          handleSetbackChange(
                            'left',
                            Math.max(0, Math.min(plan.plotWidth, Number(e.target.value) || 0))
                          )
                        }
                        className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-4 p-3 rounded-lg border flex flex-col gap-2 text-xs ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Plot Area:
                    </span>
                    <strong className={`${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {totalArea} sq ft
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Buildable Area:
                    </span>
                    <strong className="text-emerald-700">{buildableArea} sq ft</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Built-up (Floor {currentFloor}):
                    </span>
                    <strong className={`${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                      {builtUpArea} sq ft
                    </strong>
                  </div>
                  {(() => {
                    const totalBuiltUpArea = Math.round(
                      plan.rooms.reduce((sum, r) => sum + r.w * r.h, 0)
                    );
                    const estCost = (totalBuiltUpArea * 2000).toLocaleString('en-IN');
                    return (
                      <>
                        <div className="w-full h-px bg-slate-200 my-1"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Total Built-up (All Floors):</span>
                          <strong className="text-indigo-900">{totalBuiltUpArea} sq ft</strong>
                        </div>
                        <div className="flex justify-between items-center bg-indigo-50 p-1.5 -mx-1.5 rounded-md">
                          <span className="text-indigo-700 font-medium tracking-tight">
                            Est. Core Cost:
                          </span>
                          <strong className="text-indigo-700">₹ {estCost}</strong>
                        </div>
                        <div className="text-[9px] text-slate-400 text-right -mt-1">
                          *Assumes avg structure cost of ₹2000/sq.ft
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 mt-4">
                <h4 className="text-xs text-slate-600 mb-3 uppercase tracking-wider">
                  Data Management
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleImportJSON}
                    className="flex-1 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <FolderOpen className="w-3 h-3" /> Import JSON
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="flex-1 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Export JSON
                  </button>
                </div>
              </div>

              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" /> Floor
                </h3>
                <div className="flex gap-2">
                  {[0, 1, 2].map((floor) => (
                    <button
                      key={floor}
                      onClick={() => setCurrentFloor(floor)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${currentFloor === floor ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {floor === 0 ? 'Ground' : floor === 1 ? 'First' : 'Second'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Are you sure you want to clear all rooms on ${currentFloor === 0 ? 'Ground' : currentFloor === 1 ? 'First' : 'Second'} floor?`
                      )
                    ) {
                      const newRooms = plan.rooms.filter((r) => r.floor !== currentFloor);
                      setPlan({ ...plan, rooms: newRooms });
                      commitHistory();
                      setSelectedRoomIds([]);
                    }
                  }}
                  className="w-full mt-2 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear Floor
                </button>
              </div>

              <LayerManager
                layers={plan.layers || []}
                onUpdateLayers={updateLayers}
                darkMode={darkMode}
                rooms={plan.rooms}
                currentFloor={currentFloor}
              />

              <div className="p-5 flex-1">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-slate-400" /> Add Rooms
                </h3>

                {/* Room Tag Filter */}
                <div className="mb-4">
                  <label className="text-xs text-slate-500 mb-2 block">Category Filter</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setRoomCategoryFilter(null)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        roomCategoryFilter === null
                          ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      All
                    </button>
                    {[
                      { id: 'Living', label: 'Living' },
                      { id: 'Sleeping', label: 'Sleeping' },
                      { id: 'Kitchen', label: 'Kitchen' },
                      { id: 'Bathroom', label: 'Bath' },
                      { id: 'Special', label: 'Special' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setRoomCategoryFilter(cat.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                          roomCategoryFilter === cat.id
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Room Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search room types..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    className={`w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                  />
                </div>

                {/* Room Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {ROOM_TYPES.filter((rt) => {
                    // Search filter
                    if (roomSearch && !rt.type.toLowerCase().includes(roomSearch.toLowerCase())) {
                      return false;
                    }
                    // Category filter
                    if (roomCategoryFilter) {
                      const roomCategory = ROOM_CATEGORIES[rt.type];
                      if (roomCategory !== roomCategoryFilter) {
                        return false;
                      }
                    }
                    return true;
                  }).map((rt) => (
                    <button
                      key={rt.type}
                      onClick={() => addRoom(rt.type, rt.w, rt.h)}
                      className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                    >
                      <span className="text-xs font-medium text-slate-700 text-center">
                        {rt.type}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {rt.w}'x{rt.h}'
                      </span>
                    </button>
                  ))}
                </div>
                {ROOM_TYPES.filter((rt) => {
                  if (roomSearch && !rt.type.toLowerCase().includes(roomSearch.toLowerCase())) {
                    return false;
                  }
                  if (roomCategoryFilter) {
                    const roomCategory = ROOM_CATEGORIES[rt.type];
                    if (roomCategory !== roomCategoryFilter) {
                      return false;
                    }
                  }
                  return true;
                }).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">
                    No rooms match your search.
                  </p>
                )}
              </div>
            </div>

            {/* Center Canvas */}
            <div
              className={`flex-1 overflow-auto p-4 md:p-8 flex-col items-center relative ${mobileTab === 'canvas' ? 'flex' : 'hidden md:flex'} ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}
            >
              <div className="w-full flex flex-wrap justify-between gap-2 mb-4 max-w-4xl">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowVastuGrid(!showVastuGrid)}
                    className={`flex items-center justify-center w-10 h-10 border rounded-lg shadow-sm transition-colors ${showVastuGrid ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : darkMode ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                    title="Toggle Vastu Grid"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={undo}
                    disabled={historyIndex === 0}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex === historyLength - 1}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <div className="flex items-center justify-center px-2 text-xs font-mono text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm">
                    {Math.round(zoom * 100)}%
                  </div>
                  <button
                    onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleShare('view')}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors"
                    title="Share View-Only Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowPresentationExport(true)}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">PDF Export</span>
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">PNG</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors ${darkMode ? 'bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">JSON Export</span>
                  </button>
                  <button
                    onClick={() => setMeasuring(true)}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                  >
                    <Ruler className="w-4 h-4" />
                    <span className="hidden sm:inline">Ruler</span>
                  </button>
                  <button
                    onClick={handleExportSVG}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">SVG Export</span>
                  </button>
                </div>
              </div>

              <div
                ref={canvasContainerRef}
                data-testid="canvas-container"
                className={`p-4 rounded-xl shadow-sm border inline-block ${appMode === 'view' ? 'pointer-events-none' : ''} ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
              >
                <Canvas
                  plan={plan}
                  currentFloor={currentFloor}
                  zoom={zoom}
                  showVastuGrid={showVastuGrid}
                  snapToGrid={snapToGrid}
                  measuring={measuring}
                  setMeasuring={setMeasuring}
                  onUpdateRoom={updateRoom}
                  onUpdateRoomEnd={commitHistory}
                  onSelectRoom={handleSelectRoom}
                  selectedRoomIds={selectedRoomIds}
                  layers={plan.layers}
                />
              </div>
            </div>

            {/* Print Area (hidden on screen, visible when printing) */}
            <div className="hidden print-area print:block">
              <div className="p-8 bg-white">
                <h1 className="text-2xl font-bold mb-4">VastuPlan Floor Plan</h1>
                <p className="text-sm text-slate-600 mb-4">
                  Floor {currentFloor === 0 ? 'Ground' : `Floor ${currentFloor}`} -{' '}
                  {new Date().toLocaleDateString()}
                </p>
                <div className="print-only" ref={canvasContainerRef}>
                  <Canvas
                    plan={plan}
                    currentFloor={currentFloor}
                    zoom={zoom}
                    showVastuGrid={showVastuGrid}
                    snapToGrid={snapToGrid}
                    measuring={measuring}
                    setMeasuring={setMeasuring}
                    onUpdateRoom={() => {}}
                    onUpdateRoomEnd={() => {}}
                    onSelectRoom={() => {}}
                    selectedRoomIds={[]}
                    layers={plan.layers}
                  />
                </div>
              </div>
            </div>

            {/* Right Sidebar - Analysis & Properties */}
            <div
              className={`w-full md:w-80 flex-col overflow-hidden shrink-0 ${mobileTab === 'properties' ? 'flex' : 'hidden md:flex'} ${appMode !== 'edit' ? 'opacity-50 pointer-events-none' : ''} ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              {selectedRoomIds.length > 0 ? (
                <div
                  className={`p-5 border-b ${darkMode ? 'border-slate-700 bg-blue-900/20' : 'border-slate-100 bg-blue-50/50'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3
                        className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}
                      >
                        {selectedRoomIds.length === 1
                          ? 'Room Properties'
                          : `${selectedRoomIds.length} Rooms Selected`}
                      </h3>
                    </div>
                    <div className="flex gap-1">
                      {selectedRoomIds.length > 1 && (
                        <button
                          onClick={() => setSelectedRoomIds([])}
                          className={`p-1.5 rounded-md transition-colors border border-transparent ${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:border-slate-600' : 'text-slate-500 hover:bg-slate-100 hover:border-slate-300'}`}
                          title="Clear Selection"
                        >
                          <span className="text-[10px] font-medium">Clear</span>
                        </button>
                      )}
                      <button
                        onClick={() =>
                          selectedRoomIds.length === 1
                            ? duplicateRoom(selectedRoomIds[0])
                            : duplicateSelectedRooms()
                        }
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors border border-transparent hover:border-slate-300"
                        title="Duplicate Room"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          selectedRoomIds.length === 1
                            ? rotateRoom(selectedRoomIds[0])
                            : rotateSelectedRooms()
                        }
                        className="p-1.5 text-slate-600 hover:bg-white rounded-md transition-colors border border-transparent hover:border-slate-200"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          selectedRoomIds.length === 1
                            ? deleteRoom(selectedRoomIds[0])
                            : deleteSelectedRooms()
                        }
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-colors border border-transparent hover:border-red-200"
                        title="Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const room = plan.rooms.find((r) => r.id === selectedRoomIds[0]);
                    if (!room) return null;
                    const vastu = analyzeRoomVastu(room, plan);

                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">Type</label>
                          <div className="text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-md px-3 py-2">
                            {room.type}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Width (ft)</label>
                            <input
                              type="number"
                              min="2"
                              max="500"
                              value={room.w}
                              onChange={(e) =>
                                updateRoom(room.id, {
                                  w: Math.max(2, Math.min(500, Number(e.target.value) || 2)),
                                })
                              }
                              onBlur={commitHistory}
                              className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Length (ft)</label>
                            <input
                              type="number"
                              min="2"
                              max="500"
                              value={room.h}
                              onChange={(e) =>
                                updateRoom(room.id, {
                                  h: Math.max(2, Math.min(500, Number(e.target.value) || 2)),
                                })
                              }
                              onBlur={commitHistory}
                              className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">
                            Wall Thickness
                          </label>
                          <select
                            value={room.wallThickness || 9}
                            onChange={(e) => {
                              updateRoom(room.id, {
                                wallThickness: Number(e.target.value),
                              });
                              commitHistory();
                            }}
                            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                          >
                            <option value="4.5">4.5" (Partition)</option>
                            <option value="6">6" (Internal)</option>
                            <option value="9">9" (Standard)</option>
                            <option value="12">12" (External)</option>
                            <option value="14">14" (Load Bearing)</option>
                          </select>
                        </div>

                        {/* Room Elements */}
                        <div className="pt-2 border-t border-slate-200">
                          {room.elements && room.elements.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-700">
                                Current Elements
                              </h4>
                              <div className="space-y-1.5">
                                {room.elements.map((el, idx) => (
                                  <div
                                    key={el.id}
                                    className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-md"
                                  >
                                    <span className="text-xs font-medium text-slate-700">
                                      {el.type} {idx + 1}
                                    </span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => {
                                          const newRotation = (el.rotation + 90) % 360;
                                          updateRoom(room.id, {
                                            elements: room.elements!.map((e) =>
                                              e.id === el.id
                                                ? {
                                                    ...e,
                                                    rotation: newRotation,
                                                  }
                                                : e
                                            ),
                                          });
                                          commitHistory();
                                        }}
                                        className="p-1 text-slate-400 hover:bg-white hover:text-indigo-600 rounded border border-transparent hover:border-slate-300 transition-colors"
                                        title="Rotate 90°"
                                      >
                                        <RotateCw className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          updateRoom(room.id, {
                                            elements: [
                                              ...(room.elements || []),
                                              {
                                                ...el,
                                                id: uuidv4(),
                                                x: el.x + 0.5,
                                                y: el.y + 0.5,
                                              },
                                            ],
                                          });
                                          commitHistory();
                                        }}
                                        className="p-1 text-slate-400 hover:bg-white hover:text-indigo-600 rounded border border-transparent hover:border-slate-300 transition-colors"
                                        title="Duplicate Element"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          updateRoom(room.id, {
                                            elements: room.elements!.filter((e) => e.id !== el.id),
                                          });
                                          commitHistory();
                                        }}
                                        className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded border border-transparent hover:border-red-200 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-700">
                            Add Openings
                          </h4>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {COMMON_ELEMENTS.map((el) => (
                              <button
                                key={el.type}
                                onClick={() => addRoomElement(room.id, el.type, el.w, el.h)}
                                className="text-xs py-1.5 px-2 bg-indigo-50 border border-indigo-200 rounded hover:border-indigo-400 hover:bg-indigo-100 transition-colors text-indigo-700 font-medium"
                              >
                                + {el.type}
                              </button>
                            ))}
                          </div>

                          {ROOM_ELEMENTS[room.type] && ROOM_ELEMENTS[room.type].length > 0 && (
                            <>
                              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-700">
                                Add Furniture
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                {ROOM_ELEMENTS[room.type].map((el) => (
                                  <button
                                    key={el.type}
                                    onClick={() => addRoomElement(room.id, el.type, el.w, el.h)}
                                    className="text-xs py-1.5 px-2 bg-white border border-slate-200 rounded hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-slate-600"
                                  >
                                    + {el.type}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Room Organization */}
                        <div className="pt-4 border-t border-slate-200">
                          <h4
                            className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                          >
                            Organization
                          </h4>
                          {(plan.layers || []).length > 0 && (
                            <div className="mb-3">
                              <label
                                className={`text-xs mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                              >
                                Layer
                              </label>
                              <select
                                value={room.category || ''}
                                onChange={(e) => {
                                  updateRoom(room.id, {
                                    category: (e.target.value || undefined) as any,
                                  });
                                  commitHistory();
                                }}
                                className={`w-full rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                              >
                                <option value="">No Layer</option>
                                {(plan.layers || []).map((layer) => (
                                  <option key={layer.id} value={layer.name}>
                                    {layer.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="mb-3">
                            <label
                              className={`text-xs mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                            >
                              Category
                            </label>
                            <select
                              value={room.category || 'Other'}
                              onChange={(e) => {
                                updateRoom(room.id, {
                                  category: e.target.value as any,
                                });
                                commitHistory();
                              }}
                              className={`w-full rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                            >
                              <option value="Living">Living</option>
                              <option value="Sleeping">Sleeping</option>
                              <option value="Kitchen">Kitchen</option>
                              <option value="Bathroom">Bathroom</option>
                              <option value="Utility">Utility</option>
                              <option value="Special">Special</option>
                              <option value="Parking">Parking</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div className="mb-3">
                            <label className="text-[10px] text-slate-500 block mb-1">
                              Tags (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={
                                Object.entries(room.tags || {})
                                  .map(([k, v]) => `${k}:${v}`)
                                  .join(', ') || ''
                              }
                              onChange={(e) => {
                                const tags: any = {};
                                e.target.value
                                  .split(',')
                                  .map((tag) => tag.trim())
                                  .filter(Boolean)
                                  .forEach((item) => {
                                    const [key, value] = item.split(':');
                                    tags[key.trim()] = value?.trim() || true;
                                  });
                                updateRoom(room.id, { tags });
                                commitHistory();
                              }}
                              placeholder="vip:yes, entertainment:true"
                              className={`w-full rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                            />
                            <p
                              className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}
                            >
                              Format: key:value, key2:true
                            </p>
                          </div>

                          <div className="mb-2">
                            <label
                              className={`text-xs mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                            >
                              Notes
                            </label>
                            <textarea
                              value={room.notes || ''}
                              onChange={(e) => {
                                updateRoom(room.id, { notes: e.target.value });
                                commitHistory();
                              }}
                              placeholder="Add notes about this room..."
                              className={`w-full rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                            />
                          </div>
                        </div>

                        {/* Vastu Card */}
                        <div
                          className={`p-3 rounded-lg border ${vastu.status === 'good' ? 'bg-emerald-50 border-emerald-200' : vastu.status === 'average' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} ${darkMode ? 'dark:invert dark:filter' : ''}`}
                        >
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Compass className="w-3 h-3" /> Vastu Check
                          </h4>
                          <div
                            className={`text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                          >
                            Current Zone: <strong>{vastu.currentDirection}</strong>
                          </div>
                          <p
                            className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}
                          >
                            {vastu.feedback}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              <div className="p-5 flex-1 overflow-y-auto flex flex-col custom-scrollbar">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> AI Vastu & Build Guide
                  </h3>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleAnalyze}
                    disabled={
                      isAnalyzing || plan.rooms.filter((r) => r.floor === currentFloor).length === 0
                    }
                    className={`w-full font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4 shrink-0 ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                      </>
                    ) : (
                      'Analyze Floor Plan'
                    )}
                  </button>
                  {isAnalyzing && (
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-200 ease-out"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {isAnalyzing && !analysis ? (
                  <div className="flex-1 flex flex-col gap-3 animate-pulse">
                    <div
                      className={`h-5 rounded w-3/4 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <div
                      className={`h-3 rounded w-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <div
                      className={`h-3 rounded w-5/6 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <div
                      className={`h-4 rounded w-1/2 mt-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <div
                      className={`h-3 rounded w-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <div
                      className={`h-3 rounded w-4/5 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <div
                      className={`h-3 rounded w-2/3 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <div
                      className={`h-4 rounded w-2/3 mt-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <div
                      className={`h-3 rounded w-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <div
                      className={`h-3 rounded w-3/4 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                  </div>
                ) : analysis ? (
                  <div className="prose prose-sm prose-slate max-w-none flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <Info className="w-8 h-8 text-slate-400 mb-3" />
                    <p className="text-sm text-slate-600">
                      Add rooms to your floor plan and click analyze to get Vastu Shastra compliance
                      scores and construction tips.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 p-6 bg-slate-100 flex justify-center">
            <div className="w-full max-w-4xl">
              <ImageEditor />
            </div>
          </div>
        )}
      </main>

      {showProjectManager && (
        <ProjectManager
          currentPlan={plan}
          onLoadPlan={(p) => {
            resetPlan(p);
          }}
          onClose={() => setShowProjectManager(false)}
        />
      )}

      {showPresentationExport && (
        <PresentationExport
          canvasRef={canvasContainerRef}
          plan={plan}
          currentFloor={currentFloor}
          onClose={() => setShowPresentationExport(false)}
        />
      )}

      {showShortcutHelp && (
        <ShortcutHelp
          onClose={() => {
            trackEvent(EVENTS.MODAL_CLOSED, { props: { modal: 'shortcuts' } });
            setShowShortcutHelp(false);
          }}
        />
      )}

      {showOnboarding && (
        <Onboarding
          onClose={() => {
            trackEvent(EVENTS.MODAL_CLOSED, { props: { modal: 'onboarding' } });
            setShowOnboarding(false);
            try {
              localStorage.setItem('vastuplan-onboarded', 'true');
            } catch {
              // ignore
            }
          }}
        />
      )}

      {/* Offline Indicator - shows when network is unavailable */}
      <OfflineIndicator />

      {/* Print Modal - hidden on screen, visible when printing */}
      <div className="hidden print:block fixed inset-0 bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">VastuPlan Floor Plan</h1>
          <p className="text-sm text-slate-600 mb-8">
            Floor {currentFloor === 0 ? 'Ground' : `Floor ${currentFloor}`} |{' '}
            {new Date().toLocaleDateString()} | Generated on {new Date().toLocaleTimeString()}
          </p>
          <div className="border border-slate-200 p-4">
            <Canvas
              plan={plan}
              currentFloor={currentFloor}
              zoom={zoom}
              showVastuGrid={showVastuGrid}
              snapToGrid={snapToGrid}
              measuring={measuring}
              setMeasuring={setMeasuring}
              onUpdateRoom={() => {}}
              onUpdateRoomEnd={() => {}}
              onSelectRoom={() => {}}
              selectedRoomIds={[]}
              layers={plan.layers}
            />
          </div>
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>VastuScore: {vastuScore}/100</p>
            <p>
              Total Area: {totalArea} sq ft | Buildable: {buildableArea} sq ft | Built-up:{' '}
              {builtUpArea} sq ft
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
