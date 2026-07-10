import React, { useEffect, useRef, useState } from 'react';
import { Header } from './components/layout/Header';
import { MobileTabs } from './components/layout/MobileTabs';
import { Sidebar } from './components/layout/Sidebar';
import { Toolbar } from './components/layout/Toolbar';
import { CanvasArea } from './components/layout/CanvasArea';
import { PropertiesPanel } from './components/layout/PropertiesPanel';
import { ImageEditor } from './components/ImageEditor';
import { ProjectManager } from './components/ProjectManager';
import { PresentationExport } from './components/PresentationExport';
import { ComplianceReportExport } from './components/ComplianceReportExport';
import { ShortcutHelp } from './components/ShortcutHelp';
import { Onboarding } from './components/Onboarding';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CollaborationPanel } from './components/CollaborationPanel';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './contexts/AuthContext';
import { trackEvent, EVENTS } from './services/analytics';
import { setUser as setSentryUser, clearUser as clearSentryUser } from './services/sentry';
import { usePlanEditor } from './hooks/usePlanEditor';
import { formatFloorLabel } from './constants/floorPlanConstants';
import { Canvas } from './components/Canvas';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const editor = usePlanEditor({ canvasContainerRef });
  const { isEnabled: isAuthEnabled, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setSentryUser(user.id);
    } else {
      clearSentryUser();
    }
  }, [user]);

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
        onOpenAuth={isAuthEnabled ? () => setShowAuthModal(true) : undefined}
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
              showVastuGrid={editor.showVastuGrid}
              onToggleVastuGrid={editor.handleToggleGrid}
              showPlumbing={editor.showPlumbing}
              onTogglePlumbing={editor.handleTogglePlumbing}
              showSunPath={editor.showSunPath}
              onToggleSunPath={editor.handleToggleSunPath}
              sunDate={editor.sunDate}
              onSetSunDate={editor.handleSetSunDate}
              sunTime={editor.sunTime}
              onSetSunTime={editor.handleSetSunTime}
              onSetSunNow={editor.handleSetSunNow}
              handleSelectTemplate={editor.handleSelectTemplate}
              handleClearFloor={editor.handleClearFloor}
              handleImportJSON={editor.handleImportJSON}
              handleExportJSON={editor.handleExportJSON}
              updateLayers={editor.updateLayers}
              addRoom={editor.addRoom}
              onDuplicateFloor={editor.duplicateFloor}
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
              className={`flex-1 overflow-auto p-4 md:p-8 flex-col items-start md:items-center relative ${
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
                onToggleTour={editor.handleToggleTour}
                onShare={editor.handleShare}
                onExport={editor.handleExport}
                isExporting={editor.isExporting}
                onPrint={editor.handlePrint}
                onExportJSON={editor.handleExportJSON}
                onExportSVG={editor.handleExportSVG}
                onPresentationExport={() => editor.setShowPresentationExport(true)}
                onComplianceExport={() => editor.setShowComplianceExport(true)}
                onMeasure={() => editor.setMeasuring(true)}
              />
              <CanvasArea
                canvasContainerRef={canvasContainerRef}
                plan={editor.plan}
                currentFloor={editor.currentFloor}
                zoom={editor.zoom}
                showVastuGrid={editor.showVastuGrid}
                showVastuTour={editor.showVastuTour}
                onToggleVastuTour={editor.handleToggleTour}
                showPlumbing={editor.showPlumbing}
                showSunPath={editor.showSunPath}
                sunDate={editor.sunDate}
                sunTime={editor.sunTime}
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
                selectedCommentId={editor.selectedCommentId}
                onSelectComment={editor.setSelectedCommentId}
                onAddComment={editor.addComment}
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
              selectedCommentId={editor.selectedCommentId}
              onUpdateComment={editor.updateComment}
              onDeleteComment={editor.deleteComment}
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
          plan={editor.plan}
          currentFloor={editor.currentFloor}
          onClose={() => editor.setShowPresentationExport(false)}
        />
      )}

      {editor.showComplianceExport && (
        <ComplianceReportExport
          canvasRef={canvasContainerRef}
          plan={editor.plan}
          currentFloor={editor.currentFloor}
          analysis={editor.analysis}
          onClose={() => editor.setShowComplianceExport(false)}
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

      {isAuthEnabled && <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />}

      <OfflineIndicator />

      <CollaborationPanel
        isConnected={editor.isConnected}
        isConnecting={editor.isConnecting}
        roomId={editor.roomId}
        userId={editor.userId}
        userName={editor.userName}
        users={editor.users}
        messages={editor.messages}
        error={editor.error}
        showPanel={editor.showPanel}
        setShowPanel={editor.setShowPanel}
        joinRoom={editor.joinRoom}
        leaveRoom={editor.leaveRoom}
        sendMessage={editor.sendMessage}
        requestUndo={editor.requestUndo}
        requestRedo={editor.requestRedo}
      />

      {/* Print Modal - hidden on screen, visible when printing */}
      <div className="hidden print:block fixed inset-0 bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">VastuPlan Floor Plan</h1>
          <p className="text-sm text-slate-600 mb-8">
            {formatFloorLabel(editor.currentFloor, editor.plan.floorNames)} |{' '}
            {new Date().toLocaleDateString()} | Generated on {new Date().toLocaleTimeString()}
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
