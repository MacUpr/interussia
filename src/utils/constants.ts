// ============================================================
// Inmap v2 — Application Constants & Configuration
// ============================================================

// ── Color Palette ───────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  bgPrimary: '#0a0e1a',
  bgSecondary: '#111827',
  bgTertiary: '#1a2035',
  bgGlass: 'rgba(17, 24, 39, 0.75)',
  bgGlassLight: 'rgba(17, 24, 39, 0.45)',

  // Accent colors
  accentPrimary: '#00ffcc',    // Cyan/teal — AR path, primary CTAs
  accentSecondary: '#6366f1',  // Indigo — secondary elements
  accentWarning: '#f59e0b',    // Amber — turn warnings
  accentDanger: '#ef4444',     // Red — errors, cancel
  accentSuccess: '#10b981',    // Green — arrival, success

  // Text
  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',

  // Borders
  borderGlass: 'rgba(255, 255, 255, 0.08)',
  borderAccent: 'rgba(0, 255, 204, 0.3)',

  // 3D Scene
  wallColor: '#2a3050',
  floorColor: '#151b2e',
  doorColor: '#3b4570',
  pathColor: '#00ffcc',
  pathGlow: '#00ffcc',
  markerColor: '#6366f1',

  // 2D Map (v2 — 2GIS-style)
  mapBg: '#0f1729',
  mapCorridorFill: 'rgba(42, 48, 80, 0.4)',
  mapRoomFill: 'rgba(26, 32, 53, 0.6)',
  mapLobbyFill: 'rgba(30, 40, 65, 0.5)',
  mapRestroomFill: 'rgba(35, 45, 70, 0.5)',
  mapElevatorFill: 'rgba(40, 50, 80, 0.5)',
  mapStairwellFill: 'rgba(38, 48, 75, 0.5)',
  mapWallStroke: 'rgba(100, 120, 160, 0.6)',
  mapDoorStroke: 'rgba(0, 255, 204, 0.4)',
  mapRouteLine: '#00ffcc',
  mapUserDot: '#3b82f6',        // Blue dot (standard map convention)
  mapUserGlow: 'rgba(59, 130, 246, 0.3)',
  mapDestinationPin: '#6366f1',
  mapSelectedRegion: 'rgba(99, 102, 241, 0.25)',
  mapPoiLabel: 'rgba(249, 250, 251, 0.85)',
  mapPoiLabelBg: 'rgba(17, 24, 39, 0.7)',
} as const;

// ── 3D Scene Configuration ──────────────────────────────────

export const SCENE_CONFIG = {
  wallHeight: 2.8,              // meters
  wallThickness: 0.15,          // meters
  floorThickness: 0.05,         // meters
  doorWidth: 1.2,               // meters
  doorHeight: 2.2,              // meters
  pathTubeRadius: 0.06,         // meters
  pathElevation: 0.1,           // meters above floor
  markerFloatHeight: 2.0,       // meters above floor
  markerBobAmplitude: 0.15,     // meters
  markerBobSpeed: 1.5,          // oscillations per second
  cameraHeight: 1.6,            // meters (eye level)
  moveSpeed: 5.0,               // meters per second
  lookSensitivity: 0.002,       // radians per pixel
  nearClip: 0.1,
  farClip: 100,
  fov: 75,
} as const;

// ── Navigation Configuration ────────────────────────────────

export const NAV_CONFIG = {
  arrivalThreshold: 1.5,        // meters — how close to "arrive"
  turnAngleThreshold: 30,       // degrees — below = "continue straight"
  slightTurnThreshold: 60,      // degrees — below = "slight turn"
  uTurnThreshold: 150,          // degrees — above = "u-turn"
  instructionUpdateDistance: 2,  // meters — distance to trigger next instruction
  pathSmoothingSegments: 10,    // curve subdivisions per waypoint pair
  simulationSpeed: 3.0,         // meters/second in auto-walk mode
} as const;

// ── Map Configuration (v2) ──────────────────────────────────

export const MAP_CONFIG = {
  scale: 1.0,                   // 1 map unit = 1 meter
  defaultFloorHeight: 0,        // ground floor Y offset
  floorHeightStep: 3.5,         // meters between floors
  minimapWidth: 220,            // pixels
  minimapHeight: 160,           // pixels
  minimapPadding: 16,           // pixels inside minimap

  // 2D Floor Plan Canvas
  canvasMinZoom: 0.3,
  canvasMaxZoom: 4.0,
  canvasDefaultZoom: 1.0,
  poiLabelMinZoom: 1.2,         // show POI labels above this zoom
  infraIconMinZoom: 0.5,        // always show infrastructure icons
  routeLineWidth: 4,            // px at 1x zoom
  routeDashLength: 12,
  routeGapLength: 8,
  routeAnimSpeed: 0.5,          // dash offset per second
  userDotRadius: 8,             // px
  userDotPulseRadius: 20,       // px
  wallLineWidth: 1.5,           // px at 1x zoom
  regionLabelFontSize: 11,      // px at 1x zoom
  poiIconFontSize: 16,          // px at 1x zoom
} as const;

// ── Category Icons ──────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, string> = {
  meeting_room: '🏢',
  restroom: '🚻',
  elevator: '🛗',
  stairs: '🪜',
  entrance: '🚪',
  exit: '🚪',
  emergency_exit: '🚨',
  info_desk: '📋',
  cafeteria: '☕',
  office: '💻',
  server_room: '🖥️',
  reception: '🛎️',
  food: '🍽️',
  shopping: '🛍️',
  services: '🔧',
  health: '⚕️',
  entertainment: '🎮',
  parking: '🅿️',
  atm: '🏧',
  custom: '📍',
} as const;

// ── Category Labels (for UI chips) ──────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  meeting_room: 'Meeting Rooms',
  restroom: 'Restrooms',
  elevator: 'Elevators',
  stairs: 'Stairs',
  entrance: 'Entrances',
  cafeteria: 'Cafeteria',
  office: 'Offices',
  server_room: 'Server Room',
  reception: 'Reception',
  food: 'Food & Dining',
  shopping: 'Shopping',
  services: 'Services',
  health: 'Health',
  entertainment: 'Entertainment',
  custom: 'Other',
} as const;

// ── Infrastructure categories (always visible on map) ───────

export const INFRASTRUCTURE_CATEGORIES = new Set([
  'restroom', 'elevator', 'stairs', 'entrance', 'exit', 'emergency_exit',
]);

// ── Region type → fill color mapping (for 2D map) ──────────

export const REGION_FILL_COLORS: Record<string, string> = {
  room: COLORS.mapRoomFill,
  corridor: COLORS.mapCorridorFill,
  lobby: COLORS.mapLobbyFill,
  stairwell: COLORS.mapStairwellFill,
  elevator_shaft: COLORS.mapElevatorFill,
  restroom: COLORS.mapRestroomFill,
  outdoor: 'rgba(20, 30, 50, 0.3)',
} as const;

// ── Direction Icons ─────────────────────────────────────────

export const DIRECTION_ICONS: Record<string, string> = {
  straight: '⬆️',
  turn_left: '↰',
  turn_right: '↱',
  slight_left: '↖',
  slight_right: '↗',
  u_turn: '⤵️',
  arrived: '🎯',
  floor_change: '🛗',
} as const;

// ── QR Code Payloads ────────────────────────────────────────
// These are the payloads encoded in the physical QR codes.
// In production, these would be URLs (e.g., https://inmap.app/anchor/QR_LOBBY_01)

export const QR_PAYLOADS = {
  // Ground Floor (F0)
  QR_LOBBY_01: 'inmap://anchor/QR_LOBBY_01',
  QR_CORRIDOR_01: 'inmap://anchor/QR_CORRIDOR_01',
  QR_CORRIDOR_02: 'inmap://anchor/QR_CORRIDOR_02',
  QR_CAFE_01: 'inmap://anchor/QR_CAFE_01',
  QR_OFFICE_01: 'inmap://anchor/QR_OFFICE_01',
  QR_ELEVATOR_01: 'inmap://anchor/QR_ELEVATOR_01',
  // Floor 1 (F1)
  QR_F1_CONF_01: 'inmap://anchor/QR_F1_CONF_01',
  QR_F1_HALL_01: 'inmap://anchor/QR_F1_HALL_01',
  // Floor 2 (F2)
  QR_F2_EXEC_01: 'inmap://anchor/QR_F2_EXEC_01',
  QR_F2_LOUNGE_01: 'inmap://anchor/QR_F2_LOUNGE_01',
} as const;
