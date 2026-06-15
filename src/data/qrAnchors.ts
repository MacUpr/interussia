// ============================================================
// Inmap v2 — QR Code Anchors (10 anchors, 3 floors)
// ============================================================

import type { QRAnchor } from '../types/index';
import { QR_PAYLOADS } from '../utils/constants';

// ── Anchor Definitions ──────────────────────────────────────

export const QR_ANCHORS: QRAnchor[] = [
  // ── Ground Floor (6 anchors) ──
  {
    id: 'QR_LOBBY_01',
    qrPayload: QR_PAYLOADS.QR_LOBBY_01,
    floorId: 'FLOOR_GROUND',
    position: { x: 5, y: 7 },
    orientationDeg: 0,
    heightFromFloor: 1.5,
    description: 'Main lobby entrance',
  },
  {
    id: 'QR_CORRIDOR_01',
    qrPayload: QR_PAYLOADS.QR_CORRIDOR_01,
    floorId: 'FLOOR_GROUND',
    position: { x: 22, y: 6 },
    orientationDeg: 90,
    heightFromFloor: 1.5,
    description: 'Corridor start (west end)',
  },
  {
    id: 'QR_CORRIDOR_02',
    qrPayload: QR_PAYLOADS.QR_CORRIDOR_02,
    floorId: 'FLOOR_GROUND',
    position: { x: 38, y: 6 },
    orientationDeg: 90,
    heightFromFloor: 1.5,
    description: 'Corridor mid-point',
  },
  {
    id: 'QR_CAFE_01',
    qrPayload: QR_PAYLOADS.QR_CAFE_01,
    floorId: 'FLOOR_GROUND',
    position: { x: 44, y: 5 },
    orientationDeg: 180,
    heightFromFloor: 1.5,
    description: 'Cafeteria entrance',
  },
  {
    id: 'QR_OFFICE_01',
    qrPayload: QR_PAYLOADS.QR_OFFICE_01,
    floorId: 'FLOOR_GROUND',
    position: { x: 32, y: 14 },
    orientationDeg: 0,
    heightFromFloor: 1.5,
    description: 'Open office area',
  },
  {
    id: 'QR_ELEVATOR_01',
    qrPayload: QR_PAYLOADS.QR_ELEVATOR_01,
    floorId: 'FLOOR_GROUND',
    position: { x: 25, y: 20 },
    orientationDeg: 270,
    heightFromFloor: 1.5,
    description: 'Elevator lobby (Ground)',
  },

  // ── First Floor (2 anchors) ──
  {
    id: 'QR_F1_CONF_01',
    qrPayload: QR_PAYLOADS.QR_F1_CONF_01,
    floorId: 'FLOOR_1',
    position: { x: 10, y: 17 },
    orientationDeg: 0,
    heightFromFloor: 1.5,
    description: 'Conference Center (Floor 1)',
  },
  {
    id: 'QR_F1_HALL_01',
    qrPayload: QR_PAYLOADS.QR_F1_HALL_01,
    floorId: 'FLOOR_1',
    position: { x: 35, y: 6 },
    orientationDeg: 90,
    heightFromFloor: 1.5,
    description: 'North Corridor (Floor 1)',
  },

  // ── Second Floor (2 anchors) ──
  {
    id: 'QR_F2_EXEC_01',
    qrPayload: QR_PAYLOADS.QR_F2_EXEC_01,
    floorId: 'FLOOR_2',
    position: { x: 10, y: 5 },
    orientationDeg: 0,
    heightFromFloor: 1.5,
    description: 'Executive Lobby (Floor 2)',
  },
  {
    id: 'QR_F2_LOUNGE_01',
    qrPayload: QR_PAYLOADS.QR_F2_LOUNGE_01,
    floorId: 'FLOOR_2',
    position: { x: 44, y: 17 },
    orientationDeg: 180,
    heightFromFloor: 1.5,
    description: 'Rooftop Lounge (Floor 2)',
  },
];

// ── Lookup by payload (O(1)) ────────────────────────────────

const payloadMap = new Map<string, QRAnchor>(
  QR_ANCHORS.map((a) => [a.qrPayload, a])
);

/** Find anchor by QR code payload string. */
export function findAnchorByPayload(payload: string): QRAnchor | undefined {
  return payloadMap.get(payload);
}

/** Get all anchors for a specific floor. */
export function getAnchorsByFloor(floorId: string): QRAnchor[] {
  return QR_ANCHORS.filter((a) => a.floorId === floorId);
}
