import React, { useState, useRef } from "react";
import { FloorPlan } from "../types";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { FileText, X, Upload, Loader2, Download } from "lucide-react";

interface PresentationExportProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  plan: FloorPlan;
  currentFloor: number;
  onClose: () => void;
}

export function PresentationExport({
  canvasRef,
  plan,
  currentFloor,
  onClose,
}: PresentationExportProps) {
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);

    try {
      // Capture canvas
      const imgData = await toPng(canvasRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });

      // Create PDF (Landscape, Letter size: 11 x 8.5 inches)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: "letter",
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
        pdf.addImage(logoUrl, "PNG", 7.6, 6.6, 1.2, 0.6);
      }

      // Add Text to Title Block
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(projectName || "Vastu Floor Plan", 7.6, 7.5);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Client: ${clientName || "N/A"}`, 7.6, 7.7);
      pdf.text(`Consultant: ${consultantName || "N/A"}`, 7.6, 7.9);

      pdf.setFontSize(8);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 7.6, 8.1);
      pdf.text(
        `Scale: 1" = ${plan.unit === "ft" ? "10 ft" : "3 m"} (Approx)`,
        9.2,
        8.1,
      );
      pdf.text(
        `Floor: ${currentFloor === 0 ? "Ground" : `Floor ${currentFloor}`}`,
        7.6,
        7.3,
      );

      // Add the Floor Plan Image
      // We need to scale it to fit the remaining area (approx 7x7 inches)
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = 7;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Center the image in the left area
      const xOffset = 0.4 + (7 - pdfWidth) / 2;
      const yOffset = 0.4 + (7.7 - pdfHeight) / 2;

      pdf.addImage(imgData, "PNG", xOffset, yOffset, pdfWidth, pdfHeight);

      // Save PDF
      pdf.save(`${clientName || "Project"}_VastuPlan.pdf`);
      onClose();
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Presentation Export
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Villa 104 Design"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client Name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g., Mr. Sharma"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Consultant / Architect Name
            </label>
            <input
              type="text"
              value={consultantName}
              onChange={(e) => setConsultantName(e.target.value)}
              placeholder="e.g., Vastu Experts Inc."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company Logo (Optional)
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setLogoUrl(null)}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
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
              <span className="text-xs text-slate-500">
                Recommended: PNG with transparent background.
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
