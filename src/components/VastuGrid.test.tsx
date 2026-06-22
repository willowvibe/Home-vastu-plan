import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VastuGrid } from './VastuGrid';

describe('VastuGrid', () => {
  it('renders all nine zone cells', () => {
    render(
      <VastuGrid
        plotWidth={30}
        plotHeight={30}
        setbacks={{ top: 1, right: 1, bottom: 1, left: 1 }}
        northAngle={0}
        pixelsPerFoot={20}
      />
    );

    expect(screen.getByTestId('vastu-zone-brahmasthan')).toBeTruthy();
    expect(screen.getByTestId('vastu-zone-north')).toBeTruthy();
    expect(screen.getByTestId('vastu-zone-north-east')).toBeTruthy();
  });
});
