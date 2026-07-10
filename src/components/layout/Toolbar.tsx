import React from 'react';
import {
  Grid,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Share2,
  MessageSquare,
  Lock,
  FileText,
  FileCheck,
  Download,
  Ruler,
  Loader2,
  Compass,
  QrCode,
} from 'lucide-react';

export interface ToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  undo: () => void;
  redo: () => void;
  historyIndex: number;
  historyLength: number;
  showVastuGrid: boolean;
  onToggleGrid: () => void;
  onToggleTour: () => void;
  onShare: (mode: 'view' | 'comment', password?: string) => void;
  onShareQR: () => void;
  onExport: () => void;
  isExporting: boolean;
  onPrint: () => void;
  onExportJSON: () => void;
  onExportSVG: () => void;
  onPresentationExport: () => void;
  onMeasure: () => void;
  onComplianceExport: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  undo,
  redo,
  historyIndex,
  historyLength,
  showVastuGrid,
  onToggleGrid,
  onToggleTour,
  onShare,
  onShareQR,
  onExport,
  isExporting,
  onPrint,
  onExportJSON,
  onExportSVG,
  onPresentationExport,
  onComplianceExport,
  onMeasure,
}) => {
  return (
    <div className="w-full flex flex-wrap justify-between gap-2 mb-4 max-w-4xl">
      <div className="flex gap-2">
        <button
          onClick={onToggleGrid}
          className={`flex items-center justify-center w-10 h-10 border rounded-lg shadow-sm transition-colors ${
            showVastuGrid
              ? 'bg-surface-warm border-border text-accent'
              : 'bg-surface border-border hover:bg-surface-warm text-fg-2    dark:text-meta'
          }`}
          title="Toggle Vastu Grid"
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleTour}
          className="flex items-center justify-center w-10 h-10 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta rounded-lg shadow-sm transition-colors"
          title="Vastu Zone Tour"
          data-testid="vastu-tour-button"
        >
          <Compass className="w-4 h-4" />
        </button>
        <button
          onClick={undo}
          disabled={historyIndex === 0}
          className="flex items-center justify-center w-10 h-10 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={historyIndex === historyLength - 1}
          className="flex items-center justify-center w-10 h-10 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onZoomOut}
          className="flex items-center justify-center w-10 h-10 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta rounded-lg shadow-sm transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center px-2 text-xs font-mono text-muted bg-surface border border-border  rounded-lg shadow-sm">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={onZoomIn}
          className="flex items-center justify-center w-10 h-10 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta rounded-lg shadow-sm transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex rounded-lg shadow-sm overflow-hidden border border-border ">
          <button
            onClick={() => onShare('view')}
            className="flex items-center justify-center w-10 h-10 bg-surface hover:bg-surface-warm  text-fg-2 dark:text-meta transition-colors"
            title="Share View-Only Link (read-only)"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onShare('comment')}
            className="flex items-center justify-center w-10 h-10 bg-surface hover:bg-surface-warm  text-fg-2 dark:text-meta border-l border-border  transition-colors"
            title="Share Comment-Enabled Link (reviewers can add notes)"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const password = window.prompt(
                'Set a password for this protected share link (view-only):'
              );
              if (password) onShare('view', password);
            }}
            className="flex items-center justify-center w-10 h-10 bg-surface hover:bg-surface-warm  text-fg-2 dark:text-meta border-l border-border  transition-colors"
            title="Password-Protected Share Link (view-only)"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            onClick={onShareQR}
            className="flex items-center justify-center w-10 h-10 bg-surface hover:bg-surface-warm  text-fg-2 dark:text-meta border-l border-border  transition-colors"
            title="Show QR Code for this plan"
            data-testid="share-qr-button"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onPresentationExport}
          className="flex items-center gap-2 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Presentation Export</span>
        </button>
        <button
          onClick={onComplianceExport}
          className="flex items-center gap-2 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          title="Export Vastu compliance report PDF"
        >
          <FileCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Compliance</span>
        </button>
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-accent-on px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">PNG</span>
        </button>
        <button
          onClick={onPrint}
          className="flex items-center gap-2 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Print</span>
        </button>
        <button
          onClick={onExportJSON}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">JSON Export</span>
        </button>
        <button
          onClick={onMeasure}
          className="flex items-center gap-2 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          <Ruler className="w-4 h-4" />
          <span className="hidden sm:inline">Ruler</span>
        </button>
        <button
          onClick={onExportSVG}
          className="flex items-center gap-2 bg-surface border border-border  hover:bg-surface-warm  text-fg-2 dark:text-meta px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">SVG Export</span>
        </button>
      </div>
    </div>
  );
};
