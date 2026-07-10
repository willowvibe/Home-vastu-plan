import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { AuthModal } from './AuthModal';

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();
const mockShowToast = vi.fn();
const mockOnClose = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isEnabled: true,
    isLoading: false,
    isAuthenticated: false,
    user: null,
    session: null,
    signIn: mockSignIn,
    signUp: mockSignUp,
    resetPassword: mockResetPassword,
    signOut: vi.fn(),
  }),
}));

vi.mock('../services/analytics', () => ({
  trackEvent: vi.fn(),
  EVENTS: { USER_SIGNED_IN: 'user_signed_in', USER_SIGNED_UP: 'user_signed_up' },
}));

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('AuthModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders sign-in fields by default', () => {
    render(<AuthModal open={true} onClose={mockOnClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-submit')).toHaveTextContent(/sign in/i);
  });

  it('switches to sign-up tab', async () => {
    render(<AuthModal open={true} onClose={mockOnClose} />);
    await userEvent.click(screen.getByTestId('auth-tab-signup'));
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-submit')).toHaveTextContent(/create account/i);
  });

  it('switches to forgot-password view', async () => {
    render(<AuthModal open={true} onClose={mockOnClose} />);
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-submit')).toHaveTextContent(/send reset email/i);
  });

  it('validates mismatched passwords on sign up', async () => {
    render(<AuthModal open={true} onClose={mockOnClose} />);
    await userEvent.click(screen.getByTestId('auth-tab-signup'));
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'secret');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different');
    await userEvent.click(screen.getByTestId('auth-submit'));

    expect(mockSignUp).not.toHaveBeenCalled();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('calls signIn and closes on success', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<AuthModal open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'secret');
    await userEvent.click(screen.getByTestId('auth-submit'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
    });
    expect(mockShowToast).toHaveBeenCalledWith('Signed in successfully.', 'success');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows a toast on sign-in error', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('Invalid credentials') });
    render(<AuthModal open={true} onClose={mockOnClose} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrong12');
    await userEvent.click(screen.getByTestId('auth-submit'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Invalid credentials', 'error');
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('sends password reset email and returns to sign-in', async () => {
    mockResetPassword.mockResolvedValue({ error: null });
    render(<AuthModal open={true} onClose={mockOnClose} />);

    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.click(screen.getByTestId('auth-submit'));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('a@b.com');
    });
    expect(mockShowToast).toHaveBeenCalledWith('Password reset email sent.', 'success');
  });
});
