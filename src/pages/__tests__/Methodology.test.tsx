import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Methodology } from '../Methodology';

describe('Methodology page', () => {
  it('renders the methodology content and matrix', () => {
    render(
      <MemoryRouter>
        <Methodology />
      </MemoryRouter>
    );

    expect(screen.getByText('How VastuPlan scores a floor plan')).toBeInTheDocument();
    expect(screen.getByText('Scoring system')).toBeInTheDocument();
    expect(screen.getByText('Direction matrix')).toBeInTheDocument();
    expect(screen.getByText('Sources & methodology')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Manasara Shilpa Shastra')).toBeInTheDocument();
  });

  it('links back to the home page', () => {
    render(
      <MemoryRouter>
        <Methodology />
      </MemoryRouter>
    );

    const homeLink = screen.getByText('← Back to home');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
