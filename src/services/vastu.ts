import { Room, RoomType, FloorPlan } from "../types";

export type Direction =
  | "N"
  | "NE"
  | "E"
  | "SE"
  | "S"
  | "SW"
  | "W"
  | "NW"
  | "CENTER";

export interface VastuResult {
  score: number; // 0 to 100
  status: "good" | "average" | "poor";
  idealDirections: Direction[];
  currentDirection: Direction;
  feedback: string;
}

const IDEAL_ZONES: Record<
  RoomType,
  { best: Direction[]; neutral: Direction[]; avoid: Direction[] }
> = {
  Bedroom: {
    best: ["SW", "S", "W"],
    neutral: ["NW", "N", "E"],
    avoid: ["NE", "SE", "CENTER"],
  },
  "Master Bedroom": {
    best: ["SW", "S", "W"],
    neutral: ["NW", "N", "E"],
    avoid: ["NE", "SE", "CENTER"],
  },
  Kitchen: {
    best: ["SE"],
    neutral: ["NW", "E", "S"],
    avoid: ["NE", "SW", "N", "CENTER"],
  },
  "Living Room": {
    best: ["N", "E", "NE", "NW"],
    neutral: ["W", "S"],
    avoid: ["SW", "SE", "CENTER"],
  },
  Bathroom: {
    best: ["NW", "W", "S"],
    neutral: ["SE", "E"],
    avoid: ["NE", "SW", "CENTER"],
  },
  "Pooja Room": {
    best: ["NE", "E", "N"],
    neutral: ["W"],
    avoid: ["S", "SW", "SE", "NW", "CENTER"],
  },
  Dining: {
    best: ["W", "E", "N"],
    neutral: ["S", "NW", "SE"],
    avoid: ["SW", "NE", "CENTER"],
  },
  Balcony: {
    best: ["N", "E", "NE"],
    neutral: ["NW"],
    avoid: ["S", "SW", "W", "SE"],
  },
  Stairs: {
    best: ["SW", "S", "W"],
    neutral: ["SE", "NW"],
    avoid: ["NE", "N", "E", "CENTER"],
  },
  Study: {
    best: ["NE", "N", "E", "W"],
    neutral: ["NW"],
    avoid: ["S", "SW", "SE", "CENTER"],
  },
  Store: {
    best: ["SW", "S", "W"],
    neutral: ["NW"],
    avoid: ["NE", "E", "N", "SE", "CENTER"],
  },
  Parking: {
    best: ["NW", "SE"],
    neutral: ["N", "E"],
    avoid: ["SW", "S", "W", "NE", "CENTER"],
  },
};

export function getDirection(
  x: number,
  y: number,
  cx: number,
  cy: number,
  northAngle: number,
): Direction {
  // Calculate angle from center
  const dx = x - cx;
  const dy = y - cy;

  // Distance from center
  const dist = Math.sqrt(dx * dx + dy * dy);
  // If very close to center (e.g., within 15% of plot size), call it CENTER (Brahmasthan)
  if (dist < Math.min(cx, cy) * 0.3) {
    return "CENTER";
  }

  // Angle in degrees (0 is East, 90 is South, 180 is West, -90 is North in SVG coords)
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Adjust for North Angle (if North is not UP)
  // Default: UP is North. In our grid, UP is -Y.
  // So if dx=0, dy=-1, angle is -90. We want this to be North.
  // Let's map standard angles to directions assuming UP is North (angle -90)

  // Adjust angle so 0 is North
  angle = angle + 90;

  // Apply user's north offset
  angle = angle - northAngle;

  // Normalize to 0-360
  angle = ((angle % 360) + 360) % 360;

  if (angle >= 337.5 || angle < 22.5) return "N";
  if (angle >= 22.5 && angle < 67.5) return "NE";
  if (angle >= 67.5 && angle < 112.5) return "E";
  if (angle >= 112.5 && angle < 157.5) return "SE";
  if (angle >= 157.5 && angle < 202.5) return "S";
  if (angle >= 202.5 && angle < 247.5) return "SW";
  if (angle >= 247.5 && angle < 292.5) return "W";
  if (angle >= 292.5 && angle < 337.5) return "NW";

  return "CENTER";
}

export function analyzeRoomVastu(room: Room, plan: FloorPlan): VastuResult {
  const cx = plan.plotWidth / 2;
  const cy = plan.plotHeight / 2;
  const rx = room.x + room.w / 2;
  const ry = room.y + room.h / 2;

  const dir = getDirection(rx, ry, cx, cy, plan.northAngle || 0);
  const rules = IDEAL_ZONES[room.type];

  if (!rules) {
    return {
      score: 50,
      status: "average",
      idealDirections: [],
      currentDirection: dir,
      feedback: "No specific rules.",
    };
  }

  if (rules.best.includes(dir)) {
    return {
      score: 100,
      status: "good",
      idealDirections: rules.best,
      currentDirection: dir,
      feedback: `Excellent placement. ${dir} is ideal for ${room.type}.`,
    };
  } else if (rules.neutral.includes(dir)) {
    return {
      score: 60,
      status: "average",
      idealDirections: rules.best,
      currentDirection: dir,
      feedback: `Acceptable placement. ${dir} is okay, but ${rules.best.join("/")} is better.`,
    };
  } else {
    return {
      score: 20,
      status: "poor",
      idealDirections: rules.best,
      currentDirection: dir,
      feedback: `Avoid ${dir} for ${room.type}. Move to ${rules.best.join("/")}.`,
    };
  }
}

export function calculateOverallVastuScore(plan: FloorPlan): number {
  if (plan.rooms.length === 0) return 0;
  let totalScore = 0;
  plan.rooms.forEach((room) => {
    totalScore += analyzeRoomVastu(room, plan).score;
  });
  return Math.round(totalScore / plan.rooms.length);
}
