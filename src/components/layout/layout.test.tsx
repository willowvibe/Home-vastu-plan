/**
 * Smoke tests for the S-1 layout modules. These are shallow render checks
 * that ensure each module renders its props and wires callbacks correctly,
 * without mounting the heavy `Canvas` / `RoomPropertiesPanel` internals.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MobileTabs } from './MobileTabs';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { CanvasArea } from './CanvasArea';
import { PropertiesPanel } from './PropertiesPanel';
import { INITIAL_PLAN } from '../../constants/floorPlanConstants';
import type { FloorPlan, AppMode } from '../../types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../Canvas', () => ({
  Canvas: () => <div data-testid="mock-canvas">Canvas</div>,
}));

vi.mock('../LayerManager', () => ({
  LayerManager: () => <div data-testid="mock-layer-manager">LayerManager</div>,
}));

vi.mock('../Properties/RoomPropertiesPanel', () => ({
  RoomPropertiesPanel: (props: Record<string, unknown>) => (
    <div data-testid="mock-room-properties">{JSON.stringify(props)}</div>
  ),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

const mockPlan: FloorPlan = {
  ...INITIAL_PLAN,
  rooms: [
    {
      id: 'r1',
      type: 'Bedroom',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      floor: 0,
      wallThickness: 9,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// MobileTabs
// ---------------------------------------------------------------------------

describe('MobileTabs', () => {
  it('renders the three tabs and calls the setter', () => {
    const setMobileTab = vi.fn();
    render(<MobileTabs mobileTab="canvas" setMobileTab={setMobileTab} />);

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Canvas')).toBeTruthy();
    expect(screen.getByText('Properties')).toBeTruthy();

    fireEvent.click(screen.getByText('Settings'));
    expect(setMobileTab).toHaveBeenCalledWith('settings');
  });
});

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const editMode: AppMode = 'edit';

describe('Sidebar', () => {
  it('renders plot settings, layer manager, and add-rooms grid', () => {
    render(
      <Sidebar
        plan={mockPlan}
        currentFloor={0}
        setCurrentFloor={vi.fn()}
        updatePlan={vi.fn()}
        commitHistory={vi.fn()}
        handleSetbackChange={vi.fn()}
        linkSetbacks
        setLinkSetbacks={vi.fn()}
        snapToGrid
        setSnapToGrid={vi.fn()}
        handleSelectTemplate={vi.fn()}
        handleClearFloor={vi.fn()}
        handleImportJSON={vi.fn()}
        handleExportJSON={vi.fn()}
        updateLayers={vi.fn()}
        addRoom={vi.fn()}
        roomSearch=""
        setRoomSearch={vi.fn()}
        roomCategoryFilter={null}
        setRoomCategoryFilter={vi.fn()}
        appMode={editMode}
        mobileTab="settings"
        totalArea={1200}
        buildableArea={900}
        builtUpArea={100}
      />
    );

    expect(screen.getByText('Plot Settings')).toBeTruthy();
    expect(screen.getByTestId('mock-layer-manager')).toBeTruthy();
    expect(screen.getByText('Add Rooms')).toBeTruthy();
    expect(screen.getByText('Bedroom')).toBeTruthy();
  });

  it('calls addRoom when a room button is clicked', () => {
    const addRoom = vi.fn();
    render(
      <Sidebar
        plan={mockPlan}
        currentFloor={0}
        setCurrentFloor={vi.fn()}
        updatePlan={vi.fn()}
        commitHistory={vi.fn()}
        handleSetbackChange={vi.fn()}
        linkSetbacks
        setLinkSetbacks={vi.fn()}
        snapToGrid
        setSnapToGrid={vi.fn()}
        handleSelectTemplate={vi.fn()}
        handleClearFloor={vi.fn()}
        handleImportJSON={vi.fn()}
        handleExportJSON={vi.fn()}
        updateLayers={vi.fn()}
        addRoom={addRoom}
        roomSearch=""
        setRoomSearch={vi.fn()}
        roomCategoryFilter={null}
        setRoomCategoryFilter={vi.fn()}
        appMode={editMode}
        mobileTab="settings"
        totalArea={1200}
        buildableArea={900}
        builtUpArea={100}
      />
    );

    fireEvent.click(screen.getByText('Bedroom'));
    expect(addRoom).toHaveBeenCalledWith('Bedroom', 12, 12);
  });

  it('is hidden on mobile when mobileTab is not settings', () => {
    const { container } = render(
      <Sidebar
        plan={mockPlan}
        currentFloor={0}
        setCurrentFloor={vi.fn()}
        updatePlan={vi.fn()}
        commitHistory={vi.fn()}
        handleSetbackChange={vi.fn()}
        linkSetbacks
        setLinkSetbacks={vi.fn()}
        snapToGrid
        setSnapToGrid={vi.fn()}
        handleSelectTemplate={vi.fn()}
        handleClearFloor={vi.fn()}
        handleImportJSON={vi.fn()}
        handleExportJSON={vi.fn()}
        updateLayers={vi.fn()}
        addRoom={vi.fn()}
        roomSearch=""
        setRoomSearch={vi.fn()}
        roomCategoryFilter={null}
        setRoomCategoryFilter={vi.fn()}
        appMode={editMode}
        mobileTab="canvas"
        totalArea={1200}
        buildableArea={900}
        builtUpArea={100}
      />
    );

    const first = container.firstChild as HTMLElement | null;
    expect(first?.classList.contains('hidden')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

describe('Toolbar', () => {
  it('fires undo, redo, zoom, and export callbacks', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const onZoomIn = vi.fn();
    const onExport = vi.fn();
    const onToggleGrid = vi.fn();

    render(
      <Toolbar
        zoom={1}
        onZoomIn={onZoomIn}
        onZoomOut={vi.fn()}
        undo={undo}
        redo={redo}
        historyIndex={1}
        historyLength={3}
        showVastuGrid={false}
        onToggleGrid={onToggleGrid}
        onShare={vi.fn()}
        onExport={onExport}
        isExporting={false}
        onPrint={vi.fn()}
        onExportJSON={vi.fn()}
        onExportSVG={vi.fn()}
        onPresentationExport={vi.fn()}
        onComplianceExport={vi.fn()}
        onMeasure={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Undo (Ctrl+Z)'));
    expect(undo).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Redo (Ctrl+Y)'));
    expect(redo).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(onZoomIn).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Toggle Vastu Grid'));
    expect(onToggleGrid).toHaveBeenCalled();

    fireEvent.click(screen.getByText('PNG'));
    expect(onExport).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// CanvasArea
// ---------------------------------------------------------------------------

describe('CanvasArea', () => {
  it('renders the mock canvas inside the snapshot ref container', () => {
    render(
      <CanvasArea
        canvasContainerRef={{ current: null }}
        plan={mockPlan}
        currentFloor={0}
        zoom={1}
        showVastuGrid={false}
        snapToGrid
        measuring={false}
        setMeasuring={vi.fn()}
        onUpdateRoom={vi.fn()}
        onUpdateRoomEnd={vi.fn()}
        onSelectRoom={vi.fn()}
        onSelectMany={vi.fn()}
        selectedRoomIds={[]}
        layers={[]}
        appMode="edit"
      />
    );

    const container = screen.getByTestId('canvas-container');
    expect(container).toBeTruthy();
    expect(within(container).getByTestId('mock-canvas')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// PropertiesPanel
// ---------------------------------------------------------------------------

describe('PropertiesPanel', () => {
  it('passes props to RoomPropertiesPanel and renders analyze button', () => {
    const onAnalyze = vi.fn();
    render(
      <PropertiesPanel
        selectedRoomIds={['r1']}
        plan={mockPlan}
        appMode="edit"
        onUpdateRoom={vi.fn()}
        onCommitHistory={vi.fn()}
        onDuplicate={vi.fn()}
        onRotate={vi.fn()}
        onDelete={vi.fn()}
        addRoomElement={vi.fn()}
        updateRoomCategory={vi.fn()}
        onClearSelection={vi.fn()}
        analysis={null}
        isAnalyzing={false}
        analysisProgress={0}
        analyzeBtn={{ disabled: false, title: 'Analyze' }}
        onAnalyze={onAnalyze}
        mobileTab="properties"
      />
    );

    expect(screen.getByTestId('mock-room-properties')).toBeTruthy();
    expect(screen.getByText('Analyze Floor Plan')).toBeTruthy();

    fireEvent.click(screen.getByText('Analyze Floor Plan'));
    expect(onAnalyze).toHaveBeenCalled();
  });

  it('shows analysis markdown when analysis is present', () => {
    render(
      <PropertiesPanel
        selectedRoomIds={[]}
        plan={mockPlan}
        appMode="edit"
        onUpdateRoom={vi.fn()}
        onCommitHistory={vi.fn()}
        onDuplicate={vi.fn()}
        onRotate={vi.fn()}
        onDelete={vi.fn()}
        addRoomElement={vi.fn()}
        updateRoomCategory={vi.fn()}
        onClearSelection={vi.fn()}
        analysis="# Vastu tips"
        isAnalyzing={false}
        analysisProgress={0}
        analyzeBtn={{ disabled: false, title: 'Analyze' }}
        onAnalyze={vi.fn()}
        mobileTab="properties"
      />
    );

    expect(screen.getByTestId('markdown').textContent).toBe('# Vastu tips');
  });
});
