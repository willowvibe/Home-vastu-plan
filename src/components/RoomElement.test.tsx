import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoomElement } from './RoomElement';
import { RoomElement as RoomElementType } from '../types';

const baseElement: RoomElementType = {
  id: 'el-1',
  type: 'Bed',
  x: 1,
  y: 1,
  w: 6,
  h: 6.5,
  rotation: 0,
};

const makeProps = (overrides: Partial<RoomElementType> = {}) => ({
  element: { ...baseElement, ...overrides },
  pixelsPerFoot: 20,
  onPointerDown: vi.fn(),
  onDoubleClick: vi.fn(),
});

describe('RoomElement', () => {
  it('renders the element label', () => {
    render(<RoomElement {...makeProps()} />);
    expect(screen.getByText('Bed')).toBeTruthy();
  });

  it('renders a staircase with a hatch pattern and step lines', () => {
    const { container } = render(
      <RoomElement {...makeProps({ type: 'Staircase', w: 4, h: 10 })} />
    );

    expect(screen.getByText('Staircase')).toBeTruthy();

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.backgroundImage).toContain('repeating-linear-gradient');

    const stepLines = container.querySelectorAll('.h-px');
    expect(stepLines.length).toBeGreaterThanOrEqual(3);
  });

  it('applies rotation transform', () => {
    const { container } = render(<RoomElement {...makeProps({ rotation: 90 })} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.transform).toContain('rotate(90deg)');
  });
});
