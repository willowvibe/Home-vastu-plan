import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { PresentationExport } from './PresentationExport';

// Spy that the mock exposes; the test asserts it was called.
const showToast = vi.fn();

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast, removeToast: vi.fn() }),
}));

// Mock the heavy export libraries so the test runs in jsdom. We capture
// the toPng() result and the jsPDF.save() call.
const toPng = vi.fn(
  async (_node: HTMLElement) =>
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
);
const pdfSave = vi.fn();
const pdfAddImage = vi.fn();
vi.mock('html-to-image', () => ({
  toPng: (node: HTMLElement) => toPng(node),
}));
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
    addImage: (...args: unknown[]) => pdfAddImage(...args),
    getImageProperties: vi.fn(() => ({ width: 100, height: 100 })),
    save: (...args: unknown[]) => pdfSave(...args),
  };
}
vi.mock('jspdf', () => ({
  jsPDF: MockJsPDF,
}));

const noopRef = { current: null as HTMLDivElement | null };
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

// U-6: the canvasRef passed in is what toPng() receives. The audit
// surfaced that App.tsx used to mount TWO <div ref={canvasContainerRef}>
// elements, and React's ref collision meant toPng() was called on a
// hidden print-only div (0×0), producing an empty image and crashing
// jsPDF.addImage. The App.tsx fix removed the duplicate ref so the
// ref always points to the visible canvas. This test pins the
// component-side contract: whatever element the caller hands us is
// what gets captured.

describe('PresentationExport (S-15: logo MIME validation)', () => {
  it('accepts a valid PNG (no toast is shown)', async () => {
    showToast.mockClear();
    render(
      <PresentationExport
        canvasRef={noopRef as any}
        plan={PLAN}
        currentFloor={0}
        onClose={vi.fn()}
      />
    );
    const file = makeFile([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await new Promise((r) => setTimeout(r, 30));
    // No error toast on a valid PNG.
    expect(showToast).not.toHaveBeenCalled();
  });

  it('rejects a non-image (PDF magic) — toast is shown', async () => {
    showToast.mockClear();
    render(
      <PresentationExport
        canvasRef={noopRef as any}
        plan={PLAN}
        currentFloor={0}
        onClose={vi.fn()}
      />
    );
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
    render(
      <PresentationExport
        canvasRef={noopRef as any}
        plan={PLAN}
        currentFloor={0}
        onClose={vi.fn()}
      />
    );
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

describe('PresentationExport (U-6: PDF generation uses the ref element)', () => {
  beforeEach(() => {
    toPng.mockClear();
    pdfSave.mockClear();
    pdfAddImage.mockClear();
    showToast.mockClear();
  });

  it('passes canvasRef.current to toPng (not some other element)', async () => {
    // The whole PDF path runs on the element the caller hands us.
    // U-6 was that App.tsx was passing a 0×0 print-only div because
    // of a React ref collision. This test pins: whatever element the
    // caller attaches to canvasRef, that's what toPng receives.
    const div = document.createElement('div');
    document.body.appendChild(div);
    const ref = { current: div };
    const onClose = vi.fn();
    render(
      <PresentationExport canvasRef={ref as any} plan={PLAN} currentFloor={0} onClose={onClose} />
    );
    const buttons = Array.from(document.querySelectorAll('button'));
    const gen = buttons.find((b) => b.textContent?.includes('Generate PDF')) as
      | HTMLButtonElement
      | undefined;
    expect(gen).toBeDefined();
    fireEvent.click(gen!);
    await waitFor(() => {
      // toPng is called with the caller's element.
      expect(toPng).toHaveBeenCalled();
      const calledWith = (toPng.mock.calls[0] as unknown[] | undefined)?.[0];
      expect(calledWith).toBe(div);
      // jsPDF.addImage received the (mocked) dataURL, not 'UNKNOWN'.
      expect(pdfAddImage).toHaveBeenCalled();
      const imgData = pdfAddImage.mock.calls[0]?.[0] as string;
      expect(imgData).toMatch(/^data:image\/png;base64,/);
      // Save was invoked with the user-supplied client name (or fallback).
      expect(pdfSave).toHaveBeenCalled();
      // Modal closes on success (line 127 of PresentationExport.tsx).
      expect(onClose).toHaveBeenCalled();
    });
    document.body.removeChild(div);
  });
});
