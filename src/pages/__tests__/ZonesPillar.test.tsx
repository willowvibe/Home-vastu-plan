import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ZonesPillar } from '../ZonesPillar';
import { getAllZonePages } from '../../constants/zonePages';

describe('ZonesPillar', () => {
  function renderPillar() {
    return render(
      <MemoryRouter initialEntries={['/zones']}>
        <Routes>
          <Route path="/zones" element={<ZonesPillar />} />
          <Route path="/zones/:slug" element={<div data-testid="zone-page">Zone</div>} />
          <Route path="/app" element={<div data-testid="app">App</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('renders the pillar heading and overview', () => {
    renderPillar();

    expect(screen.getByText('Vastu zones explained')).toBeInTheDocument();
    expect(screen.getByText('The nine Vastu zones')).toBeInTheDocument();
    expect(screen.getByText('Room-by-room zone guides')).toBeInTheDocument();
  });

  it('lists all 16 zone page links', () => {
    renderPillar();

    const pages = getAllZonePages();
    for (const page of pages) {
      const link = screen.getByRole('link', { name: `${page.roomType} in the ${page.zoneName}` });
      expect(link).toHaveAttribute('href', `/zones/${page.slug}`);
    }
  });

  it('links to the planner CTA', () => {
    renderPillar();

    const cta = screen.getByRole('link', { name: /Start planning/i });
    expect(cta).toHaveAttribute('href', '/app');
  });
});
