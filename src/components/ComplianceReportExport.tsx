import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { FileText, X, Download, Loader2 } from 'lucide-react';
import { FloorPlan } from '../types';
import { addBreadcrumb } from '../services/sentry';
import { useToast } from './Toast';
import { fitInside } from '../lib/pdfFit';
import { buildComplianceReportData } from '../lib/complianceReport';

interface ComplianceReportExportProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  plan: FloorPlan;
  currentFloor: number;
  analysis: string | null;
  onClose: () => void;
}

export function ComplianceReportExport({
  canvasRef,
  plan,
  currentFloor,
  analysis,
  onClose,
}: ComplianceReportExportProps) {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [consultantName, setConsultantName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);

    try {
      const data = buildComplianceReportData(
        plan,
        currentFloor,
        analysis,
        projectName,
        clientName,
        consultantName
      );

      const imgData = await toPng(canvasRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      });

      const margin = 0.5;
      let y = margin;
      const pageWidth = 8.5;
      const pageHeight = 11;
      const textWidth = pageWidth - margin * 2;

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Vastu Compliance Report', margin, y);
      y += 0.35;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${data.generatedAt}`, margin, y);
      y += 0.2;
      pdf.text(`Project: ${data.projectName || 'VastuPlan Project'}`, margin, y);
      y += 0.2;
      pdf.text(`Client: ${data.clientName || 'N/A'}`, margin, y);
      y += 0.2;
      pdf.text(`Consultant: ${data.consultantName || 'N/A'}`, margin, y);
      y += 0.2;
      pdf.text(`Floor: ${data.currentFloorLabel}`, margin, y);
      y += 0.35;

      // Overall score block
      pdf.setDrawColor(40, 40, 40);
      pdf.setLineWidth(0.01);
      pdf.rect(margin, y - 0.15, textWidth, 0.55);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(
        `Overall Vastu Score: ${data.overallScore}/100 (${data.overallStatus.toUpperCase()})`,
        margin + 0.05,
        y + 0.15
      );
      y += 0.55;

      // AI analysis
      if (data.analysis) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('AI Vastu Analysis & Build Guide', margin, y);
        y += 0.22;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const analysisLines = pdf.splitTextToSize(data.analysis, textWidth);
        pdf.text(analysisLines, margin, y);
        y += analysisLines.length * 0.14 + 0.2;
      }

      // Room table
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Room Compliance (${data.rooms.length} rooms)`, margin, y);
      y += 0.25;

      if (data.rooms.length === 0) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No rooms on this floor.', margin, y);
        y += 0.25;
      } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        const headers = ['Room', 'Dir', 'Score', 'Status', 'Area', 'Feedback'];
        const colWidths = [1.4, 0.5, 0.5, 0.7, 0.6, 4.3];
        let x = margin;
        headers.forEach((h, i) => {
          pdf.text(h, x, y);
          x += colWidths[i];
        });
        y += 0.18;
        pdf.setLineWidth(0.01);
        pdf.line(margin, y - 0.05, pageWidth - margin, y - 0.05);

        pdf.setFont('helvetica', 'normal');
        data.rooms.forEach((row) => {
          // Wrap feedback to the available width; advance y by the tallest cell.
          const feedbackLines = pdf.splitTextToSize(row.feedback, colWidths[5]);
          const rowHeight = Math.max(0.18, feedbackLines.length * 0.13 + 0.05);

          if (y + rowHeight > pageHeight - margin - 2) {
            pdf.addPage();
            y = margin + 0.3;
          }

          x = margin;
          pdf.text(row.type, x, y);
          x += colWidths[0];
          pdf.text(row.direction, x, y);
          x += colWidths[1];
          pdf.text(String(row.score), x, y);
          x += colWidths[2];
          pdf.text(row.status, x, y);
          x += colWidths[3];
          pdf.text(`${row.area} sq ft`, x, y);
          x += colWidths[4];
          pdf.text(feedbackLines, x, y);
          y += rowHeight;
        });
      }

      y += 0.2;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total built-up area (this floor): ${data.totalBuiltUpArea} sq ft`, margin, y);
      y += 0.4;

      // Floor plan image
      if (y + 3 > pageHeight - margin) {
        pdf.addPage();
        y = margin + 0.2;
      }
      const imgProps = pdf.getImageProperties(imgData);
      const { w: pdfWidth, h: pdfHeight } = fitInside(imgProps.width, imgProps.height, 7.5, 4);
      const xOffset = margin + (textWidth - pdfWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, y, pdfWidth, pdfHeight);

      pdf.save(`${data.projectName || 'VastuPlan'}_Compliance_Report.pdf`);
      onClose();
      addBreadcrumb('Compliance PDF exported', 'export', { floor: currentFloor });
    } catch (error) {
      console.error('Compliance report export failed:', error);
      showToast('Failed to export compliance report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-fg/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg dark:bg-surface rounded-2xl shadow-elev-raised w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-border-soft dark:border-border flex items-center justify-between bg-bg dark:bg-fg/50">
          <h2 className="text-lg font-bold text-fg-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Compliance Report
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-meta hover:text-muted dark:hover:text-meta hover:bg-surface dark:hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-2 dark:text-meta mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Villa 104 Design"
              data-testid="compliance-project-name"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none bg-bg dark:bg-surface text-fg dark:text-fg-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 dark:text-meta mb-1">
              Client Name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Mr. Sharma"
              data-testid="compliance-client-name"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none bg-bg dark:bg-surface text-fg dark:text-fg-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 dark:text-meta mb-1">
              Consultant / Architect Name
            </label>
            <input
              type="text"
              value={consultantName}
              onChange={(e) => setConsultantName(e.target.value)}
              placeholder="e.g. Vastu Experts Inc."
              data-testid="compliance-consultant-name"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none bg-bg dark:bg-surface text-fg dark:text-fg-2"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-bg dark:bg-fg/50 border-t border-border-soft dark:border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted dark:text-meta hover:bg-surface dark:hover:bg-surface rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            data-testid="generate-compliance-report"
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-on text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
