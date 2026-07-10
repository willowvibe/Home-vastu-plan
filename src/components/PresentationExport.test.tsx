import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { PresentationExport } from './PresentationExport';

// Spy that the mock exposes; the test asserts it was called.
const showToast = vi.fn();

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast, removeToast: vi.fn() }),
}));

// Mock the vector PDF export pipeline (M-1: replaced toPng with
// buildVectorPdfOps + renderOpsToPdf). Use vi.hoisted so the mock
// functions are available inside the hoisted vi.mock factory.
const { buildVectorPdfOps, renderOpsToPdf, computePdfScale } = vi.hoisted(() => ({
  buildVectorPdfOps: vi.fn<() => unknown[]>(() => []),
  renderOpsToPdf: vi.fn(),
  computePdfScale: vi.fn(() => 0.2),
}));

vi.mock('../lib/exportVectorPdf', () => ({
  buildVectorPdfOps,
  renderOpsToPdf,
  computePdfScale,
}));

// Mock entitlements — default to watermark required (free plan).
const { isWatermarkRequired } = vi.hoisted(() => ({
  isWatermarkRequired: vi.fn(() => true),
}));

vi.mock('../services/entitlements', () => ({
  isWatermarkRequired,
}));

const pdfSave = vi.fn();
// jsPDF is `new`-constructed by PresentationExport. The mock below
// must be a constructor (function) — a plain vi.fn() returning an
// object throws `is not a constructor`. We use a real function that
// returns the same shape on call.
function MockJsPDF() {
  return {
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    rect: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(), // still needed for logo upload
    save: (...args: unknown[]) => pdfSave(...args),
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setLineDashPattern: vi.fn(),
    line: vi.fn(),
    circle: vi.fn(),
    GState: vi.fn(() => ({})),
    setGState: vi.fn(),
  };
}
vi.mock('jspdf', () => ({
  jsPDF: MockJsPDF,
}));

const PLAN = {
  rooms: [],
  plotWidth: 30,
  plotHeight: 40,
  setbacks: { top: 0, bottom: 0, left: 0, right: 0 },
  unit: 'ft' as const,
  northAngle: 0,
  layers: [],
  roadDirection: 'N' as const,
  comments: [],
};

const makeFile = (bytes: number[], type = 'image/png', name = 'logo.png') => {
  return new File([new Uint8Array(bytes)], name, { type });
};

describe('PresentationExport (S-15: logo MIME validation)', () => {
  it('accepts a valid PNG (no toast is shown)', async () => {
    showToast.mockClear();
    render(<PresentationExport plan={PLAN} currentFloor={0} onClose={vi.fn()} />);
    const file = makeFile([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await new Promise((r) => setTimeout(r, 30));
    // No error toast on a valid PNG.
    expect(showToast).not.toHaveBeenCalled();
  });

  it('rejects a non-image (PDF magic) — toast is shown', async () => {
    showToast.mockClear();
    render(<PresentationExport plan={PLAN} currentFloor={0} onClose={vi.fn()} />);
    const file = makeFile(
      [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34],
      'application/pdf',
      'evil.pdf'
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      // The implementation calls showToast with an error message on rejection.
      expect(showToast).toHaveBeenCalled();
    });
  });

  it('rejects files larger than 5 MB — toast is shown', async () => {
    showToast.mockClear();
    render(<PresentationExport plan={PLAN} currentFloor={0} onClose={vi.fn()} />);
    // 6 MB of zeros with PNG magic prefix.
    const big = new Uint8Array(6 * 1024 * 1024);
    big[0] = 0x89;
    big[1] = 0x50;
    big[2] = 0x4e;
    big[3] = 0x47;
    const file = new File([big], 'huge.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(showToast).toHaveBeenCalled();
    });
  });
});

describe('PresentationExport (M-1: vector PDF generation via buildVectorPdfOps + renderOpsToPdf)', () => {
  beforeEach(() => {
    buildVectorPdfOps.mockClear();
    renderOpsToPdf.mockClear();
    pdfSave.mockClear();
    showToast.mockClear();
    isWatermarkRequired.mockReturnValue(true);
  });

  it('calls buildVectorPdfOps with plan, floor, and watermark flag', async () => {
    const onClose = vi.fn();
    render(<PresentationExport plan={PLAN} currentFloor={0} onClose={onClose} />);
    const buttons = Array.from(document.querySelectorAll('button'));
    const gen = buttons.find((b) => b.textContent?.includes('Generate PDF')) as
      | HTMLButtonElement
      | undefined;
    expect(gen).toBeDefined();
    fireEvent.click(gen!);
    await waitFor(() => {
      expect(buildVectorPdfOps).toHaveBeenCalledWith(PLAN, 0, { watermark: true });
    });
  });

  it('calls renderOpsToPdf with ops and pdf instance', async () => {
    const onClose = vi.fn();
    render(<PresentationExport plan={PLAN} currentFloor={0} onClose={onClose} />);
    const buttons = Array.from(document.querySelectorAll('button'));
    const gen = buttons.find((b) => b.textContent?.includes('Generate PDF')) as
      | HTMLButtonElement
      | undefined;
    expect(gen).toBeDefined();
    fireEvent.click(gen!);
    await waitFor(() => {
      expect(renderOpsToPdf).toHaveBeenCalled();
      // First arg is the ops array (mocked to []), second is a jsPDF instance,
      // third and fourth are originX/originY centering offsets.
      const args = renderOpsToPdf.mock.calls[0] as unknown[];
      expect(args[0]).toEqual([]);
      expect(args[1]).toBeDefined();
      expect(typeof args[2]).toBe('number');
      expect(typeof args[3]).toBe('number');
    });
  });

  it('saves PDF and closes modal on success', async () => {
    const onClose = vi.fn();
    render(<PresentationExport plan={PLAN} currentFloor={0} onClose={onClose} />);
    const buttons = Array.from(document.querySelectorAll('button'));
    const gen = buttons.find((b) => b.textContent?.includes('Generate PDF')) as
      | HTMLButtonElement
      | undefined;
    expect(gen).toBeDefined();
    fireEvent.click(gen!);
    await waitFor(() => {
      expect(pdfSave).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows watermark-free status when Pro is entitled', () => {
    isWatermarkRequired.mockReturnValue(false);
    render(<PresentationExport plan={PLAN} currentFloor={0} onClose={vi.fn()} />);
    expect(document.body.textContent).toContain('Pro');
    expect(document.body.textContent).toContain('watermark-free');
  });

  it('shows watermark-included status on free plan', () => {
    isWatermarkRequired.mockReturnValue(true);
    render(<PresentationExport plan={PLAN} currentFloor={0} onClose={vi.fn()} />);
    expect(document.body.textContent).toContain('Free plan');
    expect(document.body.textContent).toContain('watermark included');
  });
});
