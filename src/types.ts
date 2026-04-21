export type RoomType =
  | "Bedroom"
  | "Kitchen"
  | "Living Room"
  | "Bathroom"
  | "Pooja Room"
  | "Dining"
  | "Balcony"
  | "Stairs"
  | "Study"
  | "Store"
  | "Parking";

// Room metadata and organization
export type RoomCategory =
  | "Living"
  | "Sleeping"
  | "Kitchen"
  | "Bathroom"
  | "Utility"
  | "Special"
  | "Parking"
  | "Other";

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
  floor: number; // 0 = Ground, 1 = First, etc.
  wallThickness: number; // in inches, e.g. 9 for external, 4.5 for internal
  category?: RoomCategory;
  tags?: RoomTags;
  notes?: string;
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

export interface PlanUpdateEvent {
  type: "room" | "plan" | "element";
  action: "add" | "update" | "delete" | "move";
  data: any;
  timestamp: number;
  userId: string;
  userName: string;
}

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
  x: number;
  y: number;
  author: string;
  timestamp: number;
}

export interface FloorPlan {
  plotWidth: number; // e.g. 30
  plotHeight: number; // e.g. 40
  northAngle: number; // 0 = UP, 90 = RIGHT, etc.
  roadDirection: "N" | "E" | "S" | "W";
  unit: "ft" | "m";
  setbacks: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  rooms: Room[];
  comments?: Comment[];
  layers?: RoomLayer[];
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
