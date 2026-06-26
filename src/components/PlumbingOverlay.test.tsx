import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlumbingOverlay } from './PlumbingOverlay';
import { Room } from '../types';

const plan = {
  plotWidth: 30,
  plotHeight: 40,
  northAngle: 0,
  roadDirection: 'S' as const,
  unit: 'ft' as const,
  setbacks: { top: 1, right: 1, bottom: 1, left: 1 },
  rooms: [],
};

describe('PlumbingOverlay', () => {
  it('renders an empty-state hint when no water rooms exist', () => {
    render(<PlumbingOverlay plan={plan} rooms={[]} pixelsPerFoot={20} />);
    expect(screen.getByText(/Add a Kitchen or Bathroom/i)).toBeTruthy();
  });

  it('draws lines for a kitchen and a bathroom', () => {
    const rooms: Room[] = [
      {
        id: 'r1',
        type: 'Kitchen',
        x: 5,
        y: 5,
        w: 10,
        h: 10,
        floor: 0,
        wallThickness: 9,
      },
      {
        id: 'r2',
        type: 'Bathroom',
        x: 20,
        y: 20,
        w: 6,
        h: 8,
        floor: 0,
        wallThickness: 9,
      },
    ];

    render(<PlumbingOverlay plan={plan} rooms={rooms} pixelsPerFoot={20} />);

    const svg = screen.getByTestId('plumbing-overlay');
    const lines = svg.querySelectorAll('line');
    // Kitchen: cold + drain = 2. Bathroom: cold + hot + drain = 3. Total 5.
    expect(lines.length).toBe(5);
  });
});
