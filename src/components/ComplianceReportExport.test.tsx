import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { ComplianceReportExport } from './ComplianceReportExport';

const showToast = vi.fn();
vi.mock('./Toast', () => ({
  useToast: () => ({ showToast, removeToast: vi.fn() }),
}));

const toPng = vi.fn(
  async (_node: HTMLElement) =>
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
);
const pdfSave = vi.fn();
const pdfAddImage = vi.fn();
vi.mock('html-to-image', () => ({
  toPng: (node: HTMLElement) => toPng(node),
}));

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
    splitTextToSize: vi.fn((text: string) => [text]),
    save: (...args: unknown[]) => pdfSave(...args),
    addPage: vi.fn(),
  };
}
vi.mock('jspdf', () => ({
  jsPDF: MockJsPDF,
}));

vi.mock('../services/sentry', () => ({
  addBreadcrumb: vi.fn(),
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

describe('ComplianceReportExport (G-6)', () => {
  beforeEach(() => {
    toPng.mockClear();
    pdfSave.mockClear();
    pdfAddImage.mockClear();
    showToast.mockClear();
  });

  it('captures the supplied canvas and generates a PDF', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const ref = { current: div };
    const onClose = vi.fn();

    render(
      <ComplianceReportExport
        canvasRef={ref}
        plan={PLAN}
        currentFloor={0}
        analysis={null}
        onClose={onClose}
      />
    );

    const generate = screen.getByTestId('generate-compliance-report');
    expect(generate.textContent).toContain('Generate Report');
    fireEvent.click(generate);

    await waitFor(() => {
      expect(toPng).toHaveBeenCalled();
      expect((toPng.mock.calls[0] as unknown[])[0]).toBe(div);
      expect(pdfAddImage).toHaveBeenCalled();
      expect(pdfSave).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    document.body.removeChild(div);
  });

  it('renders project metadata inputs', () => {
    render(
      <ComplianceReportExport
        canvasRef={{ current: null }}
        plan={PLAN}
        currentFloor={0}
        analysis={null}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('compliance-project-name')).toBeInTheDocument();
    expect(screen.getByTestId('compliance-client-name')).toBeInTheDocument();
    expect(screen.getByTestId('compliance-consultant-name')).toBeInTheDocument();
  });
});
