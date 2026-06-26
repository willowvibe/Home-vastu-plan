import { FloorPlan, RoomType, RoomCategory } from '../types';

// Room category mapping for filtering
export const ROOM_CATEGORIES: Record<string, RoomCategory> = {
  Bedroom: 'Sleeping',
  'Master Bedroom': 'Sleeping',
  Kitchen: 'Kitchen',
  'Living Room': 'Living',
  Bathroom: 'Bathroom',
  'Pooja Room': 'Special',
  Dining: 'Living',
  Balcony: 'Other',
  Stairs: 'Other',
  Study: 'Sleeping',
  Store: 'Utility',
  Parking: 'Parking',
};

export const ROOM_TYPES: { type: RoomType; w: number; h: number }[] = [
  { type: 'Bedroom', w: 12, h: 12 },
  { type: 'Master Bedroom', w: 14, h: 12 },
  { type: 'Kitchen', w: 10, h: 10 },
  { type: 'Living Room', w: 16, h: 16 },
  { type: 'Bathroom', w: 6, h: 8 },
  { type: 'Pooja Room', w: 5, h: 5 },
  { type: 'Dining', w: 10, h: 12 },
  { type: 'Balcony', w: 10, h: 5 },
  { type: 'Stairs', w: 6, h: 12 },
  { type: 'Study', w: 10, h: 10 },
  { type: 'Store', w: 6, h: 6 },
  { type: 'Parking', w: 10, h: 16 },
];

export const INITIAL_PLAN: FloorPlan = {
  plotWidth: 30,
  plotHeight: 40,
  northAngle: 0,
  roadDirection: 'S',
  unit: 'ft',
  setbacks: { top: 3, right: 3, bottom: 3, left: 3 },
  rooms: [],
};

export const PLAN_TEMPLATES: Record<string, FloorPlan> = {
  'Small Apartment': {
    plotWidth: 25,
    plotHeight: 35,
    northAngle: 0,
    roadDirection: 'N',
    unit: 'ft',
    setbacks: { top: 2, right: 2, bottom: 2, left: 2 },
    rooms: [
      { id: 'tmpl-1', type: 'Living Room', x: 2, y: 2, w: 12, h: 10, floor: 0, wallThickness: 9 },
      { id: 'tmpl-2', type: 'Kitchen', x: 14, y: 2, w: 8, h: 10, floor: 0, wallThickness: 9 },
      { id: 'tmpl-3', type: 'Bathroom', x: 2, y: 12, w: 5, h: 6, floor: 0, wallThickness: 9 },
      { id: 'tmpl-4', type: 'Bedroom', x: 9, y: 12, w: 10, h: 10, floor: 0, wallThickness: 9 },
    ],
  },
  'Medium House': {
    plotWidth: 35,
    plotHeight: 45,
    northAngle: 0,
    roadDirection: 'N',
    unit: 'ft',
    setbacks: { top: 3, right: 3, bottom: 3, left: 3 },
    rooms: [
      { id: 'tmpl-5', type: 'Living Room', x: 3, y: 3, w: 16, h: 14, floor: 0, wallThickness: 9 },
      { id: 'tmpl-6', type: 'Dining', x: 21, y: 3, w: 10, h: 12, floor: 0, wallThickness: 9 },
      { id: 'tmpl-7', type: 'Kitchen', x: 3, y: 18, w: 10, h: 10, floor: 0, wallThickness: 9 },
      {
        id: 'tmpl-8',
        type: 'Master Bedroom',
        x: 15,
        y: 18,
        w: 14,
        h: 12,
        floor: 0,
        wallThickness: 9,
      },
      { id: 'tmpl-9', type: 'Bathroom', x: 15, y: 31, w: 6, h: 8, floor: 0, wallThickness: 9 },
      { id: 'tmpl-10', type: 'Bedroom', x: 23, y: 18, w: 10, h: 10, floor: 0, wallThickness: 9 },
    ],
  },
  'Large Villa': {
    plotWidth: 45,
    plotHeight: 60,
    northAngle: 0,
    roadDirection: 'N',
    unit: 'ft',
    setbacks: { top: 5, right: 5, bottom: 5, left: 5 },
    rooms: [
      { id: 'tmpl-11', type: 'Living Room', x: 5, y: 5, w: 20, h: 18, floor: 0, wallThickness: 9 },
      { id: 'tmpl-12', type: 'Dining', x: 27, y: 5, w: 14, h: 14, floor: 0, wallThickness: 9 },
      { id: 'tmpl-13', type: 'Kitchen', x: 5, y: 25, w: 12, h: 10, floor: 0, wallThickness: 9 },
      {
        id: 'tmpl-14',
        type: 'Master Bedroom',
        x: 19,
        y: 25,
        w: 16,
        h: 14,
        floor: 0,
        wallThickness: 9,
      },
      { id: 'tmpl-15', type: 'Pooja Room', x: 37, y: 25, w: 5, h: 5, floor: 0, wallThickness: 9 },
      { id: 'tmpl-16', type: 'Bedroom', x: 5, y: 37, w: 12, h: 12, floor: 0, wallThickness: 9 },
      { id: 'tmpl-17', type: 'Study', x: 19, y: 41, w: 10, h: 10, floor: 0, wallThickness: 9 },
      { id: 'tmpl-18', type: 'Bathroom', x: 37, y: 31, w: 8, h: 8, floor: 0, wallThickness: 9 },
      { id: 'tmpl-19', type: 'Balcony', x: 27, y: 21, w: 10, h: 5, floor: 0, wallThickness: 9 },
    ],
  },
};

export const ROOM_ELEMENTS: Record<RoomType, { type: string; w: number; h: number }[]> = {
  Bedroom: [
    { type: 'Bed', w: 6, h: 6.5 },
    { type: 'Cupboard', w: 6, h: 2 },
    { type: 'Side Table', w: 1.5, h: 1.5 },
  ],
  'Master Bedroom': [
    { type: 'King Bed', w: 7, h: 7 },
    { type: 'Wardrobe', w: 7, h: 2 },
    { type: 'Dresser', w: 4, h: 2 },
  ],
  Kitchen: [
    { type: 'Stove', w: 3, h: 2 },
    { type: 'Sink', w: 3, h: 2 },
    { type: 'Fridge', w: 2.5, h: 2.5 },
  ],
  'Living Room': [
    { type: 'Sofa', w: 7, h: 3 },
    { type: 'TV Unit', w: 6, h: 1.5 },
    { type: 'Coffee Table', w: 4, h: 2 },
  ],
  Bathroom: [
    { type: 'Toilet', w: 1.5, h: 2.5 },
    { type: 'Wash Basin', w: 2, h: 1.5 },
    { type: 'Shower', w: 3, h: 3 },
  ],
  'Pooja Room': [{ type: 'Mandir', w: 3, h: 2 }],
  Dining: [{ type: 'Dining Table', w: 6, h: 4 }],
  Balcony: [
    { type: 'Chair', w: 2, h: 2 },
    { type: 'Plants', w: 1.5, h: 1.5 },
  ],
  Stairs: [{ type: 'Staircase', w: 4, h: 10 }],
  Study: [
    { type: 'Desk', w: 4, h: 2 },
    { type: 'Chair', w: 2, h: 2 },
    { type: 'Bookshelf', w: 3, h: 1.5 },
  ],
  Store: [{ type: 'Shelf', w: 4, h: 1.5 }],
  Parking: [
    { type: 'Car', w: 6, h: 14 },
    { type: 'Bike', w: 2.5, h: 6 },
  ],
};

export const COMMON_ELEMENTS = [
  { type: 'Door', w: 3, h: 0.5 },
  { type: 'Window', w: 4, h: 0.5 },
];

/**
 * Format a floor number as an English ordinal: 0 → "0th", 1 → "1st",
 * 2 → "2nd", 11 → "11th", 21 → "21st", etc. The 11/12/13 special case
 * (and 111/112/113, 211/212/213, …) is the only non-mechanical part —
 * these always take "th" regardless of the last digit.
 */
export function formatFloor(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Default Indian-convention floor name for a floor index.
 * 0 → "Ground Floor", 1 → "First Floor", 2 → "Second Floor", etc.
 */
export function getDefaultFloorName(n: number): string {
  if (n === 0) return 'Ground Floor';
  if (n === 1) return 'First Floor';
  if (n === 2) return 'Second Floor';
  if (n === 3) return 'Third Floor';
  return `${formatFloor(n)} Floor`;
}

/**
 * Format a floor number for display, honoring any custom `floorNames`
 * mapping. Falls back to Indian-convention default names (Ground, First,
 * Second, ...) so new floors are auto-named without manual input.
 */
export function formatFloorLabel(n: number, floorNames?: Record<number, string>): string {
  const custom = floorNames?.[n];
  if (custom) return custom;
  return getDefaultFloorName(n);
}
