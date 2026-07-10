import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { trackEvent, EVENTS } from '../services/analytics';

export type AuthMode = 'signin' | 'signup' | 'reset';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

const MODE_LABELS: Record<AuthMode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  reset: 'Reset password',
};

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, initialMode = 'signin' }) => {
  const { isEnabled, isLoading: authLoading, signIn, signUp, resetPassword } = useAuth();
  const { showToast } = useToast();
  const [mode, setModeInternal] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const setModeAndClear = (next: AuthMode) => {
    setFieldError(null);
    setPassword('');
    setConfirmPassword('');
    setModeInternal(next);
  };

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const firstFocusable = dialog.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable ?? dialog).focus();

    return () => {
      const prev = previouslyFocusedRef.current;
      if (prev && document.body.contains(prev)) {
        prev.focus();
      }
    };
  }, [open]);

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

  const validate = (): boolean => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError('Please enter a valid email address.');
      return false;
    }
    if (mode !== 'reset' && password.length < 6) {
      setFieldError('Password must be at least 6 characters.');
      return false;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setFieldError('Passwords do not match.');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnabled) {
      showToast('Authentication is not configured.', 'error');
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn({ email, password });
        if (error) {
          showToast(error.message || 'Sign in failed.', 'error');
        } else {
          showToast('Signed in successfully.', 'success');
          trackEvent(EVENTS.USER_SIGNED_IN);
          onClose();
        }
      } else if (mode === 'signup') {
        const { error } = await signUp({ email, password });
        if (error) {
          showToast(error.message || 'Sign up failed.', 'error');
        } else {
          showToast('Check your email to confirm your account.', 'success');
          trackEvent(EVENTS.USER_SIGNED_UP);
          setModeAndClear('signin');
        }
      } else {
        const { error } = await resetPassword(email);
        if (error) {
          showToast(error.message || 'Password reset failed.', 'error');
        } else {
          showToast('Password reset email sent.', 'success');
          setModeAndClear('signin');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-fg/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="bg-bg dark:bg-surface rounded-2xl shadow-elev-raised w-full max-w-md overflow-hidden outline-none transition-colors"
      >
        <div className="px-6 py-4 border-b border-border-soft dark:border-border flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-bold text-fg dark:text-accent-on">
            {MODE_LABELS[mode]}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-meta hover:text-muted dark:hover:text-meta hover:bg-surface-warm dark:hover:bg-surface rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode !== 'reset' && (
            <div className="flex p-1 bg-surface-warm dark:bg-surface rounded-lg">
              {(['signin', 'signup'] as AuthMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`auth-tab-${m}`}
                  onClick={() => setModeAndClear(m)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    mode === m
                      ? 'bg-bg dark:bg-surface text-fg dark:text-accent-on shadow-elev-ring'
                      : 'text-muted dark:text-meta hover:text-fg-2 dark:hover:text-fg-2'
                  }`}
                >
                  {m === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="auth-email"
              className="block text-sm font-medium text-fg-2 dark:text-meta"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-meta" />
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-bg dark:bg-surface text-fg dark:text-accent-on placeholder:text-meta focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
                required
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="space-y-2">
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-fg-2 dark:text-meta"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-meta" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-bg dark:bg-surface text-fg dark:text-accent-on placeholder:text-meta focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-2">
              <label
                htmlFor="auth-confirm-password"
                className="block text-sm font-medium text-fg-2 dark:text-meta"
              >
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-meta" />
                <input
                  id="auth-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-bg dark:bg-surface text-fg dark:text-accent-on placeholder:text-meta focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          {fieldError && (
            <div className="flex items-start gap-2 text-sm text-danger bg-danger/10 dark:bg-danger/20 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {fieldError}
            </div>
          )}

          <button
            type="submit"
            data-testid="auth-submit"
            disabled={isSubmitting || authLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent text-accent-on rounded-lg text-sm font-medium transition-colors"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'reset'
              ? 'Send reset email'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>

          <div className="flex items-center justify-between text-sm">
            {mode === 'signin' ? (
              <button
                type="button"
                onClick={() => setModeAndClear('reset')}
                className="text-accent hover:underline"
              >
                Forgot password?
              </button>
            ) : mode === 'reset' ? (
              <button
                type="button"
                onClick={() => setModeAndClear('signin')}
                className="text-accent hover:underline"
              >
                Back to sign in
              </button>
            ) : (
              <span />
            )}

            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => setModeAndClear('signin')}
                className="text-muted dark:text-meta hover:text-fg-2 dark:hover:text-meta"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
