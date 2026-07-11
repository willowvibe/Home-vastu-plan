import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileTabs } from './MobileTabs';

describe('MobileTabs', () => {
  it('renders the three tabs and calls the setter', () => {
    const setMobileTab = vi.fn();
    render(<MobileTabs mobileTab="canvas" setMobileTab={setMobileTab} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Canvas')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Settings'));
    expect(setMobileTab).toHaveBeenCalledWith('settings');
  });

  it('uses a minimum 44px touch target for each tab', () => {
    render(<MobileTabs mobileTab="canvas" setMobileTab={vi.fn()} />);

    ['Settings', 'Canvas', 'Properties'].forEach((label) => {
      expect(screen.getByText(label).closest('button')).toHaveClass('min-h-11');
    });
  });
});
