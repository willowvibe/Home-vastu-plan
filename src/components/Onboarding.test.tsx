import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Onboarding } from './Onboarding';

// S-17 tests use real DOM assertions, not jest-dom matchers — see
// RulerOverlay.test.tsx for the codebase rationale (the jest-dom type
// augmenting import lives in src/test/setup.ts, which tsc excludes).

describe('Onboarding (S-17: dialog a11y)', () => {
  it('renders as a dialog with aria-modal and a labelled title', () => {
    const { container } = render(<Onboarding onClose={vi.fn()} />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    // aria-labelledby points at the h2 id.
    const titleId = dialog?.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    const title = container.querySelector(`h2#${titleId}`);
    expect(title).not.toBeNull();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    const { container } = render(<Onboarding onClose={onClose} />);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus at the boundary (Tab on last element wraps to first)', () => {
    const { container } = render(<Onboarding onClose={vi.fn()} />);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
    const last = focusables[focusables.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(focusables[0]);
  });

  it('traps focus at the start (Shift+Tab on first element wraps to last)', () => {
    const { container } = render(<Onboarding onClose={vi.fn()} />);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
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
