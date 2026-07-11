import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Landing } from '../Landing';

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock('../../services/analytics', () => ({
  trackEvent: analytics.trackEvent,
  EVENTS: {
    LANDING_SIGNUP_SUBMIT: 'landing_signup_submit',
    LANDING_MAGIC_LINK_SENT: 'landing_magic_link_sent',
    LANDING_GOOGLE_CLICK: 'landing_google_click',
    ZONE_PILLAR_CLICK: 'zone_pillar_click',
  },
}));

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<div data-testid="app" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Landing', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.sendMagicLink.mockReset();
    authState.signInWithGoogle.mockReset();
    analytics.trackEvent.mockReset();
  });

  it('renders the hero headline', () => {
    renderLanding();
    expect(screen.getByText(/Design Indian homes that feel/i)).toBeInTheDocument();
  });

  it('renders the feature cards', () => {
    renderLanding();
    expect(screen.getByText('Live Vastu score')).toBeInTheDocument();
    expect(screen.getByText('Smart floor plans')).toBeInTheDocument();
    expect(screen.getByText('AI design review')).toBeInTheDocument();
    expect(screen.getByText('Export & share')).toBeInTheDocument();
    expect(screen.getByText('Projects & versions')).toBeInTheDocument();
    expect(screen.getByText('Sun path & plumbing')).toBeInTheDocument();
  });

  it('toggles the mobile nav open state', () => {
    renderLanding();
    const toggle = screen.getByLabelText('Open menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows an error on empty submit', () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }));
    expect(screen.getByText('Please enter your email address.')).toBeInTheDocument();
  });

  it('shows an error on an invalid email', () => {
    renderLanding();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'foo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }));
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
  });

  it('redirects to /app when already authenticated', () => {
    authState.isAuthenticated = true;
    renderLanding();
    expect(screen.getByTestId('app')).toBeInTheDocument();
  });

  it('sends a magic link on a valid email submit', async () => {
    authState.sendMagicLink.mockResolvedValue({ error: null });
    renderLanding();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }));
    expect(authState.sendMagicLink).toHaveBeenCalledWith('a@b.com');
    expect(
      await screen.findByText('Check your inbox for a magic link to sign in.')
    ).toBeInTheDocument();
    expect(analytics.trackEvent).toHaveBeenCalledWith('landing_signup_submit');
    expect(analytics.trackEvent).toHaveBeenCalledWith('landing_magic_link_sent');
  });

  it('shows an error message when sendMagicLink fails', async () => {
    authState.sendMagicLink.mockResolvedValue({ error: new Error('rate limited') });
    renderLanding();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }));
    expect(await screen.findByText('rate limited')).toBeInTheDocument();
  });

  it('starts Google OAuth when the Google button is clicked', () => {
    authState.signInWithGoogle.mockResolvedValue({ error: null });
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(authState.signInWithGoogle).toHaveBeenCalled();
    expect(analytics.trackEvent).toHaveBeenCalledWith('landing_google_click');
  });

  it('links to the Vastu zones pillar and featured zone pages', () => {
    renderLanding();
    expect(screen.getByRole('link', { name: /View all Vastu zones/i })).toHaveAttribute(
      'href',
      '/zones'
    );
    expect(screen.getByRole('link', { name: /Kitchen in the North-East/i })).toBeInTheDocument();
  });
});
