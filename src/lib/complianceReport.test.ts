import { describe, it, expect } from 'vitest';
import { buildComplianceReportData } from './complianceReport';
import { FloorPlan } from '../types';

const PLAN: FloorPlan = {
  plotWidth: 30,
  plotHeight: 40,
  northAngle: 0,
  roadDirection: 'N',
  unit: 'ft',
  setbacks: { top: 3, right: 3, bottom: 3, left: 3 },
  rooms: [
    { id: 'r1', type: 'Kitchen', x: 20, y: 30, w: 10, h: 10, floor: 0, wallThickness: 9 },
    { id: 'r2', type: 'Bedroom', x: 5, y: 5, w: 12, h: 12, floor: 0, wallThickness: 9 },
    { id: 'r3', type: 'Living Room', x: 5, y: 5, w: 10, h: 10, floor: 1, wallThickness: 9 },
  ],
};

describe('buildComplianceReportData (G-6)', () => {
  it('returns metadata and project info', () => {
    const data = buildComplianceReportData(
      PLAN,
      0,
      'AI analysis text',
      'Project X',
      'Client A',
      'Consultant B'
    );
    expect(data.projectName).toBe('Project X');
    expect(data.clientName).toBe('Client A');
    expect(data.consultantName).toBe('Consultant B');
    expect(data.currentFloorLabel).toBe('Ground Floor');
    expect(data.analysis).toBe('AI analysis text');
  });

  it('only includes rooms on the requested floor', () => {
    const data = buildComplianceReportData(PLAN, 0, null, '', '', '');
    expect(data.rooms).toHaveLength(2);
    expect(data.rooms.every((r) => r.type !== 'Living Room')).toBe(true);
  });

  it('computes per-room vastu rows', () => {
    const data = buildComplianceReportData(PLAN, 0, null, '', '', '');
    const kitchen = data.rooms.find((r) => r.type === 'Kitchen')!;
    expect(kitchen.direction).toBeDefined();
    expect(kitchen.score).toBeGreaterThanOrEqual(0);
    expect(kitchen.score).toBeLessThanOrEqual(100);
    expect(kitchen.status).toMatch(/good|average|poor/);
    expect(kitchen.area).toBe(Math.round(10 * 10));
  });

  it('computes overall score from the filtered floor rooms', () => {
    const data = buildComplianceReportData(PLAN, 1, null, '', '', '');
    expect(data.rooms).toHaveLength(1);
    expect(data.overallScore).toBe(data.rooms[0].score);
  });

  it('totals the built-up area for the filtered floor', () => {
    const data = buildComplianceReportData(PLAN, 0, null, '', '', '');
    expect(data.totalBuiltUpArea).toBe(100 + 144);
  });
});
