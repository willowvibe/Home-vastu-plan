import React, { useState } from 'react';
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Icon className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{current.title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{current.description}</p>
        </div>

        <div className="px-6 pb-6">
          <div className="flex justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? 'bg-indigo-600' : 'bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
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
