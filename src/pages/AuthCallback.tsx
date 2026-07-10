import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import './landing.css';

/**
 * Handles the redirect after a Supabase magic-link click or Google OAuth flow.
 * The Supabase client (src/lib/supabase.ts) sets `detectSessionInUrl: true` with
 * the PKCE flow, so on a fresh page load to /auth/callback?code=... it auto-
 * exchanges the code and fires onAuthStateChange → AuthContext marks the user
 * authenticated. This component watches that state and forwards to /app.
 * It does NOT call exchangeCodeForSession manually (that would double-fire).
 */
export function AuthCallback() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    if (errorCode) {
      handled.current = true;
      const desc = params.get('error_description') || 'Sign-in failed. Please try again.';
      showToast(desc, 'error');
      navigate('/', { replace: true });
      return;
    }

    if (isAuthenticated) {
      handled.current = true;
      navigate('/app', { replace: true });
      return;
    }

    if (!isLoading && !isAuthenticated) {
      // Give the URL-detection exchange a brief moment to resolve before bailing.
      const t = setTimeout(() => {
        handled.current = true;
        showToast('Sign-in link is invalid or has expired. Please try again.', 'error');
        navigate('/', { replace: true });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, isLoading, navigate, showToast]);

  return (
    <div
      className="landing-scope"
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}
    >
      <p className="meta" style={{ fontSize: '15px' }}>
        Signing you in…
      </p>
    </div>
  );
}
