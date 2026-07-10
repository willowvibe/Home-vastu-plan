import React, { useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy, QrCode } from 'lucide-react';
import { copyToClipboardWithFallback } from '../utils';
import { useToast } from './Toast';

interface QrShareModalProps {
  url: string;
  onClose: () => void;
}

export function QrShareModal({ url, onClose }: QrShareModalProps) {
  const qrRef = useRef<SVGSVGElement>(null);
  const { showToast } = useToast();

  const handleCopyUrl = useCallback(async () => {
    const result = await copyToClipboardWithFallback(url);
    if (result.ok) {
      showToast('Share link copied to clipboard', 'success');
    } else {
      showToast('Could not copy link automatically', 'error');
    }
  }, [url, showToast]);

  const handleDownloadSvg = useCallback(() => {
    const svg = qrRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vastuplan-share-qr.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showToast('QR code downloaded as SVG', 'success');
  }, [showToast]);

  return (
    <div
      className="fixed inset-0 bg-fg/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-share-title"
      data-testid="qr-share-modal"
    >
      <div className="bg-surface dark:bg-surface-warm rounded-2xl shadow-elev-raised w-full max-w-sm overflow-hidden border border-border">
        <div className="px-6 py-4 border-b border-border-soft flex items-center justify-between bg-bg dark:bg-fg/5">
          <h2 id="qr-share-title" className="text-lg font-bold text-fg-2 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-accent" />
            Scan to Open Plan
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-meta hover:text-muted hover:bg-surface-warm dark:hover:bg-surface rounded-lg transition-colors"
            aria-label="Close QR share dialog"
            data-testid="qr-share-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          <div className="p-4 bg-surface-100 dark:bg-bg rounded-xl border border-border-soft">
            <QRCodeSVG
              value={url}
              size={200}
              level="M"
              includeMargin
              ref={qrRef}
              data-testid="qr-code-svg"
            />
          </div>

          <p className="text-sm text-muted text-center leading-relaxed">
            Anyone who scans this code can open the current floor plan in view mode. The link does
            not update automatically if you edit the plan after sharing.
          </p>

          <div className="w-full flex flex-col gap-2">
            <button
              onClick={handleCopyUrl}
              className="w-full flex items-center justify-center gap-2 bg-surface border border-border hover:bg-surface-warm text-fg-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              data-testid="qr-copy-link"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={handleDownloadSvg}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-accent-on px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              data-testid="qr-download-svg"
            >
              <Download className="w-4 h-4" />
              Download QR SVG
            </button>
          </div>

          <div className="w-full">
            <label className="block text-xs font-medium text-meta mb-1">Share URL</label>
            <input
              type="text"
              readOnly
              value={url}
              className="w-full px-3 py-2 text-xs font-mono border border-border rounded-lg bg-bg dark:bg-surface text-fg-2 break-all"
              onFocus={(e) => e.target.select()}
              data-testid="qr-share-url"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
