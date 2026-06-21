/**
 * Behavioural tests for `src/hooks/usePlanEditor.ts` (S-1).
 *
 * The hook is the editor's brain: it wires `useFloorPlan`, `useSelection`,
 * export, keyboard shortcuts, and all room/plan handlers. These tests pin
 * the public surface and a few critical behaviours so the S-1 refactor stays
 * safe to iterate on.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanEditor } from './usePlanEditor';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const showToast = vi.fn();
vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/analytics', () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
  trackGoal: vi.fn(),
  setProperties: vi.fn(),
  EVENTS: {
    DARK_MODE_TOGGLED: 'dark_mode_toggled',
    MODAL_OPENED: 'modal_opened',
    MODAL_CLOSED: 'modal_closed',
    PLAN_CREATED: 'plan_created',
    ROOM_ADDED: 'room_added',
    ROOM_DELETED: 'room_deleted',
    ROOM_ROTATED: 'room_rotated',
    AI_ANALYZED: 'ai_analyzed',
    EXPORT_PNG: 'export_png',
    EXPORT_SVG: 'export_svg',
    SHARE_VIEW_MODE: 'share_view_mode',
    SHARE_COMMENT_MODE: 'share_comment_mode',
    UNDO_PERFORMED: 'undo_performed',
    REDO_PERFORMED: 'redo_performed',
    VASTU_GRID_TOGGLED: 'vastu_grid_toggled',
  },
  EVENT_METADATA: { roomTypes: {} },
}));

vi.mock('../services/sentry', () => ({
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

const analyzeFloorPlan = vi.fn();
vi.mock('../services/gemini', () => ({
  analyzeFloorPlan: (...args: unknown[]) => analyzeFloorPlan(...args),
}));

vi.mock('../lib/exports', () => ({
  exportToPNG: vi.fn(),
  exportToJSON: vi.fn(),
  importJSONFile: vi.fn(),
  exportToSVG: vi.fn(),
  generateShareLink: vi.fn(),
  checkPlanSize: vi.fn(() => ({ sizeKB: 1, isLarge: false })),
}));

vi.mock('../services/vastu', () => ({
  calculateOverallVastuScore: vi.fn(() => 72),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRef() {
  return { current: document.createElement('div') };
}

beforeEach(() => {
  (localStorage.getItem as ReturnType<typeof import('vitest').vi.fn>).mockReturnValue(null);
  showToast.mockClear();
  analyzeFloorPlan.mockReset();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// ---------------------------------------------------------------------------
// Public API surface
// ---------------------------------------------------------------------------

describe('usePlanEditor public API', () => {
  it('exposes the expected state and handler keys', () => {
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: makeRef() }));
    expect(Object.keys(result.current).sort()).toEqual(
      [
        'activeTab',
        'addRoom',
        'addRoomElement',
        'analysis',
        'analysisProgress',
        'analyzeBtn',
        'appMode',
        'buildableArea',
        'buildableHeight',
        'buildableWidth',
        'builtUpArea',
        'clearSelection',
        'commitHistory',
        'currentFloor',
        'deleteRoom',
        'deleteSelectedRooms',
        'duplicateRoom',
        'duplicateSelectedRooms',
        'handleAnalyze',
        'handleClearFloor',
        'handleDelete',
        'handleDuplicate',
        'handleExport',
        'handleExportJSON',
        'handleExportSVG',
        'handleImportJSON',
        'handlePrint',
        'handleSelectTemplate',
        'handleSetbackChange',
        'handleShare',
        'handleShowShortcuts',
        'handleToggleGrid',
        'handleZoomIn',
        'handleZoomOut',
        'historyIndex',
        'historyLength',
        'isAnalyzing',
        'isExporting',
        'linkSetbacks',
        'measuring',
        'mobileTab',
        'plan',
        'redo',
        'replacePlanPreservingHistory',
        'replaceSelection',
        'resetPlan',
        'roomCategoryFilter',
        'roomSearch',
        'rotateRoom',
        'rotateSelectedRooms',
        'selectedRoomIds',
        'selectMany',
        'selectRoom',
        'setActiveTab',
        'setAnalysis',
        'setAnalysisProgress',
        'setAppMode',
        'setCurrentFloor',
        'setIsAnalyzing',
        'setIsExporting',
        'setLinkSetbacks',
        'setMeasuring',
        'setMobileTab',
        'setRoomCategoryFilter',
        'setRoomSearch',
        'setShowOnboarding',
        'setShowPresentationExport',
        'setShowProjectManager',
        'setShowShortcutHelp',
        'setShowVastuGrid',
        'setSnapToGrid',
        'setZoom',
        'showOnboarding',
        'showPresentationExport',
        'showProjectManager',
        'showShortcutHelp',
        'showVastuGrid',
        'snapToGrid',
        'totalArea',
        'undo',
        'updateLayers',
        'updatePlan',
        'updateRoom',
        'updateRoomCategory',
        'vastuScore',
        'zoom',
      ].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// Core editor behaviour
// ---------------------------------------------------------------------------

describe('usePlanEditor room editing', () => {
  it('adds a room on the current floor and selects it', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    act(() => {
      result.current.addRoom('Bedroom', 12, 12);
    });

    expect(result.current.plan.rooms).toHaveLength(1);
    expect(result.current.plan.rooms[0].type).toBe('Bedroom');
    expect(result.current.plan.rooms[0].floor).toBe(0);
    expect(result.current.selectedRoomIds).toContain(result.current.plan.rooms[0].id);
    expect(showToast).toHaveBeenCalledWith('Added Bedroom room', 'success');
  });

  it('does not add rooms in view mode', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    act(() => {
      result.current.setAppMode('view');
    });
    act(() => {
      result.current.addRoom('Kitchen', 10, 10);
    });

    expect(result.current.plan.rooms).toHaveLength(0);
  });

  it('updates a room dimension and re-clamps its elements', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    act(() => result.current.addRoom('Bedroom', 12, 12));
    const room = result.current.plan.rooms[0];

    act(() => {
      result.current.updateRoom(room.id, { w: 8 });
    });

    expect(result.current.plan.rooms[0].w).toBe(8);
  });

  it('deletes the selected room and clears selection', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    act(() => result.current.addRoom('Bedroom', 12, 12));
    const room = result.current.plan.rooms[0];

    act(() => result.current.deleteRoom(room.id));

    expect(result.current.plan.rooms).toHaveLength(0);
    expect(result.current.selectedRoomIds).toHaveLength(0);
  });

  it('duplicates a room and selects the new one', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    act(() => result.current.addRoom('Bedroom', 12, 12));
    const room = result.current.plan.rooms[0];

    act(() => result.current.duplicateRoom(room.id));

    expect(result.current.plan.rooms).toHaveLength(2);
    expect(result.current.selectedRoomIds).toContain(result.current.plan.rooms[1].id);
  });

  it('rotates a room by swapping width and height', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    act(() => result.current.addRoom('Bedroom', 12, 10));
    const room = result.current.plan.rooms[0];

    act(() => result.current.rotateRoom(room.id));

    expect(result.current.plan.rooms[0].w).toBe(10);
    expect(result.current.plan.rooms[0].h).toBe(12);
  });
});

describe('usePlanEditor floor + history', () => {
  it('switches floors without changing room list', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    act(() => result.current.addRoom('Bedroom', 12, 12));
    const roomCount = result.current.plan.rooms.length;

    act(() => result.current.setCurrentFloor(1));

    expect(result.current.currentFloor).toBe(1);
    expect(result.current.plan.rooms.length).toBe(roomCount);
    expect(result.current.builtUpArea).toBe(0);
  });

  it('undo reverts an addRoom', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    act(() => result.current.addRoom('Bedroom', 12, 12));
    expect(result.current.plan.rooms).toHaveLength(1);

    act(() => result.current.undo());

    expect(result.current.plan.rooms).toHaveLength(0);
  });

  it('redo restores a reverted addRoom', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    act(() => result.current.addRoom('Bedroom', 12, 12));
    act(() => result.current.undo());
    expect(result.current.plan.rooms).toHaveLength(0);

    act(() => result.current.redo());

    expect(result.current.plan.rooms).toHaveLength(1);
  });
});

describe('usePlanEditor derived metrics', () => {
  it('computes plot, buildable and built-up area', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    expect(result.current.totalArea).toBe(30 * 40);
    expect(result.current.buildableArea).toBe(24 * 34);
    expect(result.current.builtUpArea).toBe(0);

    act(() => result.current.addRoom('Bedroom', 12, 12));

    expect(result.current.builtUpArea).toBe(144);
  });

  it('derives the Vastu score from the plan', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    expect(result.current.vastuScore).toBe(72);
  });

  it('disables analyze when no API key and no rooms', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePlanEditor({ canvasContainerRef: ref }));

    expect(result.current.analyzeBtn.disabled).toBe(true);
    expect(result.current.analyzeBtn.title).toMatch(/VITE_GEMINI_API_KEY/);
  });
});
