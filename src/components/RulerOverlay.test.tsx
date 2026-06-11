import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RulerOverlay } from './RulerOverlay';

describe('RulerOverlay (B-7: unit string, B-14: half-foot rounding)', () => {
  const start = { x: 0, y: 0 };
  const end = (x: number, y: number) => ({ x, y });

  // `toBeInTheDocument` would normally be the right matcher, but the jest-dom
  // type-augmenting import lives in `src/test/setup.ts` which is excluded from
  // tsc (see tsconfig.json `exclude: ["src/test"]`). The setup file is loaded
  // at runtime by vitest, so the matcher *does* work — we just can't see it
  // from tsc. We assert on the rendered text content instead.
  const findDistanceLine = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('div')).find((d) =>
      /Distance:/.test(d.textContent || '')
    );

  it('renders nothing when there is no measurement', () => {
    const { container } = render(
      <RulerOverlay measuring={false} measureStart={null} measureEnd={null} />
    );
    expect(findDistanceLine(container)).toBeUndefined();
  });

  it('uses feet by default and rounds to half-foot precision', () => {
    // sqrt(1^2 + 2^2) = sqrt(5) ≈ 2.236 ft. Half-foot rounding:
    // round(2.236 * 2) / 2 = round(4.472) / 2 = 2.
    const { container } = render(
      <RulerOverlay measuring={false} measureStart={start} measureEnd={end(1, 2)} unit="ft" />
    );
    expect(findDistanceLine(container)?.textContent).toMatch(/Distance: 2 ft/);
  });

  it('preserves half-foot values that the old `Math.round` would have snapped', () => {
    // 2.5 ft: old code Math.round(2.5) = 3; new code round(2.5 * 2) / 2 = 2.5.
    const { container } = render(
      <RulerOverlay measuring={false} measureStart={start} measureEnd={end(2.5, 0)} unit="ft" />
    );
    expect(findDistanceLine(container)?.textContent).toMatch(/Distance: 2\.5 ft/);
  });

  it('converts to meters and labels with `m` when unit is metric', () => {
    // 10 ft -> 3.048 m. Half-meter rounding: round(3.048 * 2) / 2 = 3.
    const { container } = render(
      <RulerOverlay measuring={false} measureStart={start} measureEnd={end(10, 0)} unit="m" />
    );
    expect(findDistanceLine(container)?.textContent).toMatch(/Distance: 3 m/);
  });

  it('shows a 0.5 m precision in metric mode', () => {
    // 1.64 ft -> 0.4998 m, half-meter rounding: round(0.4998 * 2) / 2 = round(0.9996) / 2 = 0.5.
    const { container } = render(
      <RulerOverlay measuring={false} measureStart={start} measureEnd={end(1.64, 0)} unit="m" />
    );
    expect(findDistanceLine(container)?.textContent).toMatch(/Distance: 0\.5 m/);
  });
});
