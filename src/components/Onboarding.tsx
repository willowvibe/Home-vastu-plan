import React, { useState, useRef, useEffect, useId } from 'react';
import {
  X,
  MousePointer,
  Move,
  Grid,
  Sparkles,
  Download,
  ChevronRight,
  ChevronLeft,
  Layers,
} from 'lucide-react';

interface OnboardingProps {
  onClose: () => void;
}

const STEPS = [
  {
    title: 'Welcome to VastuPlan 2D',
    description:
      'Design floor plans with Vastu Shastra compliance. This quick tour will show you the basics.',
    icon: Layers,
  },
  {
    title: 'Add Rooms',
    description:
      'Click any room type in the left sidebar to add it to your canvas. Bedrooms, Kitchens, Living Rooms, and more.',
    icon: MousePointer,
  },
  {
    title: 'Drag & Resize',
    description:
      'Drag rooms to position them. Use the blue corner handles to resize. Rooms snap against each other automatically.',
    icon: Move,
  },
  {
    title: 'Vastu Grid',
    description:
      'Toggle the Vastu Grid (G key) to see the 8 directional zones. Place rooms in their ideal zones for better scores.',
    icon: Grid,
  },
  {
    title: 'AI Analysis',
    description:
      "Click 'Analyze Floor Plan' to get AI-powered Vastu compliance feedback and construction tips.",
    icon: Sparkles,
  },
  {
    title: 'Export & Share',
    description:
      'Export your design as PNG, PDF, SVG, or JSON. Share view-only links with clients or family.',
    icon: Download,
  },
];

export const Onboarding: React.FC<OnboardingProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const titleId = useId();

  // S-17: a11y plumbing for the modal.
  //   - role="dialog" + aria-modal="true" so AT users land in a dialog
  //     context, not the page background.
  //   - aria-labelledby points at the step title (h2).
  //   - On mount, focus the first focusable element so keyboard users
  //     can Tab through the controls. On unmount, restore focus to
  //     whatever was focused before (the "Open onboarding" button).
  //   - Esc closes the modal.
  //   - Focus trap: Tab/Shift+Tab at the boundary wraps inside.
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element inside the dialog (or the
    // dialog itself as a fallback) on the next tick, after layout.
    const dialog = dialogRef.current;
    if (!dialog) return;
    const firstFocusable = dialog.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable ?? dialog).focus();

    return () => {
      // Restore focus on close. Guard against the element having
      // been removed from the DOM in the meantime.
      const prev = previouslyFocusedRef.current;
      if (prev && document.body.contains(prev)) {
        prev.focus();
      }
    };
  }, []);

  // S-17: Esc to close + focus trap. Bound at the dialog level so it
  // doesn't fire when the user is, say, typing in a future text input.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-fg/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // tabIndex makes the dialog itself focusable as a fallback when
        // the focusable query returns nothing.
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="bg-bg rounded-2xl shadow-elev-raised w-full max-w-md overflow-hidden outline-none"
      >
        <div className="px-6 py-4 border-b border-border-soft flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-meta">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="p-1.5 text-meta hover:text-muted hover:bg-surface-warm rounded-lg transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-5">
            <Icon className="w-8 h-8 text-accent" />
          </div>
          <h2 id={titleId} className="text-xl font-bold text-fg mb-2">
            {current.title}
          </h2>
          <p className="text-sm text-muted leading-relaxed">{current.description}</p>
        </div>

        <div className="px-6 pb-6">
          <div className="flex justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                aria-current={i === step ? 'step' : undefined}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? 'bg-accent' : 'bg-surface hover:bg-surface'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 border border-border rounded-lg text-sm font-medium text-muted hover:bg-bg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-accent hover:bg-accent-hover text-accent-on rounded-lg text-sm font-medium transition-colors"
            >
              {step < STEPS.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
