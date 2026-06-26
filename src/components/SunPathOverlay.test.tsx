import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SunPathOverlay } from './SunPathOverlay';
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

const noon = new Date('2026-06-21T00:00:00');
const rooms: Room[] = [
  {
    id: 'r1',
    type: 'Living Room',
    x: 5,
    y: 5,
    w: 10,
    h: 10,
    floor: 0,
    wallThickness: 9,
  },
];

describe('SunPathOverlay', () => {
  it('shows a night message when the sun is below the horizon', () => {
    render(
      <SunPathOverlay
        plan={plan}
        rooms={rooms}
        pixelsPerFoot={20}
        date={noon}
        minutesSinceMidnight={0}
      />
    );
    expect(screen.getByText(/Sun is below the horizon/i)).toBeTruthy();
  });

  it('renders shadow polygons during daytime', () => {
    render(
      <SunPathOverlay
        plan={plan}
        rooms={rooms}
        pixelsPerFoot={20}
        date={noon}
        minutesSinceMidnight={12 * 60}
      />
    );

    const svg = screen.getByTestId('sun-path-overlay');
    expect(svg.querySelectorAll('polygon').length).toBe(1);
  });

  it('shows an empty-state hint when no rooms exist', () => {
    render(
      <SunPathOverlay
        plan={plan}
        rooms={[]}
        pixelsPerFoot={20}
        date={noon}
        minutesSinceMidnight={12 * 60}
      />
    );
    expect(screen.getByText(/Add rooms to see sun-path shadows/i)).toBeTruthy();
  });
});
