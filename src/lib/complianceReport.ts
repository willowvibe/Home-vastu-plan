import { FloorPlan } from '../types';
import { analyzeRoomVastu } from '../services/vastu';
import { formatFloor } from '../constants/floorPlanConstants';

export interface ComplianceRoomRow {
  type: string;
  direction: string;
  score: number;
  status: 'good' | 'average' | 'poor';
  feedback: string;
  area: number;
}

export interface ComplianceReportData {
  generatedAt: string;
  overallScore: number;
  overallStatus: 'good' | 'average' | 'poor';
  currentFloorLabel: string;
  projectName: string;
  clientName: string;
  consultantName: string;
  analysis: string | null;
  rooms: ComplianceRoomRow[];
  totalBuiltUpArea: number;
}

function statusFromScore(score: number): 'good' | 'average' | 'poor' {
  if (score >= 80) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}

/**
 * Build the data needed for a Vastu compliance PDF.
 *
 * The function is pure and cheap: it does not touch jsPDF or the DOM,
 * so it is easy to unit-test. The UI component calls this and then
 * renders the PDF from the returned payload.
 */
export function buildComplianceReportData(
  plan: FloorPlan,
  currentFloor: number,
  analysis: string | null,
  projectName: string,
  clientName: string,
  consultantName: string
): ComplianceReportData {
  const floorRooms = plan.rooms.filter((r) => r.floor === currentFloor);
  const overallScore =
    floorRooms.length === 0
      ? 0
      : Math.round(
          floorRooms.reduce((sum, r) => sum + analyzeRoomVastu(r, plan).score, 0) /
            floorRooms.length
        );

  const rows: ComplianceRoomRow[] = floorRooms.map((room) => {
    const result = analyzeRoomVastu(room, plan);
    return {
      type: room.type,
      direction: result.currentDirection,
      score: result.score,
      status: result.status,
      feedback: result.feedback,
      area: Math.round(room.w * room.h),
    };
  });

  return {
    generatedAt: new Date().toLocaleDateString(),
    overallScore,
    overallStatus: statusFromScore(overallScore),
    currentFloorLabel: formatFloor(currentFloor),
    projectName,
    clientName,
    consultantName,
    analysis,
    rooms: rows,
    totalBuiltUpArea: floorRooms.reduce((sum, r) => sum + r.w * r.h, 0),
  };
}
