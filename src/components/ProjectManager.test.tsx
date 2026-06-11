import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { ProjectManager } from './ProjectManager';

// Spy that the mock exposes; the test asserts it was called.
const showToast = vi.fn();

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast, removeToast: vi.fn() }),
}));

const noop = () => {};

const makePlan = () => ({
  rooms: [],
  plotWidth: 30,
  plotHeight: 40,
  setbacks: { top: 0, bottom: 0, left: 0, right: 0 },
  unit: 'ft' as const,
  northAngle: 0,
  layers: [],
  roadDirection: 'N' as const,
  comments: [],
});

describe('ProjectManager (S-16: localStorage try/catch + toast)', () => {
  beforeEach(() => {
    showToast.mockClear();
    (localStorage.setItem as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it('saves successfully without showing a toast', () => {
    (localStorage.setItem as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      // No-op: no error.
    });
    render(<ProjectManager currentPlan={makePlan() as any} onLoadPlan={noop} onClose={noop} />);
    const input = screen.getByPlaceholderText(/New Project Name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My House' } });
    // The "+" create button is the one immediately following the input.
    const createBtn = input.nextElementSibling as HTMLButtonElement;
    fireEvent.click(createBtn);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'vastu_projects',
      expect.stringContaining('My House')
    );
    expect(showToast).not.toHaveBeenCalled();
  });

  it('shows a QuotaExceededError toast when localStorage.setItem throws', () => {
    const quotaErr = new DOMException('quota', 'QuotaExceededError');
    (localStorage.setItem as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw quotaErr;
    });
    render(<ProjectManager currentPlan={makePlan() as any} onLoadPlan={noop} onClose={noop} />);
    const input = screen.getByPlaceholderText(/New Project Name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Will Fail' } });
    const createBtn = input.nextElementSibling as HTMLButtonElement;
    fireEvent.click(createBtn);
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/storage is full/i), 'error');
  });

  it('shows a generic toast for non-quota DOMExceptions', () => {
    const otherErr = new DOMException('some other failure', 'SecurityError');
    (localStorage.setItem as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw otherErr;
    });
    render(<ProjectManager currentPlan={makePlan() as any} onLoadPlan={noop} onClose={noop} />);
    const input = screen.getByPlaceholderText(/New Project Name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Also Fails' } });
    const createBtn = input.nextElementSibling as HTMLButtonElement;
    fireEvent.click(createBtn);
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/could not save the project/i),
      'error'
    );
  });
});
