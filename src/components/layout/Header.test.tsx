import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { INITIAL_PLAN } from '../../constants/floorPlanConstants';

const mockSignOut = vi.fn();
const mockOnOpenAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isEnabled: true,
    isLoading: false,
    isAuthenticated: false,
    user: null,
    session: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    signOut: mockSignOut,
  }),
}));

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ darkMode: false, toggle: vi.fn() }),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the sign-in button when anonymous', () => {
    render(
      <Header
        plan={INITIAL_PLAN}
        appMode="edit"
        setAppMode={vi.fn()}
        activeTab="design"
        setActiveTab={vi.fn()}
        setShowProjectManager={vi.fn()}
        vastuScore={0}
        onOpenAuth={mockOnOpenAuth}
      />
    );

    const signInButton = screen.getByLabelText(/sign in/i);
    expect(signInButton).toBeInTheDocument();
    fireEvent.click(signInButton);
    expect(mockOnOpenAuth).toHaveBeenCalled();
  });
});
