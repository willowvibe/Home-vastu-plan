import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Onboarding } from './Onboarding';

describe('Onboarding (S-17: dialog a11y)', () => {
  it('renders as a dialog with aria-modal and a label', () => {
    render(<Onboarding onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The title is wired up via aria-labelledby pointing at the h2 id.
    const title = screen.getByRole('heading', { level: 2 });
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<Onboarding onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus at the boundary (Tab on last element wraps to first)', () => {
    render(<Onboarding onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    // Focusables: skip button (aria-label), 6 dot indicators, back (n/a
    // on first step), next button. On step 0 there's no Back, so the
    // last focusable is "Next".
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
    const last = focusables[focusables.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);
    // Tab at the end wraps to first.
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(focusables[0]);
  });

  it('traps focus at the start (Shift+Tab on first element wraps to last)', () => {
    render(<Onboarding onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
    focusables[0].focus();
    expect(document.activeElement).toBe(focusables[0]);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
  });
});
