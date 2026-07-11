import type { RoomType } from '../types';

export interface ZonePageEntry {
  slug: string;
  zoneName: string;
  roomType: RoomType;
  title: string;
  description: string;
  keywords: string;
}

const ROOM_TYPES: RoomType[] = [
  'Bedroom',
  'Master Bedroom',
  'Kitchen',
  'Living Room',
  'Bathroom',
  'Pooja Room',
  'Dining',
  'Balcony',
  'Stairs',
  'Study',
  'Store',
  'Parking',
];

export const ZONE_NAMES = [
  'North',
  'North-East',
  'East',
  'South-East',
  'South',
  'South-West',
  'West',
  'North-West',
  'Brahmasthan',
] as const;

export type ZoneName = (typeof ZONE_NAMES)[number];

export const DIRECTION_BY_ZONE: Record<ZoneName, string> = {
  North: 'N',
  'North-East': 'NE',
  East: 'E',
  'South-East': 'SE',
  South: 'S',
  'South-West': 'SW',
  West: 'W',
  'North-West': 'NW',
  Brahmasthan: 'CENTER',
};

export function zoneNameToSlug(name: ZoneName | string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function roomTypeToSlug(type: RoomType): string {
  return type.toLowerCase().replace(/\s+/g, '-');
}

export function slugToRoomType(slug: string): RoomType | null {
  return ROOM_TYPES.find((rt) => roomTypeToSlug(rt) === slug) ?? null;
}

function entry(zoneName: ZoneName, roomType: RoomType): ZonePageEntry {
  const zoneSlug = zoneNameToSlug(zoneName);
  const roomSlug = roomTypeToSlug(roomType);
  const slug = `${zoneSlug}-${roomSlug}`;
  const title = `${roomType} in the ${zoneName} — Vastu guide | VastuPlan`;
  const description =
    zoneName === 'Brahmasthan'
      ? `Is a ${roomType} in the Brahmasthan (central zone) Vastu-compliant? Read the rule, score, and practical tips from VastuPlan's transparent direction matrix.`
      : `Is ${roomType} in the ${zoneName} direction good or bad according to Vastu Shastra? See the rule, element, score, and tips — and try it in VastuPlan's free planner.`;
  const keywords = `${roomType} ${zoneName} vastu, ${zoneName} ${roomType} direction, vastu for ${roomType}, ${zoneName.toLowerCase()} vastu tips, vastuplan`;
  return { slug, zoneName, roomType, title, description, keywords };
}

// 16 high-intent zone + room combinations chosen for SEO coverage of common
// Indian home-planning queries.
export const ZONE_PAGES: ZonePageEntry[] = [
  entry('North-East', 'Pooja Room'),
  entry('North-East', 'Kitchen'),
  entry('North-East', 'Study'),
  entry('North', 'Living Room'),
  entry('East', 'Kitchen'),
  entry('East', 'Pooja Room'),
  entry('East', 'Dining'),
  entry('South-East', 'Kitchen'),
  entry('South', 'Master Bedroom'),
  entry('South-West', 'Master Bedroom'),
  entry('South-West', 'Bedroom'),
  entry('South-West', 'Study'),
  entry('West', 'Dining'),
  entry('West', 'Study'),
  entry('North-West', 'Bathroom'),
  entry('North-West', 'Parking'),
];

const SLUG_INDEX = new Map(ZONE_PAGES.map((p) => [p.slug, p]));

export function getZonePageBySlug(slug: string): ZonePageEntry | undefined {
  return SLUG_INDEX.get(slug);
}

export function getAllZonePages(): ZonePageEntry[] {
  return ZONE_PAGES;
}
