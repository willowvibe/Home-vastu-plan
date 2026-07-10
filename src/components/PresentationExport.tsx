import React, { useState, useRef } from 'react';
import { FloorPlan } from '../types';
import { jsPDF } from 'jspdf';
import { FileText, X, Upload, Loader2, Download } from 'lucide-react';
import { addBreadcrumb } from '../services/sentry';
import { useToast } from './Toast';
import { formatFloorLabel } from '../constants/floorPlanConstants';
import { buildVectorPdfOps, renderOpsToPdf, computePdfScale } from '../lib/exportVectorPdf';
import { isWatermarkRequired } from '../services/entitlements';

interface PresentationExportProps {
  plan: FloorPlan;
  currentFloor: number;
  onClose: () => void;
}

// S-15: validate logo MIME via magic-byte sniff (PNG or JPEG) and a 5 MB
// cap. The <input accept="image/png, image/jpeg"> attribute is a UI
// hint, not a security control — a determined user can pick any file
// from the OS picker. Reading the first 8 bytes is the only reliable
// check.
async function isPngOrJpeg(file: File): Promise<boolean> {
  if (file.size > 5_000_000) return false;
  try {
    const head = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(head);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    return isPng || isJpeg;
  } catch {
    return false;
  }
}

export function PresentationExport({ plan, currentFloor, onClose }: PresentationExportProps) {
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [consultantName, setConsultantName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await isPngOrJpeg(file);
    if (!ok) {
      showToast('Logo must be a PNG or JPEG under 5 MB', 'error');
      e.target.value = ''; // reset so the same file can be re-selected
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);

    try {
      // Build vector ops from plan data (no DOM capture needed).
      const watermark = isWatermarkRequired();
      const ops = buildVectorPdfOps(plan, currentFloor, { watermark });

      // Create PDF (Landscape, Letter size: 11 x 8.5 inches)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: 'letter',
      });

      // Draw Border
      pdf.setDrawColor(40, 40, 40);
      pdf.setLineWidth(0.02);
      pdf.rect(0.25, 0.25, 10.5, 8); // Outer border
      pdf.rect(0.3, 0.3, 10.4, 7.9); // Inner border

      // Title Block Area (Bottom Right)
      pdf.rect(7.5, 6.5, 3.2, 1.7);

      // Add Logo
      if (logoUrl) {
        pdf.addImage(logoUrl, 'PNG', 7.6, 6.6, 1.2, 0.6);
      }

      // Add Text to Title Block
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(projectName || 'Vastu Floor Plan', 7.6, 7.5);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Client: ${clientName || 'N/A'}`, 7.6, 7.7);
      pdf.text(`Consultant: ${consultantName || 'N/A'}`, 7.6, 7.9);

      pdf.setFontSize(8);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 7.6, 8.1);
      pdf.text(`Scale: 1" = ${plan.unit === 'ft' ? '10 ft' : '3 m'} (Approx)`, 9.2, 8.1);
      pdf.text(`Floor: ${formatFloorLabel(currentFloor, plan.floorNames)}`, 7.6, 7.3);

      // Render the vector floor plan into the drawing area.
      // The ops are already scaled to fit 7×7.7 inches; center them.
      const scale = computePdfScale(plan);
      const plotW = plan.plotWidth * scale;
      const plotH = plan.plotHeight * scale;
      const xOffset = 0.4 + (7 - plotW) / 2;
      const yOffset = 0.4 + (7.7 - plotH) / 2;
      renderOpsToPdf(ops, pdf, xOffset, yOffset);

      // Save PDF
      pdf.save(`${clientName || 'Project'}_VastuPlan.pdf`);
      onClose();
      // Sentry breadcrumb for PDF export
      addBreadcrumb('PDF Exported', 'export', { floor: currentFloor, vector: true, watermark });
    } catch (error) {
      console.error('PDF Export failed:', error);
      alert('Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-fg/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg rounded-2xl shadow-elev-raised w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-border-soft flex items-center justify-between bg-bg">
          <h2 className="text-lg font-bold text-fg-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Presentation Export
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-meta hover:text-muted hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Villa 104 Design"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-1">Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g., Mr. Sharma"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-1">
              Consultant / Architect Name
            </label>
            <input
              type="text"
              value={consultantName}
              onChange={(e) => setConsultantName(e.target.value)}
              placeholder="e.g., Vastu Experts Inc."
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-1">
              Company Logo (Optional)
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative w-16 h-16 border border-border rounded-lg overflow-hidden bg-bg">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  <button
                    onClick={() => setLogoUrl(null)}
                    className="absolute top-0 right-0 p-1 bg-danger text-accent-on rounded-bl-lg hover:bg-danger"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center w-16 h-16 border-2 border-dashed border-border rounded-lg text-meta hover:text-accent hover:border-accent transition-colors"
                >
                  <Upload className="w-6 h-6" />
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/png, image/jpeg"
                className="hidden"
              />
              <span className="text-xs text-muted">
                Recommended: PNG with transparent background.
              </span>
            </div>
          </div>

          {/* Entitlement status line (M-1) */}
          <div className="text-xs text-meta text-center">
            {isWatermarkRequired() ? 'Free plan · watermark included' : 'Pro · watermark-free'}
          </div>
        </div>

        <div className="px-6 py-4 bg-bg border-t border-border-soft flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted hover:bg-surface rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-on text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
}
