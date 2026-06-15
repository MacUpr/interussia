// ============================================================
// Inmap v2 — Core Type Definitions
// ============================================================

// ── Building Structure ──────────────────────────────────────

export interface Building {
  id: string;
  name: string;
  address?: string;
  geoLocation?: { latitude: number; longitude: number };
  floors: Floor[];
  floorConnectors: FloorConnector[];
}

export interface Floor {
  id: string;
  name: string;
  level: number; // ordinal: 0 = ground, 1, 2, -1 = basement
  heightMeters: number; // floor-to-floor height (e.g. 3.5)
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  regions: Region[];
  waypoints: Waypoint[];
  connections: WaypointConnection[];
  anchors: QRAnchor[];
  pois: PointOfInterest[];
}

export interface Region {
  id: string;
  type: RegionType;
  name: string;
  polygon: [number, number][]; // 2D boundary vertices (clockwise)
  properties?: {
    accessible?: boolean;
    category?: string;
    capacity?: number;
    department?: string;
  };
}

export type RegionType =
  | 'room'
  | 'corridor'
  | 'lobby'
  | 'stairwell'
  | 'elevator_shaft'
  | 'restroom'
  | 'outdoor';

// ── Navigation Graph ────────────────────────────────────────

export interface Waypoint {
  id: string;
  x: number;
  y: number;
  regionId: string;
  type: WaypointType;
  // For floor connectors:
  connectedFloor?: string;
  connectedWaypoint?: string;
  connectorType?: 'stairs' | 'elevator' | 'escalator';
}

export type WaypointType =
  | 'navigation'
  | 'door'
  | 'poi'
  | 'entrance'
  | 'floor_connector';

export interface WaypointConnection {
  from: string;
  to: string;
  cost: number; // distance in meters
  type: ConnectionType;
  bidirectional: boolean;
  accessible?: boolean;
}

export type ConnectionType = 'walk' | 'door' | 'stairs' | 'elevator' | 'restricted';

export interface FloorConnector {
  id: string;
  type: 'stairs' | 'elevator' | 'escalator' | 'ramp';
  name?: string;
  accessible: boolean;
  connections: { floorId: string; waypointId: string }[];
  travelTimeSec?: number;
}

// ── QR Code Anchors ─────────────────────────────────────────

export interface QRAnchor {
  id: string;
  qrPayload: string; // encoded content (URL or ID string)
  floorId: string;
  position: { x: number; y: number };
  orientationDeg: number; // physical rotation: 0 = facing north
  heightFromFloor: number; // mounting height in meters
  description?: string; // human-readable: "Near elevator on Floor 1"
}

// ── Points of Interest ──────────────────────────────────────

export interface PointOfInterest {
  id: string;
  name: string;
  category: POICategory;
  position: { x: number; y: number };
  floorId: string;
  regionId?: string;
  icon: string; // emoji or icon key
  description?: string;
  nearestWaypointId: string; // closest nav-graph node for routing

  // 2GIS-style business detail fields
  phone?: string;
  website?: string;
  email?: string;
  rating?: number;          // 1.0 – 5.0 stars
  reviewCount?: number;
  openingHours?: WeeklyHours;
  photos?: string[];         // URL or placeholder keys
  tags?: string[];           // "Wi-Fi", "Parking", "Accessible", etc.
  floor?: number;            // display floor number for UI
  entranceNote?: string;     // "Enter through main lobby"
}

export interface WeeklyHours {
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  sun?: string;
}

export type POICategory =
  | 'meeting_room'
  | 'restroom'
  | 'elevator'
  | 'stairs'
  | 'entrance'
  | 'exit'
  | 'emergency_exit'
  | 'info_desk'
  | 'cafeteria'
  | 'office'
  | 'server_room'
  | 'reception'
  | 'food'
  | 'shopping'
  | 'services'
  | 'health'
  | 'entertainment'
  | 'parking'
  | 'atm'
  | 'custom';

// ── A* Pathfinding ──────────────────────────────────────────

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  neighbors: { nodeId: string; cost: number }[];
}

// ── Coordinate Mapping ──────────────────────────────────────

export interface CoordinateMapper {
  scale: number; // meters per map unit (default 1.0)
  originX: number; // world-space X offset
  originY: number; // world-space Y offset (floor height)
  originZ: number; // world-space Z offset
  rotation: number; // radians, Y-axis rotation for anchor alignment
  floorHeight: number; // Y-axis height for this floor
}

// ── Navigation State Machine ────────────────────────────────

export type NavigationPhase =
  | 'idle'
  | 'scanning'
  | 'selecting_destination'
  | 'navigating'
  | 'arrived';

export interface NavigationState {
  phase: NavigationPhase;
  currentPosition: { x: number; y: number } | null;
  currentFloor: string | null;
  scannedAnchor: QRAnchor | null;
  selectedDestination: PointOfInterest | null;
  calculatedPath: Waypoint[] | null;
  currentPathSegment: number;
  currentInstruction: string;
  distanceToNext: number;
  totalDistanceRemaining: number;
}

// ── Direction Instructions ──────────────────────────────────

export interface DirectionInstruction {
  type: 'straight' | 'turn_left' | 'turn_right' | 'slight_left' | 'slight_right' | 'u_turn' | 'arrived' | 'floor_change';
  text: string;
  distanceMeters: number;
  waypointId: string;
  icon: string; // arrow emoji/symbol
}

// ── Map View State (v2 — 2GIS-style) ───────────────────────

export type MapViewState = 'browsing' | 'poi_selected' | 'routing' | 'navigating';

export type BottomSheetState = 'hidden' | 'collapsed' | 'expanded' | 'full';

// ── Supabase Schema Comments ────────────────────────────────
//
// When migrating to Supabase, create the following tables:
//
// CREATE TABLE locations (
//   id          TEXT PRIMARY KEY,
//   qr_payload  TEXT UNIQUE NOT NULL,
//   floor_id    TEXT NOT NULL,
//   position_x  REAL NOT NULL,
//   position_y  REAL NOT NULL,
//   orientation_deg REAL DEFAULT 0,
//   height_from_floor REAL DEFAULT 1.5,
//   description TEXT,
//   created_at  TIMESTAMPTZ DEFAULT now()
// );
//
// CREATE TABLE destinations (
//   id          TEXT PRIMARY KEY,
//   name        TEXT NOT NULL,
//   category    TEXT NOT NULL,
//   floor_id    TEXT NOT NULL,
//   position_x  REAL NOT NULL,
//   position_y  REAL NOT NULL,
//   icon        TEXT DEFAULT '📍',
//   description TEXT,
//   phone       TEXT,
//   website     TEXT,
//   rating      REAL,
//   review_count INTEGER DEFAULT 0,
//   opening_hours JSONB,
//   tags        TEXT[],
//   entrance_note TEXT,
//   nearest_waypoint_id TEXT NOT NULL,
//   created_at  TIMESTAMPTZ DEFAULT now()
// );
//
// CREATE TABLE buildings (
//   id          TEXT PRIMARY KEY,
//   name        TEXT NOT NULL,
//   address     TEXT,
//   geo_lat     REAL,
//   geo_lng     REAL,
//   floor_data  JSONB NOT NULL, -- full Floor[] structure
//   created_at  TIMESTAMPTZ DEFAULT now()
// );
//
// -- RLS policies would restrict reads to authenticated users
// -- and writes to admin roles.
