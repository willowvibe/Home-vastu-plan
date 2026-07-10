import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthCallback } from '../AuthCallback';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const authState = vi.hoisted(() => ({ isAuthenticated: false, isLoading: false }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => authState }));

const showToast = vi.fn();
vi.mock('../../components/Toast', () => ({ useToast: () => ({ showToast }) }));

describe('AuthCallback', () => {
  beforeEach(() => {
    navigate.mockReset();
    showToast.mockReset();
    authState.isAuthenticated = false;
    authState.isLoading = false;
    window.history.replaceState({}, '', '/auth/callback');
  });

  it('redirects to /app when authenticated', () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    render(<AuthCallback />);
    expect(navigate).toHaveBeenCalledWith('/app', { replace: true });
  });

  it('redirects to / with an error toast when the URL has an error param', () => {
    window.history.replaceState({}, '', '/auth/callback?error=access_denied&error_description=User+cancelled');
    render(<AuthCallback />);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('cancelled'), 'error');
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('redirects to / after a timeout when no session materializes', () => {
    vi.useFakeTimers();
    authState.isAuthenticated = false;
    authState.isLoading = false;
    render(<AuthCallback />);
    expect(navigate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(showToast).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
    vi.useRealTimers();
  });
});