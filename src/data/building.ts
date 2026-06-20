// ============================================================
// Inmap v2 — 3-Floor Building Data
// ============================================================
//
// Building: 60m × 25m per floor, 3 floors.
//
// GROUND FLOOR (level 0): Office building ground floor
// FIRST FLOOR  (level 1): Conference & innovation wing
// SECOND FLOOR (level 2): Executive suite & rooftop lounge
//
// ============================================================

import type {
  Building,
  Floor,
  FloorConnector,
  Region,
  Waypoint,
  WaypointConnection,
} from '../types/index';

// ── Helpers ─────────────────────────────────────────────────

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

function walkConn(waypoints: Waypoint[], fromId: string, toId: string): WaypointConnection {
  const from = waypoints.find((w) => w.id === fromId)!;
  const to = waypoints.find((w) => w.id === toId)!;
  return { from: fromId, to: toId, cost: dist(from, to), type: 'walk', bidirectional: true, accessible: true };
}

function doorConn(waypoints: Waypoint[], fromId: string, toId: string): WaypointConnection {
  const from = waypoints.find((w) => w.id === fromId)!;
  const to = waypoints.find((w) => w.id === toId)!;
  return { from: fromId, to: toId, cost: dist(from, to), type: 'door', bidirectional: true, accessible: true };
}

// ════════════════════════════════════════════════════════════
// GROUND FLOOR (Level 0)
// ════════════════════════════════════════════════════════════

const G_REGIONS: Region[] = [
  { id: 'G_LOBBY',     type: 'lobby',         name: 'Главный вестибюль / Main Lobby',      polygon: [[0,0],[20,0],[20,15],[0,15]],     properties: { accessible: true, capacity: 50 } },
  { id: 'G_RECEPTION', type: 'room',          name: 'Бюро пропусков / Security Desk',       polygon: [[0,15],[10,15],[10,25],[0,25]],   properties: { accessible: true, department: 'Front Desk' } },
  { id: 'G_CORRIDOR',  type: 'corridor',      name: 'Главный коридор / Main Corridor',   polygon: [[20,3],[50,3],[50,10],[20,10]],   properties: { accessible: true } },
  { id: 'G_MEETING_A', type: 'room',          name: 'Аудитория 101 / Lecture Hall 101',  polygon: [[20,0],[30,0],[30,3],[20,3]],     properties: { accessible: true, capacity: 8, category: 'meeting' } },
  { id: 'G_MEETING_B', type: 'room',          name: 'Аудитория 102 / Lecture Hall 102',  polygon: [[30,0],[42,0],[42,3],[30,3]],     properties: { accessible: true, capacity: 12, category: 'meeting' } },
  { id: 'G_CAFETERIA', type: 'room',          name: 'Столовая / Cafeteria',       polygon: [[42,0],[58,0],[58,12],[42,12]],   properties: { accessible: true, capacity: 60 } },
  { id: 'G_RESTROOMS', type: 'restroom',      name: 'Туалет / Restroom',       polygon: [[20,10],[30,10],[30,17],[20,17]], properties: { accessible: true } },
  { id: 'G_OFFICE',    type: 'room',          name: 'Приёмная комиссия / Admissions Office',     polygon: [[30,10],[50,10],[50,25],[30,25]], properties: { accessible: true, capacity: 40, department: 'Engineering' } },
  { id: 'G_SERVER',    type: 'room',          name: 'Серверная / Server Room',     polygon: [[50,10],[58,10],[58,20],[50,20]], properties: { accessible: false, category: 'infrastructure' } },
  { id: 'G_ELEVATOR',  type: 'elevator_shaft', name: 'Лифтовой холл / Elevator Lobby', polygon: [[20,17],[30,17],[30,25],[20,25]], properties: { accessible: true } },
];

const G_WAYPOINTS: Waypoint[] = [
  // Main Lobby
  { id: 'G_WP_LOBBY_ENT',   x: 5,  y: 2,  regionId: 'G_LOBBY',     type: 'entrance' },
  { id: 'G_WP_LOBBY_INT',   x: 10, y: 7,  regionId: 'G_LOBBY',     type: 'navigation' },
  { id: 'G_WP_LOBBY_DOOR',  x: 18, y: 7,  regionId: 'G_LOBBY',     type: 'door' },
  // Reception
  { id: 'G_WP_RECEP_DOOR',  x: 5,  y: 15, regionId: 'G_RECEPTION', type: 'door' },
  { id: 'G_WP_RECEP_INT',   x: 5,  y: 20, regionId: 'G_RECEPTION', type: 'poi' },
  // Main Corridor
  { id: 'G_WP_CORR_W',      x: 22, y: 6,  regionId: 'G_CORRIDOR',  type: 'navigation' },
  { id: 'G_WP_CORR_MID',    x: 32, y: 6,  regionId: 'G_CORRIDOR',  type: 'navigation' },
  { id: 'G_WP_CORR_MID2',   x: 38, y: 6,  regionId: 'G_CORRIDOR',  type: 'navigation' },
  { id: 'G_WP_CORR_E',      x: 42, y: 6,  regionId: 'G_CORRIDOR',  type: 'navigation' },
  // Meeting Room A
  { id: 'G_WP_MTGA_DOOR',   x: 25, y: 3,  regionId: 'G_MEETING_A', type: 'door' },
  { id: 'G_WP_MTGA_INT',    x: 25, y: 1.5,regionId: 'G_MEETING_A', type: 'poi' },
  // Meeting Room B
  { id: 'G_WP_MTGB_DOOR',   x: 36, y: 3,  regionId: 'G_MEETING_B', type: 'door' },
  { id: 'G_WP_MTGB_INT',    x: 36, y: 1.5,regionId: 'G_MEETING_B', type: 'poi' },
  // Cafeteria
  { id: 'G_WP_CAFE_DOOR',   x: 44, y: 6,  regionId: 'G_CAFETERIA', type: 'door' },
  { id: 'G_WP_CAFE_INT',    x: 50, y: 5,  regionId: 'G_CAFETERIA', type: 'poi' },
  // Restrooms
  { id: 'G_WP_REST_DOOR',   x: 25, y: 10, regionId: 'G_RESTROOMS', type: 'door' },
  { id: 'G_WP_REST_INT',    x: 25, y: 13, regionId: 'G_RESTROOMS', type: 'poi' },
  // Open Office
  { id: 'G_WP_OFFICE_DOOR', x: 32, y: 10, regionId: 'G_OFFICE',    type: 'door' },
  { id: 'G_WP_OFFICE_INT',  x: 40, y: 17, regionId: 'G_OFFICE',    type: 'poi' },
  // Server Room
  { id: 'G_WP_SERVER_DOOR', x: 50, y: 14, regionId: 'G_SERVER',    type: 'door' },
  { id: 'G_WP_SERVER_INT',  x: 54, y: 15, regionId: 'G_SERVER',    type: 'poi' },
  // Elevator Lobby
  { id: 'G_WP_ELEV_DOOR',   x: 25, y: 17, regionId: 'G_ELEVATOR',  type: 'door' },
  { id: 'G_WP_ELEV_INT',    x: 25, y: 21, regionId: 'G_ELEVATOR',  type: 'floor_connector', connectedFloor: 'FLOOR_1', connectedWaypoint: 'F1_WP_ELEV_INT', connectorType: 'elevator' },
  // Stairs (near elevator)
  { id: 'G_WP_STAIRS',      x: 28, y: 21, regionId: 'G_ELEVATOR',  type: 'floor_connector', connectedFloor: 'FLOOR_1', connectedWaypoint: 'F1_WP_STAIRS', connectorType: 'stairs' },
];

const G_CONNECTIONS: WaypointConnection[] = [
  // Lobby internal
  walkConn(G_WAYPOINTS, 'G_WP_LOBBY_ENT',   'G_WP_LOBBY_INT'),
  walkConn(G_WAYPOINTS, 'G_WP_LOBBY_INT',   'G_WP_LOBBY_DOOR'),
  // Lobby ↔ Reception
  walkConn(G_WAYPOINTS, 'G_WP_LOBBY_INT',   'G_WP_RECEP_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_RECEP_DOOR',  'G_WP_RECEP_INT'),
  // Lobby ↔ Corridor
  doorConn(G_WAYPOINTS, 'G_WP_LOBBY_DOOR',  'G_WP_CORR_W'),
  // Corridor spine
  walkConn(G_WAYPOINTS, 'G_WP_CORR_W',      'G_WP_CORR_MID'),
  walkConn(G_WAYPOINTS, 'G_WP_CORR_MID',    'G_WP_CORR_MID2'),
  walkConn(G_WAYPOINTS, 'G_WP_CORR_MID2',   'G_WP_CORR_E'),
  // Meeting Room A
  doorConn(G_WAYPOINTS, 'G_WP_CORR_W',      'G_WP_MTGA_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_MTGA_DOOR',   'G_WP_MTGA_INT'),
  // Meeting Room B
  doorConn(G_WAYPOINTS, 'G_WP_CORR_MID2',   'G_WP_MTGB_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_MTGB_DOOR',   'G_WP_MTGB_INT'),
  // Cafeteria
  doorConn(G_WAYPOINTS, 'G_WP_CORR_E',      'G_WP_CAFE_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_CAFE_DOOR',   'G_WP_CAFE_INT'),
  // Restrooms
  doorConn(G_WAYPOINTS, 'G_WP_CORR_W',      'G_WP_REST_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_REST_DOOR',   'G_WP_REST_INT'),
  // Open Office
  doorConn(G_WAYPOINTS, 'G_WP_CORR_MID',    'G_WP_OFFICE_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_OFFICE_DOOR', 'G_WP_OFFICE_INT'),
  // Server Room (from office)
  walkConn(G_WAYPOINTS, 'G_WP_OFFICE_INT',  'G_WP_SERVER_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_SERVER_DOOR', 'G_WP_SERVER_INT'),
  // Elevator Lobby
  walkConn(G_WAYPOINTS, 'G_WP_REST_DOOR',   'G_WP_ELEV_DOOR'),
  doorConn(G_WAYPOINTS, 'G_WP_CORR_W',      'G_WP_ELEV_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_ELEV_DOOR',   'G_WP_ELEV_INT'),
  walkConn(G_WAYPOINTS, 'G_WP_ELEV_INT',    'G_WP_STAIRS'),
  // Cross-connections
  walkConn(G_WAYPOINTS, 'G_WP_OFFICE_DOOR', 'G_WP_REST_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_CORR_MID',    'G_WP_MTGB_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_CORR_E',      'G_WP_OFFICE_INT'),
  walkConn(G_WAYPOINTS, 'G_WP_ELEV_DOOR',   'G_WP_OFFICE_DOOR'),
  walkConn(G_WAYPOINTS, 'G_WP_CAFE_DOOR',   'G_WP_CORR_MID2'),
  walkConn(G_WAYPOINTS, 'G_WP_RECEP_DOOR',  'G_WP_LOBBY_DOOR'),
];

export const GROUND_FLOOR: Floor = {
  id: 'FLOOR_GROUND',
  name: 'Этаж 1 / Ground Floor',
  level: 0,
  heightMeters: 3.5,
  bounds: { minX: 0, minY: 0, maxX: 60, maxY: 25 },
  regions: G_REGIONS,
  waypoints: G_WAYPOINTS,
  connections: G_CONNECTIONS,
  anchors: [],
  pois: [],
};

// ════════════════════════════════════════════════════════════
// FIRST FLOOR (Level 1)
// ════════════════════════════════════════════════════════════

const F1_REGIONS: Region[] = [
  { id: 'F1_LANDING',    type: 'lobby',          name: 'Холл 2 этажа / 2nd Floor Hall',       polygon: [[0,0],[20,0],[20,10],[0,10]],     properties: { accessible: true } },
  { id: 'F1_CONFERENCE', type: 'room',           name: 'Актовый зал / Assembly Hall',   polygon: [[0,10],[20,10],[20,25],[0,25]],   properties: { accessible: true, capacity: 100, category: 'meeting' } },
  { id: 'F1_CORRIDOR',   type: 'corridor',       name: 'Коридор 2 этажа / 2nd Floor Corridor',      polygon: [[20,3],[50,3],[50,10],[20,10]],   properties: { accessible: true } },
  { id: 'F1_TRAINING',   type: 'room',           name: 'Аудитория 201 / Lecture Hall 201',       polygon: [[20,0],[35,0],[35,3],[20,3]],     properties: { accessible: true, capacity: 30 } },
  { id: 'F1_WELLNESS',   type: 'room',           name: 'Аудитория 202 / Lecture Hall 202',       polygon: [[35,0],[50,0],[50,3],[35,3]],     properties: { accessible: true, capacity: 15 } },
  { id: 'F1_LAB',        type: 'room',           name: 'Компьютерный класс / Computer Lab',      polygon: [[30,10],[50,10],[50,25],[30,25]], properties: { accessible: true, capacity: 25, department: 'R&D' } },
  { id: 'F1_RESTROOMS',  type: 'restroom',       name: 'Туалет 2 эт. / Restroom F2',        polygon: [[20,10],[30,10],[30,17],[20,17]], properties: { accessible: true } },
  { id: 'F1_ELEVATOR',   type: 'elevator_shaft', name: 'Лифтовой холл 2 эт. / Elevator Lobby F2',   polygon: [[20,17],[30,17],[30,25],[20,25]], properties: { accessible: true } },
];

const F1_WAYPOINTS: Waypoint[] = [
  // Upper Landing
  { id: 'F1_WP_LAND_INT',   x: 10, y: 5,  regionId: 'F1_LANDING',    type: 'navigation' },
  { id: 'F1_WP_LAND_DOOR',  x: 18, y: 5,  regionId: 'F1_LANDING',    type: 'door' },
  // Conference Center
  { id: 'F1_WP_CONF_DOOR',  x: 10, y: 10, regionId: 'F1_CONFERENCE', type: 'door' },
  { id: 'F1_WP_CONF_INT',   x: 10, y: 17, regionId: 'F1_CONFERENCE', type: 'poi' },
  // North Corridor
  { id: 'F1_WP_CORR_W',     x: 22, y: 6,  regionId: 'F1_CORRIDOR',   type: 'navigation' },
  { id: 'F1_WP_CORR_MID',   x: 35, y: 6,  regionId: 'F1_CORRIDOR',   type: 'navigation' },
  { id: 'F1_WP_CORR_E',     x: 45, y: 6,  regionId: 'F1_CORRIDOR',   type: 'navigation' },
  // Training Room
  { id: 'F1_WP_TRAIN_DOOR', x: 27, y: 3,  regionId: 'F1_TRAINING',   type: 'door' },
  { id: 'F1_WP_TRAIN_INT',  x: 27, y: 1.5,regionId: 'F1_TRAINING',   type: 'poi' },
  // Wellness Room
  { id: 'F1_WP_WELL_DOOR',  x: 42, y: 3,  regionId: 'F1_WELLNESS',   type: 'door' },
  { id: 'F1_WP_WELL_INT',   x: 42, y: 1.5,regionId: 'F1_WELLNESS',   type: 'poi' },
  // Innovation Lab
  { id: 'F1_WP_LAB_DOOR',   x: 35, y: 10, regionId: 'F1_LAB',        type: 'door' },
  { id: 'F1_WP_LAB_INT',    x: 40, y: 17, regionId: 'F1_LAB',        type: 'poi' },
  // Restrooms F1
  { id: 'F1_WP_REST_DOOR',  x: 25, y: 10, regionId: 'F1_RESTROOMS',  type: 'door' },
  { id: 'F1_WP_REST_INT',   x: 25, y: 13, regionId: 'F1_RESTROOMS',  type: 'poi' },
  // Elevator Lobby F1
  { id: 'F1_WP_ELEV_DOOR',  x: 25, y: 17, regionId: 'F1_ELEVATOR',   type: 'door' },
  { id: 'F1_WP_ELEV_INT',   x: 25, y: 21, regionId: 'F1_ELEVATOR',   type: 'floor_connector', connectedFloor: 'FLOOR_GROUND', connectedWaypoint: 'G_WP_ELEV_INT', connectorType: 'elevator' },
  { id: 'F1_WP_STAIRS',     x: 28, y: 21, regionId: 'F1_ELEVATOR',   type: 'floor_connector', connectedFloor: 'FLOOR_GROUND', connectedWaypoint: 'G_WP_STAIRS', connectorType: 'stairs' },
];

const F1_CONNECTIONS: WaypointConnection[] = [
  // Landing internal
  walkConn(F1_WAYPOINTS, 'F1_WP_LAND_INT',   'F1_WP_LAND_DOOR'),
  // Landing ↔ Conference
  walkConn(F1_WAYPOINTS, 'F1_WP_LAND_INT',   'F1_WP_CONF_DOOR'),
  walkConn(F1_WAYPOINTS, 'F1_WP_CONF_DOOR',  'F1_WP_CONF_INT'),
  // Landing ↔ Corridor
  doorConn(F1_WAYPOINTS, 'F1_WP_LAND_DOOR',  'F1_WP_CORR_W'),
  // Corridor spine
  walkConn(F1_WAYPOINTS, 'F1_WP_CORR_W',     'F1_WP_CORR_MID'),
  walkConn(F1_WAYPOINTS, 'F1_WP_CORR_MID',   'F1_WP_CORR_E'),
  // Training Room
  doorConn(F1_WAYPOINTS, 'F1_WP_CORR_W',     'F1_WP_TRAIN_DOOR'),
  walkConn(F1_WAYPOINTS, 'F1_WP_TRAIN_DOOR', 'F1_WP_TRAIN_INT'),
  // Wellness Room
  doorConn(F1_WAYPOINTS, 'F1_WP_CORR_MID',   'F1_WP_WELL_DOOR'),
  walkConn(F1_WAYPOINTS, 'F1_WP_WELL_DOOR',  'F1_WP_WELL_INT'),
  // Innovation Lab
  doorConn(F1_WAYPOINTS, 'F1_WP_CORR_MID',   'F1_WP_LAB_DOOR'),
  walkConn(F1_WAYPOINTS, 'F1_WP_LAB_DOOR',   'F1_WP_LAB_INT'),
  // Restrooms F1
  doorConn(F1_WAYPOINTS, 'F1_WP_CORR_W',     'F1_WP_REST_DOOR'),
  walkConn(F1_WAYPOINTS, 'F1_WP_REST_DOOR',  'F1_WP_REST_INT'),
  // Elevator Lobby F1
  walkConn(F1_WAYPOINTS, 'F1_WP_REST_DOOR',  'F1_WP_ELEV_DOOR'),
  walkConn(F1_WAYPOINTS, 'F1_WP_ELEV_DOOR',  'F1_WP_ELEV_INT'),
  walkConn(F1_WAYPOINTS, 'F1_WP_ELEV_INT',   'F1_WP_STAIRS'),
  // Cross-connections
  walkConn(F1_WAYPOINTS, 'F1_WP_CORR_W',     'F1_WP_ELEV_DOOR'),
  walkConn(F1_WAYPOINTS, 'F1_WP_LAB_DOOR',   'F1_WP_REST_DOOR'),
  walkConn(F1_WAYPOINTS, 'F1_WP_CORR_E',     'F1_WP_LAB_INT'),
  walkConn(F1_WAYPOINTS, 'F1_WP_CORR_MID',   'F1_WP_TRAIN_DOOR'),
  walkConn(F1_WAYPOINTS, 'F1_WP_CORR_E',     'F1_WP_WELL_DOOR'),
];

export const FIRST_FLOOR: Floor = {
  id: 'FLOOR_1',
  name: 'Этаж 2 / First Floor',
  level: 1,
  heightMeters: 3.5,
  bounds: { minX: 0, minY: 0, maxX: 60, maxY: 25 },
  regions: F1_REGIONS,
  waypoints: F1_WAYPOINTS,
  connections: F1_CONNECTIONS,
  anchors: [],
  pois: [],
};

// ════════════════════════════════════════════════════════════
// SECOND FLOOR (Level 2)
// ════════════════════════════════════════════════════════════

const F2_REGIONS: Region[] = [
  { id: 'F2_EXEC_LOBBY', type: 'lobby',          name: 'Библиотека / Library',     polygon: [[0,0],[20,0],[20,10],[0,10]],     properties: { accessible: true } },
  { id: 'F2_BOARDROOM',  type: 'room',           name: 'Деканат / Dean\'s Office',           polygon: [[0,10],[20,10],[20,25],[0,25]],   properties: { accessible: true, capacity: 24, category: 'meeting' } },
  { id: 'F2_CORRIDOR',   type: 'corridor',       name: 'Коридор 3 этажа / 3rd Floor Corridor',  polygon: [[20,3],[50,3],[50,10],[20,10]],   properties: { accessible: true } },
  { id: 'F2_CEO',        type: 'room',           name: 'Кафедра информатики / CS Department',          polygon: [[20,0],[35,0],[35,3],[20,3]],     properties: { accessible: true, category: 'executive' } },
  { id: 'F2_CTO',        type: 'room',           name: 'Лаборатория / Research Lab',          polygon: [[35,0],[50,0],[50,3],[35,3]],     properties: { accessible: true, category: 'executive' } },
  { id: 'F2_LOUNGE',     type: 'room',           name: 'Читальный зал / Reading Room',      polygon: [[30,10],[58,10],[58,25],[30,25]], properties: { accessible: true, capacity: 40 } },
  { id: 'F2_ELEVATOR',   type: 'elevator_shaft', name: 'Лифтовой холл 3 эт. / Elevator Lobby F3',   polygon: [[20,17],[30,17],[30,25],[20,25]], properties: { accessible: true } },
];

const F2_WAYPOINTS: Waypoint[] = [
  // Executive Lobby
  { id: 'F2_WP_ELOBBY_INT',   x: 10, y: 5,  regionId: 'F2_EXEC_LOBBY', type: 'navigation' },
  { id: 'F2_WP_ELOBBY_DOOR',  x: 18, y: 5,  regionId: 'F2_EXEC_LOBBY', type: 'door' },
  // Boardroom
  { id: 'F2_WP_BOARD_DOOR',   x: 10, y: 10, regionId: 'F2_BOARDROOM',  type: 'door' },
  { id: 'F2_WP_BOARD_INT',    x: 10, y: 17, regionId: 'F2_BOARDROOM',  type: 'poi' },
  // Executive Corridor
  { id: 'F2_WP_CORR_W',       x: 22, y: 6,  regionId: 'F2_CORRIDOR',   type: 'navigation' },
  { id: 'F2_WP_CORR_MID',     x: 35, y: 6,  regionId: 'F2_CORRIDOR',   type: 'navigation' },
  { id: 'F2_WP_CORR_E',       x: 45, y: 6,  regionId: 'F2_CORRIDOR',   type: 'navigation' },
  // CEO Office
  { id: 'F2_WP_CEO_DOOR',     x: 27, y: 3,  regionId: 'F2_CEO',        type: 'door' },
  { id: 'F2_WP_CEO_INT',      x: 27, y: 1.5,regionId: 'F2_CEO',        type: 'poi' },
  // CTO Office
  { id: 'F2_WP_CTO_DOOR',     x: 42, y: 3,  regionId: 'F2_CTO',        type: 'door' },
  { id: 'F2_WP_CTO_INT',      x: 42, y: 1.5,regionId: 'F2_CTO',        type: 'poi' },
  // Rooftop Lounge
  { id: 'F2_WP_LOUNGE_DOOR',  x: 35, y: 10, regionId: 'F2_LOUNGE',     type: 'door' },
  { id: 'F2_WP_LOUNGE_INT',   x: 44, y: 17, regionId: 'F2_LOUNGE',     type: 'poi' },
  // Elevator Lobby F2
  { id: 'F2_WP_ELEV_DOOR',    x: 25, y: 17, regionId: 'F2_ELEVATOR',   type: 'door' },
  { id: 'F2_WP_ELEV_INT',     x: 25, y: 21, regionId: 'F2_ELEVATOR',   type: 'floor_connector', connectedFloor: 'FLOOR_1', connectedWaypoint: 'F1_WP_ELEV_INT', connectorType: 'elevator' },
  { id: 'F2_WP_STAIRS',       x: 28, y: 21, regionId: 'F2_ELEVATOR',   type: 'floor_connector', connectedFloor: 'FLOOR_1', connectedWaypoint: 'F1_WP_STAIRS', connectorType: 'stairs' },
];

const F2_CONNECTIONS: WaypointConnection[] = [
  // Exec Lobby internal
  walkConn(F2_WAYPOINTS, 'F2_WP_ELOBBY_INT',  'F2_WP_ELOBBY_DOOR'),
  // Exec Lobby ↔ Boardroom
  walkConn(F2_WAYPOINTS, 'F2_WP_ELOBBY_INT',  'F2_WP_BOARD_DOOR'),
  walkConn(F2_WAYPOINTS, 'F2_WP_BOARD_DOOR',  'F2_WP_BOARD_INT'),
  // Exec Lobby ↔ Corridor
  doorConn(F2_WAYPOINTS, 'F2_WP_ELOBBY_DOOR', 'F2_WP_CORR_W'),
  // Corridor spine
  walkConn(F2_WAYPOINTS, 'F2_WP_CORR_W',      'F2_WP_CORR_MID'),
  walkConn(F2_WAYPOINTS, 'F2_WP_CORR_MID',    'F2_WP_CORR_E'),
  // CEO Office
  doorConn(F2_WAYPOINTS, 'F2_WP_CORR_W',      'F2_WP_CEO_DOOR'),
  walkConn(F2_WAYPOINTS, 'F2_WP_CEO_DOOR',    'F2_WP_CEO_INT'),
  // CTO Office
  doorConn(F2_WAYPOINTS, 'F2_WP_CORR_MID',    'F2_WP_CTO_DOOR'),
  walkConn(F2_WAYPOINTS, 'F2_WP_CTO_DOOR',    'F2_WP_CTO_INT'),
  // Rooftop Lounge
  doorConn(F2_WAYPOINTS, 'F2_WP_CORR_MID',    'F2_WP_LOUNGE_DOOR'),
  walkConn(F2_WAYPOINTS, 'F2_WP_LOUNGE_DOOR', 'F2_WP_LOUNGE_INT'),
  // Elevator Lobby F2
  walkConn(F2_WAYPOINTS, 'F2_WP_CORR_W',      'F2_WP_ELEV_DOOR'),
  walkConn(F2_WAYPOINTS, 'F2_WP_ELEV_DOOR',   'F2_WP_ELEV_INT'),
  walkConn(F2_WAYPOINTS, 'F2_WP_ELEV_INT',    'F2_WP_STAIRS'),
  // Cross-connections
  walkConn(F2_WAYPOINTS, 'F2_WP_LOUNGE_DOOR', 'F2_WP_ELEV_DOOR'),
  walkConn(F2_WAYPOINTS, 'F2_WP_CORR_E',      'F2_WP_LOUNGE_INT'),
  walkConn(F2_WAYPOINTS, 'F2_WP_CORR_E',      'F2_WP_CTO_DOOR'),
];

export const SECOND_FLOOR: Floor = {
  id: 'FLOOR_2',
  name: 'Этаж 3 / Second Floor',
  level: 2,
  heightMeters: 3.5,
  bounds: { minX: 0, minY: 0, maxX: 60, maxY: 25 },
  regions: F2_REGIONS,
  waypoints: F2_WAYPOINTS,
  connections: F2_CONNECTIONS,
  anchors: [],
  pois: [],
};

// ── All Floors ──────────────────────────────────────────────

export const ALL_FLOORS: Floor[] = [GROUND_FLOOR, FIRST_FLOOR, SECOND_FLOOR];

// ── Floor Connectors ────────────────────────────────────────

const FLOOR_CONNECTORS: FloorConnector[] = [
  {
    id: 'CONN_ELEVATOR',
    type: 'elevator',
    name: 'Главный лифт / Main Elevator',
    accessible: true,
    travelTimeSec: 15,
    connections: [
      { floorId: 'FLOOR_GROUND', waypointId: 'G_WP_ELEV_INT' },
      { floorId: 'FLOOR_1',     waypointId: 'F1_WP_ELEV_INT' },
      { floorId: 'FLOOR_2',     waypointId: 'F2_WP_ELEV_INT' },
    ],
  },
  {
    id: 'CONN_STAIRS',
    type: 'stairs',
    name: 'Главная лестница / Main Stairwell',
    accessible: false,
    travelTimeSec: 25,
    connections: [
      { floorId: 'FLOOR_GROUND', waypointId: 'G_WP_STAIRS' },
      { floorId: 'FLOOR_1',     waypointId: 'F1_WP_STAIRS' },
      { floorId: 'FLOOR_2',     waypointId: 'F2_WP_STAIRS' },
    ],
  },
];

// ── Building ────────────────────────────────────────────────

export const MOCK_BUILDING: Building = {
  id: 'BUILDING_HQ',
  name: 'НГУ — Главный корпус / NSU Main Building',
  address: 'ул. Пирогова, 1, Новосибирск / 1 Pirogova St, Novosibirsk',
  geoLocation: { latitude: 54.8478, longitude: 83.0886 },
  floors: ALL_FLOORS,
  floorConnectors: FLOOR_CONNECTORS,
};

// ── Lookup Helpers ──────────────────────────────────────────

/** Find a floor by its string ID. */
export function getFloorById(id: string): Floor | undefined {
  return ALL_FLOORS.find((f) => f.id === id);
}

/** Find a floor by its numeric level (0 = ground). */
export function getFloorByLevel(level: number): Floor | undefined {
  return ALL_FLOORS.find((f) => f.level === level);
}
