export type RoomType =
  | 'Bedroom'
  | 'Master Bedroom'
  | 'Kitchen'
  | 'Living Room'
  | 'Bathroom'
  | 'Pooja Room'
  | 'Dining'
  | 'Balcony'
  | 'Stairs'
  | 'Study'
  | 'Store'
  | 'Parking';

// Room metadata and organization
export type RoomCategory =
  | 'Living'
  | 'Sleeping'
  | 'Kitchen'
  | 'Bathroom'
  | 'Utility'
  | 'Special'
  | 'Parking'
  | 'Other';

export interface RoomTags {
  [key: string]: string | boolean | number;
}

export interface RoomLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  rooms: string[];
}

export interface RoomElement {
  id: string;
  type: string; // e.g., 'Bed', 'Toilet', 'Wash Basin', 'Sofa', 'Dining Table'
  x: number; // relative to room x, in feet
  y: number; // relative to room y, in feet
  w: number; // in feet
  h: number; // in feet
  rotation: number; // in degrees
}

export interface Room {
  id: string;
  type: RoomType;
  x: number; // in feet
  y: number; // in feet
  w: number; // in feet
  h: number; // in feet
  floor: number; // 0 = 0th, 1 = 1st, 2 = 2nd, … (see formatFloor() in src/constants/floorPlanConstants.ts)
  wallThickness: number; // in inches, e.g. 9 for external, 4.5 for internal
  category?: RoomCategory;
  tags?: RoomTags;
  notes?: string;
  costPerSqFt?: number; // construction cost rate for this room in INR/sq.ft
  elements?: RoomElement[];
}

// Collaboration types
export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  socketId: string;
  cursor?: { x: number; y: number } | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: number;
}

// Q-9: PlanUpdateEvent moved to ./types/shared so the server can import
// the same type. Re-export here for back-compat with existing callers.
export type { PlanUpdateEvent } from './types/shared';
export interface CollaborationState {
  connected: boolean;
  roomId: string | null;
  userId: string | null;
  users: CollaborationUser[];
  messages: ChatMessage[];
  isConnecting: boolean;
  error: string | null;
}

export interface Comment {
  id: string;
  text: string;
  x: number; // in feet, relative to plot origin
  y: number; // in feet, relative to plot origin
  author: string;
  timestamp: number;
  floor?: number; // floor the pin belongs to; defaults to 0 if omitted
}

export interface FloorPlan {
  plotWidth: number; // e.g. 30
  plotHeight: number; // e.g. 40
  northAngle: number; // 0 = UP, 90 = RIGHT, etc.
  roadDirection: 'N' | 'E' | 'S' | 'W';
  unit: 'ft' | 'm';
  setbacks: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  rooms: Room[];
  comments?: Comment[];
  layers?: RoomLayer[];
  floorNames?: Record<number, string>; // G-15: custom floor labels; defaults to Indian convention names
  gridSize?: number; // G-9: snap grid step in feet
}

export interface ProjectVersion {
  id: string;
  name: string;
  timestamp: number;
  plan: FloorPlan;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  versions: ProjectVersion[];
}

// App-wide mode for the editor surface.
//   edit   — full mutation (drag, delete, keyboard, AI analyze).
//   view   — read-only canvas; no input events are honored.
//   comment— read-only canvas today; comment-placement UI is the only
//            handler that will be exempt from the appMode !== 'edit' gate.
export type AppMode = 'edit' | 'view' | 'comment';
