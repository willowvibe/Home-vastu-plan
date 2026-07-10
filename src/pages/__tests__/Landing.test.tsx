import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Landing } from '../Landing';

const authState = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
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
  });

  it('renders the hero headline', () => {
    renderLanding();
    expect(screen.getByText(/Design Indian homes that feel/i)).toBeInTheDocument();
  });

  it('renders the three feature cards', () => {
    renderLanding();
    expect(screen.getByText('Live Vastu score')).toBeInTheDocument();
    expect(screen.getByText('Smart floor plans')).toBeInTheDocument();
    expect(screen.getByText('AI design review')).toBeInTheDocument();
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
});