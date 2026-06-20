// ============================================================
// Inmap v2 — POI Destinations (2GIS-style enriched data)
// ============================================================

import type { PointOfInterest, POICategory } from '../types/index';

// ── All POI Categories (for UI) ─────────────────────────────

export const ALL_CATEGORIES: POICategory[] = [
  'cafeteria', 'food', 'meeting_room', 'office', 'restroom',
  'elevator', 'stairs', 'reception', 'server_room', 'entrance',
  'entertainment', 'services', 'health', 'custom',
];

// ── Destinations ────────────────────────────────────────────

export const DESTINATIONS: PointOfInterest[] = [
  // ════════════════════════════════════════════════════════
  // GROUND FLOOR
  // ════════════════════════════════════════════════════════
  {
    id: 'POI_G_RECEPTION',
    name: 'Бюро пропусков / Security Desk',
    category: 'reception',
    position: { x: 5, y: 20 },
    floorId: 'FLOOR_GROUND',
    regionId: 'G_RECEPTION',
    icon: '🛎️',
    description: 'Регистрация посетителей, пропуска / Visitor check-in, passes',
    nearestWaypointId: 'G_WP_RECEP_INT',
    phone: '+55 11 3000-1001',
    rating: 4.5,
    reviewCount: 62,
    openingHours: { mon: '07:00–19:00', tue: '07:00–19:00', wed: '07:00–19:00', thu: '07:00–19:00', fri: '07:00–18:00', sat: '09:00–13:00', sun: 'Closed' },
    tags: ['Accessible', 'Information', 'Wi-Fi'],
    floor: 0,
    entranceNote: 'Main lobby, left side',
  },
  {
    id: 'POI_G_MTGA',
    name: 'Аудитория 101 / Lecture Hall 101',
    category: 'meeting_room',
    position: { x: 25, y: 1.5 },
    floorId: 'FLOOR_GROUND',
    regionId: 'G_MEETING_A',
    icon: '🏢',
    description: 'Лекционный зал на 60 мест / Lecture hall for 60 people',
    nearestWaypointId: 'G_WP_MTGA_INT',
    rating: 4.7,
    reviewCount: 34,
    openingHours: { mon: '08:00–20:00', tue: '08:00–20:00', wed: '08:00–20:00', thu: '08:00–20:00', fri: '08:00–18:00', sat: 'Closed', sun: 'Closed' },
    tags: ['Projector', 'Whiteboard', '8 seats'],
    floor: 0,
    entranceNote: 'South side of main corridor',
  },
  {
    id: 'POI_G_MTGB',
    name: 'Аудитория 102 / Lecture Hall 102',
    category: 'meeting_room',
    position: { x: 36, y: 1.5 },
    floorId: 'FLOOR_GROUND',
    regionId: 'G_MEETING_B',
    icon: '🏢',
    description: 'Лекционный зал на 100 мест / Lecture hall for 100 people',
    nearestWaypointId: 'G_WP_MTGB_INT',
    rating: 4.5,
    reviewCount: 28,
    openingHours: { mon: '08:00–20:00', tue: '08:00–20:00', wed: '08:00–20:00', thu: '08:00–20:00', fri: '08:00–18:00', sat: 'Closed', sun: 'Closed' },
    tags: ['Video Conference', 'Whiteboard', '12 seats'],
    floor: 0,
    entranceNote: 'Mid-corridor south wall',
  },
  {
    id: 'POI_G_CAFE',
    name: 'Столовая / Cafeteria',
    category: 'cafeteria',
    position: { x: 50, y: 5 },
    floorId: 'FLOOR_GROUND',
    regionId: 'G_CAFETERIA',
    icon: '☕',
    description: 'Студенческая столовая / Student dining hall',
    nearestWaypointId: 'G_WP_CAFE_INT',
    phone: '+55 11 3000-1010',
    website: 'https://greenbeancafe.example.com',
    rating: 4.3,
    reviewCount: 187,
    openingHours: { mon: '07:00–18:00', tue: '07:00–18:00', wed: '07:00–18:00', thu: '07:00–18:00', fri: '07:00–17:00', sat: '08:00–14:00', sun: 'Closed' },
    tags: ['Wi-Fi', 'Accessible', 'Vegan Options', 'Outdoor Seating'],
    floor: 0,
    entranceNote: 'East end of main corridor',
  },
  {
    id: 'POI_G_REST',
    name: 'Туалет / Restroom',
    category: 'restroom',
    position: { x: 25, y: 13 },
    floorId: 'FLOOR_GROUND',
    regionId: 'G_RESTROOMS',
    icon: '🚻',
    description: 'Туалет 1 этаж / Ground floor restroom',
    nearestWaypointId: 'G_WP_REST_INT',
    tags: ['Accessible', 'Baby Changing'],
    floor: 0,
    entranceNote: 'North side of corridor, near elevator',
  },
  {
    id: 'POI_G_OFFICE',
    name: 'Приёмная комиссия / Admissions',
    category: 'office',
    position: { x: 40, y: 17 },
    floorId: 'FLOOR_GROUND',
    regionId: 'G_OFFICE',
    icon: '💻',
    description: 'Приём документов / Document processing',
    nearestWaypointId: 'G_WP_OFFICE_INT',
    rating: 4.2,
    reviewCount: 15,
    openingHours: { mon: '07:00–22:00', tue: '07:00–22:00', wed: '07:00–22:00', thu: '07:00–22:00', fri: '07:00–20:00', sat: '09:00–17:00', sun: 'Closed' },
    tags: ['Wi-Fi', 'Standing Desks', 'Monitors'],
    floor: 0,
    entranceNote: 'Door from mid-corridor',
  },
  {
    id: 'POI_G_SERVER',
    name: 'Серверная / Server Room',
    category: 'server_room',
    position: { x: 54, y: 15 },
    floorId: 'FLOOR_GROUND',
    regionId: 'G_SERVER',
    icon: '🖥️',
    description: 'Серверная комната / Server infrastructure',
    nearestWaypointId: 'G_WP_SERVER_INT',
    tags: ['Restricted', 'Badge Required'],
    floor: 0,
    entranceNote: 'Through Engineering Hub (badge required)',
  },
  {
    id: 'POI_G_ELEVATOR',
    name: 'Лифт / Elevator',
    category: 'elevator',
    position: { x: 25, y: 21 },
    floorId: 'FLOOR_GROUND',
    regionId: 'G_ELEVATOR',
    icon: '🛗',
    description: 'Главный лифт / Main elevator',
    nearestWaypointId: 'G_WP_ELEV_INT',
    tags: ['Accessible', 'All Floors'],
    floor: 0,
    entranceNote: 'Through elevator lobby',
  },
  {
    id: 'POI_G_STAIRS',
    name: 'Лестница / Stairs',
    category: 'stairs',
    position: { x: 28, y: 21 },
    floorId: 'FLOOR_GROUND',
    regionId: 'G_ELEVATOR',
    icon: '🪜',
    description: 'Главная лестница / Main stairwell',
    nearestWaypointId: 'G_WP_STAIRS',
    tags: ['All Floors'],
    floor: 0,
    entranceNote: 'Next to elevator lobby',
  },

  // ════════════════════════════════════════════════════════
  // FIRST FLOOR
  // ════════════════════════════════════════════════════════
  {
    id: 'POI_F1_CONF',
    name: 'Актовый зал / Assembly Hall',
    category: 'meeting_room',
    position: { x: 10, y: 17 },
    floorId: 'FLOOR_1',
    regionId: 'F1_CONFERENCE',
    icon: '🎤',
    description: 'Актовый зал на 100 мест / Assembly hall for 100 people',
    nearestWaypointId: 'F1_WP_CONF_INT',
    phone: '+55 11 3000-2001',
    rating: 4.4,
    reviewCount: 56,
    openingHours: { mon: '08:00–21:00', tue: '08:00–21:00', wed: '08:00–21:00', thu: '08:00–21:00', fri: '08:00–19:00', sat: '09:00–15:00', sun: 'Closed' },
    tags: ['Projector', 'Microphone', 'Stage', '100 seats', 'Accessible'],
    floor: 1,
    entranceNote: 'Left from upper landing',
  },
  {
    id: 'POI_F1_TRAINING',
    name: 'Аудитория 201 / Lecture Hall 201',
    category: 'meeting_room',
    position: { x: 27, y: 1.5 },
    floorId: 'FLOOR_1',
    regionId: 'F1_TRAINING',
    icon: '📚',
    description: 'Лекционный зал на 30 мест / Lecture hall for 30 people',
    nearestWaypointId: 'F1_WP_TRAIN_INT',
    rating: 4.6,
    reviewCount: 42,
    openingHours: { mon: '09:00–18:00', tue: '09:00–18:00', wed: '09:00–18:00', thu: '09:00–18:00', fri: '09:00–17:00', sat: 'Closed', sun: 'Closed' },
    tags: ['Workstations', 'Projector', '30 seats'],
    floor: 1,
    entranceNote: 'South side of north corridor',
  },
  {
    id: 'POI_F1_WELLNESS',
    name: 'Аудитория 202 / Lecture Hall 202',
    category: 'health',
    position: { x: 42, y: 1.5 },
    floorId: 'FLOOR_1',
    regionId: 'F1_WELLNESS',
    icon: '🧘',
    description: 'Лекционный зал на 15 мест / Lecture hall for 15 people',
    nearestWaypointId: 'F1_WP_WELL_INT',
    rating: 4.8,
    reviewCount: 73,
    openingHours: { mon: '06:00–22:00', tue: '06:00–22:00', wed: '06:00–22:00', thu: '06:00–22:00', fri: '06:00–20:00', sat: '08:00–18:00', sun: '10:00–16:00' },
    tags: ['Quiet Zone', 'Yoga Mats', 'Meditation'],
    floor: 1,
    entranceNote: 'East end of north corridor',
  },
  {
    id: 'POI_F1_LAB',
    name: 'Компьютерный класс / Computer Lab',
    category: 'office',
    position: { x: 40, y: 17 },
    floorId: 'FLOOR_1',
    regionId: 'F1_LAB',
    icon: '💡',
    description: 'Компьютерный класс на 25 мест / Computer lab for 25 people',
    nearestWaypointId: 'F1_WP_LAB_INT',
    rating: 4.9,
    reviewCount: 31,
    openingHours: { mon: '07:00–22:00', tue: '07:00–22:00', wed: '07:00–22:00', thu: '07:00–22:00', fri: '07:00–20:00', sat: '09:00–17:00', sun: 'Closed' },
    tags: ['3D Printer', 'Prototyping', 'Wi-Fi', 'Whiteboards'],
    floor: 1,
    entranceNote: 'Through north corridor, midway',
  },
  {
    id: 'POI_F1_REST',
    name: 'Туалет 2 эт. / Restroom F2',
    category: 'restroom',
    position: { x: 25, y: 13 },
    floorId: 'FLOOR_1',
    regionId: 'F1_RESTROOMS',
    icon: '🚻',
    description: 'Туалет 2 этаж / 2nd floor restroom',
    nearestWaypointId: 'F1_WP_REST_INT',
    tags: ['Accessible'],
    floor: 1,
    entranceNote: 'North side of corridor',
  },
  {
    id: 'POI_F1_ELEVATOR',
    name: 'Лифт 2 эт. / Elevator F2',
    category: 'elevator',
    position: { x: 25, y: 21 },
    floorId: 'FLOOR_1',
    regionId: 'F1_ELEVATOR',
    icon: '🛗',
    description: 'Главный лифт 2 этаж / Main elevator 2nd floor',
    nearestWaypointId: 'F1_WP_ELEV_INT',
    tags: ['Accessible', 'All Floors'],
    floor: 1,
    entranceNote: 'Through elevator lobby',
  },

  // ════════════════════════════════════════════════════════
  // SECOND FLOOR
  // ════════════════════════════════════════════════════════
  {
    id: 'POI_F2_BOARDROOM',
    name: 'Деканат / Dean\'s Office',
    category: 'meeting_room',
    position: { x: 10, y: 17 },
    floorId: 'FLOOR_2',
    regionId: 'F2_BOARDROOM',
    icon: '🏛️',
    description: 'Кабинет декана / Dean\'s office',
    nearestWaypointId: 'F2_WP_BOARD_INT',
    phone: '+55 11 3000-3001',
    rating: 4.9,
    reviewCount: 18,
    openingHours: { mon: '08:00–19:00', tue: '08:00–19:00', wed: '08:00–19:00', thu: '08:00–19:00', fri: '08:00–17:00', sat: 'Closed', sun: 'Closed' },
    tags: ['Panoramic View', 'Video Conference', '24 seats', 'Premium'],
    floor: 2,
    entranceNote: 'Left from executive lobby',
  },
  {
    id: 'POI_F2_CEO',
    name: 'Кафедра информатики / CS Department',
    category: 'office',
    position: { x: 27, y: 1.5 },
    floorId: 'FLOOR_2',
    regionId: 'F2_CEO',
    icon: '💼',
    description: 'Кафедра информатики / Computer Science department',
    nearestWaypointId: 'F2_WP_CEO_INT',
    openingHours: { mon: '08:00–18:00', tue: '08:00–18:00', wed: '08:00–18:00', thu: '08:00–18:00', fri: '08:00–16:00', sat: 'Closed', sun: 'Closed' },
    tags: ['Executive', 'Appointment Required'],
    floor: 2,
    entranceNote: 'South side of executive corridor',
  },
  {
    id: 'POI_F2_CTO',
    name: 'Лаборатория / Research Lab',
    category: 'office',
    position: { x: 42, y: 1.5 },
    floorId: 'FLOOR_2',
    regionId: 'F2_CTO',
    icon: '💼',
    description: 'Научная лаборатория / Research laboratory',
    nearestWaypointId: 'F2_WP_CTO_INT',
    openingHours: { mon: '09:00–19:00', tue: '09:00–19:00', wed: '09:00–19:00', thu: '09:00–19:00', fri: '09:00–17:00', sat: 'Closed', sun: 'Closed' },
    tags: ['Executive', 'Appointment Required'],
    floor: 2,
    entranceNote: 'East end of executive corridor',
  },
  {
    id: 'POI_F2_LOUNGE',
    name: 'Читальный зал / Reading Room',
    category: 'entertainment',
    position: { x: 44, y: 17 },
    floorId: 'FLOOR_2',
    regionId: 'F2_LOUNGE',
    icon: '🌅',
    description: 'Читальный зал библиотеки / Library reading room',
    nearestWaypointId: 'F2_WP_LOUNGE_INT',
    phone: '+55 11 3000-3020',
    rating: 4.7,
    reviewCount: 134,
    openingHours: { mon: '11:00–22:00', tue: '11:00–22:00', wed: '11:00–22:00', thu: '11:00–23:00', fri: '11:00–00:00', sat: '12:00–00:00', sun: '12:00–20:00' },
    tags: ['Terrace', 'Bar', 'City View', 'Wi-Fi', 'Live Music (Thu-Sat)'],
    floor: 2,
    entranceNote: 'Through executive corridor, east side',
  },
  {
    id: 'POI_F2_ELEVATOR',
    name: 'Лифт 3 эт. / Elevator F3',
    category: 'elevator',
    position: { x: 25, y: 21 },
    floorId: 'FLOOR_2',
    regionId: 'F2_ELEVATOR',
    icon: '🛗',
    description: 'Главный лифт 3 этаж / Main elevator 3rd floor',
    nearestWaypointId: 'F2_WP_ELEV_INT',
    tags: ['Accessible', 'All Floors'],
    floor: 2,
    entranceNote: 'Elevator lobby',
  },
];

// ── Search & Filter Functions ───────────────────────────────

/**
 * Multi-token fuzzy search across name, description, category, and tags.
 * Each search token must appear in at least one field.
 */
export function searchDestinations(
  query: string,
  dataset: PointOfInterest[] = DESTINATIONS,
): PointOfInterest[] {
  if (!query || query.trim().length === 0) return [...dataset];

  const tokens = query.toLowerCase().trim().split(/\s+/);

  return dataset.filter((poi) => {
    const searchable = [
      poi.name,
      poi.description ?? '',
      poi.category,
      ...(poi.tags ?? []),
      poi.regionId ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return tokens.every((token) => searchable.includes(token));
  });
}

/** Filter destinations by POI category. */
export function getDestinationsByCategory(category: POICategory): PointOfInterest[] {
  return DESTINATIONS.filter((poi) => poi.category === category);
}

/** Filter destinations by floor ID. */
export function getDestinationsByFloor(floorId: string): PointOfInterest[] {
  return DESTINATIONS.filter((poi) => poi.floorId === floorId);
}
