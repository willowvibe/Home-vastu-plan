import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VastuTour } from './VastuTour';
import { INITIAL_PLAN } from '../constants/floorPlanConstants';

const mockPlan = {
  ...INITIAL_PLAN,
  plotWidth: 30,
  plotHeight: 30,
  setbacks: { top: 1, right: 1, bottom: 1, left: 1 },
};

describe('VastuTour', () => {
  it('renders the first zone and step counter', () => {
    render(<VastuTour plan={mockPlan} pixelsPerFoot={20} onClose={vi.fn()} />);

    expect(screen.getByTestId('vastu-tour-overlay')).toBeTruthy();
    expect(screen.getByTestId('vastu-tour-highlight')).toBeTruthy();
    expect(screen.getByText('1 / 9')).toBeTruthy();
  });

  it('advances through zones with Next and finishes on the last step', () => {
    render(<VastuTour plan={mockPlan} pixelsPerFoot={20} onClose={vi.fn()} />);

    expect(screen.getByText('1 / 9')).toBeTruthy();

    fireEvent.click(screen.getByTestId('vastu-tour-next'));
    expect(screen.getByText('2 / 9')).toBeTruthy();

    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByTestId('vastu-tour-next'));
    }
    expect(screen.getByText('9 / 9')).toBeTruthy();
    expect(screen.getByTestId('vastu-tour-finish')).toBeTruthy();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<VastuTour plan={mockPlan} pixelsPerFoot={20} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('vastu-tour-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the finish button is clicked', () => {
    const onClose = vi.fn();
    render(<VastuTour plan={mockPlan} pixelsPerFoot={20} onClose={onClose} />);

    for (let i = 0; i < 8; i++) {
      fireEvent.click(screen.getByTestId('vastu-tour-next'));
    }
    fireEvent.click(screen.getByTestId('vastu-tour-finish'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not go below step 0', () => {
    render(<VastuTour plan={mockPlan} pixelsPerFoot={20} onClose={vi.fn()} />);

    const prev = screen.getByTestId('vastu-tour-prev');
    expect(prev).toBeDisabled();
  });
});
