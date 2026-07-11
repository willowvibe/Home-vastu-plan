import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ZonePage } from '../ZonePage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/zones/:slug" element={<ZonePage />} />
        <Route path="/zones" element={<div data-testid="zones-pillar">Pillar</div>} />
        <Route path="/app" element={<div data-testid="app">App</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ZonePage', () => {
  beforeEach(() => {
    document.title = '';
  });

  it('renders a known zone page with title and content', () => {
    renderAt('/zones/north-east-kitchen');

    expect(document.title).toContain('Kitchen in the North-East');
    expect(document.title).toContain('Vastu guide');
    expect(screen.getByRole('heading', { name: /Kitchen in the North-East/ })).toBeInTheDocument();
    expect(screen.getByText(/Avoided placement/)).toBeInTheDocument();
    expect(screen.getByText(/Open the planner/)).toBeInTheDocument();
  });

  it('shows an ideal badge for a best-direction placement', () => {
    renderAt('/zones/south-east-kitchen');

    expect(screen.getByText(/Ideal placement/)).toBeInTheDocument();
    expect(screen.getByText(/Element:/)).toBeInTheDocument();
  });

  it('links to the planner from the CTA', () => {
    renderAt('/zones/north-east-pooja-room');

    const cta = screen.getByRole('link', { name: /Open the planner/i });
    expect(cta).toHaveAttribute('href', '/app');
  });

  it('renders related guides for the same room and zone', () => {
    renderAt('/zones/north-east-kitchen');

    expect(screen.getByText(/Other directions for Kitchen/)).toBeInTheDocument();
    expect(screen.getByText(/Other rooms in North-East/)).toBeInTheDocument();
  });

  it('renders a not-found state for an unknown slug', () => {
    renderAt('/zones/no-such-zone');

    expect(document.title).toContain('Zone not found');
    expect(screen.getByText(/Zone guide not found/)).toBeInTheDocument();
    const back = screen.getByRole('link', { name: /Browse all Vastu zone guides/i });
    expect(back).toHaveAttribute('href', '/zones');
  });
});
