import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from './Toolbar';

const baseProps = () => ({
  zoom: 1,
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  historyIndex: 1,
  historyLength: 3,
  showVastuGrid: false,
  onToggleGrid: vi.fn(),
  onToggleTour: vi.fn(),
  onShare: vi.fn(),
  onShareQR: vi.fn(),
  onExport: vi.fn(),
  isExporting: false,
  onPrint: vi.fn(),
  onExportJSON: vi.fn(),
  onExportSVG: vi.fn(),
  onPresentationExport: vi.fn(),
  onComplianceExport: vi.fn(),
  onMeasure: vi.fn(),
});

describe('Toolbar', () => {
  it('fires undo, redo, zoom, and export callbacks', () => {
    const props = baseProps();
    render(<Toolbar {...props} />);

    fireEvent.click(screen.getByTitle('Undo (Ctrl+Z)'));
    expect(props.undo).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Redo (Ctrl+Y)'));
    expect(props.redo).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(props.onZoomIn).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Toggle Vastu Grid'));
    expect(props.onToggleGrid).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Vastu Zone Tour'));
    expect(props.onToggleTour).toHaveBeenCalled();

    fireEvent.click(screen.getByText('PNG'));
    expect(props.onExport).toHaveBeenCalled();
  });

  it('uses at least 44px touch targets for icon buttons', () => {
    render(<Toolbar {...baseProps()} />);

    const iconButtons = [
      'Toggle Vastu Grid',
      'Vastu Zone Tour',
      'Undo (Ctrl+Z)',
      'Redo (Ctrl+Y)',
      'Zoom Out',
      'Zoom In',
      'Share View-Only Link (read-only)',
      'Share Comment-Enabled Link (reviewers can add notes)',
      'Password-Protected Share Link (view-only)',
      'Show QR Code for this plan',
    ];

    iconButtons.forEach((title) => {
      const btn = screen.getByTitle(title).closest('button');
      expect(btn).not.toBeNull();
      const cls = btn?.className ?? '';
      expect(cls.includes('w-11') || cls.includes('min-h-11')).toBe(true);
    });
  });

  it('uses a minimum 44px height for text buttons', () => {
    render(<Toolbar {...baseProps()} />);

    [
      'Presentation Export',
      'Compliance',
      'PNG',
      'Print',
      'JSON Export',
      'Ruler',
      'SVG Export',
    ].forEach((label) => {
      expect(screen.getByText(label).closest('button')).toHaveClass('min-h-11');
    });
  });
});
