export interface VastuZoneInfo {
  name: string;
  element: string;
  idealFor: string;
  tip: string;
}

const ZONES: Record<string, VastuZoneInfo> = {
  North: {
    name: 'North',
    element: 'Water / Mercury',
    idealFor: 'Main entrance, living room, study, cash locker',
    tip: 'Keep this zone open, well-lit, and free of heavy storage.',
  },
  'North-East': {
    name: 'North-East',
    element: 'Water / Deity',
    idealFor: 'Open courtyard, meditation, water feature, entrance',
    tip: 'The most auspicious zone — avoid heavy walls, toilets, or clutter here.',
  },
  East: {
    name: 'East',
    element: 'Sun',
    idealFor: 'Kitchen, bathrooms, dining, study',
    tip: 'Maximize morning light; avoid storing heavy objects in corners.',
  },
  'South-East': {
    name: 'South-East',
    element: 'Fire / Agni',
    idealFor: 'Kitchen, electrical panel, inverter, gym',
    tip: 'Ideal for heat and energy sources; avoid water bodies here.',
  },
  South: {
    name: 'South',
    element: 'Mars / Yama',
    idealFor: 'Master bedroom, store, staircase',
    tip: 'Keep heavier here than North; ideal for private, restful rooms.',
  },
  'South-West': {
    name: 'South-West',
    element: 'Earth / Rahu',
    idealFor: 'Master bedroom, wardrobe, heavy storage',
    tip: 'The heaviest zone; place main bedrooms and solid furniture here.',
  },
  West: {
    name: 'West',
    element: 'Water / Varuna',
    idealFor: 'Dining room, children bedroom, study, workshop',
    tip: 'Good for activity rooms; keep weight moderate.',
  },
  'North-West': {
    name: 'North-West',
    element: 'Air / Vayu',
    idealFor: 'Guest room, servant quarters, garage, utility',
    tip: 'Keep it light and functional; good for movement and visitors.',
  },
  Brahmasthan: {
    name: 'Brahmasthan',
    element: 'Space / Brahma',
    idealFor: 'Open central court, lightwell, passage',
    tip: 'The sacred center — keep clean, open, and free of heavy columns or toilets.',
  },
};

export function getVastuZoneInfo(name: string): VastuZoneInfo {
  return ZONES[name] ?? { name, element: '', idealFor: '', tip: '' };
}

export function getVastuZone(index: number, northAngle: number): string {
  if (index === 4) return 'Brahmasthan';

  const col = index % 3;
  const row = Math.floor(index / 3);
  const dx = col - 1;
  const dy = row - 1;

  const cellAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  let compassAngle = (cellAngle + 90 - northAngle) % 360;
  if (compassAngle < 0) compassAngle += 360;

  const snapped = (Math.round(compassAngle / 45) * 45) % 360;

  const directionNames: Record<number, string> = {
    0: 'North',
    45: 'North-East',
    90: 'East',
    135: 'South-East',
    180: 'South',
    225: 'South-West',
    270: 'West',
    315: 'North-West',
  };

  return directionNames[snapped] || '';
}
