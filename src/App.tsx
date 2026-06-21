import React, { useRef } from 'react';
import { Header } from './components/layout/Header';
import { MobileTabs } from './components/layout/MobileTabs';
import { Sidebar } from './components/layout/Sidebar';
import { Toolbar } from './components/layout/Toolbar';
import { CanvasArea } from './components/layout/CanvasArea';
import { PropertiesPanel } from './components/layout/PropertiesPanel';
import { ImageEditor } from './components/ImageEditor';
import { ProjectManager } from './components/ProjectManager';
import { PresentationExport } from './components/PresentationExport';
import { ShortcutHelp } from './components/ShortcutHelp';
import { Onboarding } from './components/Onboarding';
import { OfflineIndicator } from './components/OfflineIndicator';
import { trackEvent, EVENTS } from './services/analytics';
import { usePlanEditor } from './hooks/usePlanEditor';
import { formatFloor } from './constants/floorPlanConstants';
import { Canvas } from './components/Canvas';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const editor = usePlanEditor({ canvasContainerRef });

  return (
    <div className="h-screen flex flex-col font-sans bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <Header
        plan={editor.plan}
        appMode={editor.appMode}
        setAppMode={editor.setAppMode}
        activeTab={editor.activeTab}
        setActiveTab={editor.setActiveTab}
        setShowProjectManager={editor.setShowProjectManager}
        vastuScore={editor.vastuScore}
        setShowShortcutHelp={editor.handleShowShortcuts}
      />

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <MobileTabs mobileTab={editor.mobileTab} setMobileTab={editor.setMobileTab} />

        {editor.activeTab === 'design' ? (
          <>
            <Sidebar
              plan={editor.plan}
              currentFloor={editor.currentFloor}
              setCurrentFloor={editor.setCurrentFloor}
              updatePlan={editor.updatePlan}
              commitHistory={editor.commitHistory}
              handleSetbackChange={editor.handleSetbackChange}
              linkSetbacks={editor.linkSetbacks}
              setLinkSetbacks={editor.setLinkSetbacks}
              snapToGrid={editor.snapToGrid}
              setSnapToGrid={editor.setSnapToGrid}
              handleSelectTemplate={editor.handleSelectTemplate}
              handleClearFloor={editor.handleClearFloor}
              handleImportJSON={editor.handleImportJSON}
              handleExportJSON={editor.handleExportJSON}
              updateLayers={editor.updateLayers}
              addRoom={editor.addRoom}
              roomSearch={editor.roomSearch}
              setRoomSearch={editor.setRoomSearch}
              roomCategoryFilter={editor.roomCategoryFilter}
              setRoomCategoryFilter={editor.setRoomCategoryFilter}
              appMode={editor.appMode}
              mobileTab={editor.mobileTab}
              totalArea={editor.totalArea}
              buildableArea={editor.buildableArea}
              builtUpArea={editor.builtUpArea}
            />

            <div
              className={`flex-1 overflow-auto p-4 md:p-8 flex-col items-center relative ${
                editor.mobileTab === 'canvas' ? 'flex' : 'hidden md:flex'
              } bg-slate-100 dark:bg-slate-900`}
            >
              <Toolbar
                zoom={editor.zoom}
                onZoomIn={editor.handleZoomIn}
                onZoomOut={editor.handleZoomOut}
                undo={editor.undo}
                redo={editor.redo}
                historyIndex={editor.historyIndex}
                historyLength={editor.historyLength}
                showVastuGrid={editor.showVastuGrid}
                onToggleGrid={editor.handleToggleGrid}
                onShare={editor.handleShare}
                onExport={editor.handleExport}
                isExporting={editor.isExporting}
                onPrint={editor.handlePrint}
                onExportJSON={editor.handleExportJSON}
                onExportSVG={editor.handleExportSVG}
                onPresentationExport={() => editor.setShowPresentationExport(true)}
                onMeasure={() => editor.setMeasuring(true)}
              />
              <CanvasArea
                canvasContainerRef={canvasContainerRef}
                plan={editor.plan}
                currentFloor={editor.currentFloor}
                zoom={editor.zoom}
                showVastuGrid={editor.showVastuGrid}
                snapToGrid={editor.snapToGrid}
                measuring={editor.measuring}
                setMeasuring={editor.setMeasuring}
                onUpdateRoom={editor.updateRoom}
                onUpdateRoomEnd={editor.commitHistory}
                onSelectRoom={editor.selectRoom}
                onSelectMany={editor.selectMany}
                selectedRoomIds={editor.selectedRoomIds}
                layers={editor.plan.layers}
                appMode={editor.appMode}
              />
            </div>

            <PropertiesPanel
              selectedRoomIds={editor.selectedRoomIds}
              plan={editor.plan}
              appMode={editor.appMode}
              onUpdateRoom={editor.updateRoom}
              onCommitHistory={editor.commitHistory}
              onDuplicate={editor.handleDuplicate}
              onRotate={editor.rotateSelectedRooms}
              onDelete={editor.deleteSelectedRooms}
              addRoomElement={editor.addRoomElement}
              updateRoomCategory={editor.updateRoomCategory}
              onClearSelection={editor.clearSelection}
              analysis={editor.analysis}
              isAnalyzing={editor.isAnalyzing}
              analysisProgress={editor.analysisProgress}
              analyzeBtn={editor.analyzeBtn}
              onAnalyze={editor.handleAnalyze}
              mobileTab={editor.mobileTab}
            />
          </>
        ) : (
          <div className="flex-1 p-6 bg-slate-100 dark:bg-slate-900 flex justify-center">
            <div className="w-full max-w-4xl">
              <ImageEditor />
            </div>
          </div>
        )}
      </main>

      {editor.showProjectManager && (
        <ProjectManager
          currentPlan={editor.plan}
          onLoadPlan={editor.resetPlan}
          onClose={() => editor.setShowProjectManager(false)}
        />
      )}

      {editor.showPresentationExport && (
        <PresentationExport
          canvasRef={canvasContainerRef}
          plan={editor.plan}
          currentFloor={editor.currentFloor}
          onClose={() => editor.setShowPresentationExport(false)}
        />
      )}

      {editor.showShortcutHelp && (
        <ShortcutHelp
          onClose={() => {
            trackEvent(EVENTS.MODAL_CLOSED, { props: { modal: 'shortcuts' } });
            editor.setShowShortcutHelp(false);
          }}
        />
      )}

      {editor.showOnboarding && (
        <Onboarding
          onClose={() => {
            trackEvent(EVENTS.MODAL_CLOSED, { props: { modal: 'onboarding' } });
            editor.setShowOnboarding(false);
            try {
              localStorage.setItem('vastuplan-onboarded', 'true');
            } catch {
              // ignore
            }
          }}
        />
      )}

      <OfflineIndicator />

      {/* Print Modal - hidden on screen, visible when printing */}
      <div className="hidden print:block fixed inset-0 bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">VastuPlan Floor Plan</h1>
          <p className="text-sm text-slate-600 mb-8">
            Floor {formatFloor(editor.currentFloor)} | {new Date().toLocaleDateString()} | Generated
            on {new Date().toLocaleTimeString()}
          </p>
          <div className="border border-slate-200 p-4">
            <Canvas
              plan={editor.plan}
              currentFloor={editor.currentFloor}
              zoom={editor.zoom}
              showVastuGrid={editor.showVastuGrid}
              snapToGrid={editor.snapToGrid}
              measuring={editor.measuring}
              setMeasuring={editor.setMeasuring}
              onUpdateRoom={() => {}}
              onUpdateRoomEnd={() => {}}
              onSelectRoom={() => {}}
              onSelectMany={() => {}}
              selectedRoomIds={[]}
              layers={editor.plan.layers}
            />
          </div>
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>VastuScore: {editor.vastuScore}/100</p>
            <p>
              Total Area: {editor.totalArea} sq ft | Buildable: {editor.buildableArea} sq ft |
              Built-up: {editor.builtUpArea} sq ft
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
