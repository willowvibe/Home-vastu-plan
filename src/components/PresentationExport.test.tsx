import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { PresentationExport } from './PresentationExport';

// Spy that the mock exposes; the test asserts it was called.
const showToast = vi.fn();

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast, removeToast: vi.fn() }),
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
