# Inmap — System Architecture and Implementation Report

This document outlines the current state of the **Inmap** project, detailing what has been implemented, the system architecture, and what features/integrations are still missing (roadmap).

---

## 1. Project Overview & Current Implementation
**Inmap** is an interactive, dark-mode indoor navigation web application built using **React**, **TypeScript**, **Vite**, and **Zustand**. 

In version 2 (v2), the application was transformed from a step-by-step sequential AR-first wizard into a **2GIS-style interactive indoor map platform**. The user experiences a map-first layout where they can search for POIs, toggle floors, scan simulated QR codes to position themselves, and view turn-by-turn routing directly on a 2D floor plan, with an optional 3D AR mode.

### Active Routes
Defined in [src/App.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/App.tsx):
* `/` → `MapExplorer` (Home screen: 2D map canvas + search + bottom sheet)
* `/scan` → `QRScanner` (QR anchor simulation code scanning)
* `/ar` → `ARNavigationView` (3D scene navigator)

---

## 2. File-by-File Architecture Breakdown

### 📁 UI Components (`src/components/`)
* [MapExplorer.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/MapExplorer.tsx)
  * **Role:** Primary page orchestrator.
  * **Features:** Combines the map canvas, overlays, search controls, and bottom sheet state. Integrates floating map buttons (locate user, toggle map/AR).
* [FloorPlanCanvas.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/FloorPlanCanvas.tsx)
  * **Role:** Interactive HTML5 2D Canvas viewer.
  * **Features:** Custom pan-and-zoom and pinch gestures; draws floor boundaries, walls, doors, corridors, elevator shafts, stairwells, and POIs; renders the A\* navigation route as an animated neon path; animates user location updates (pulsating radial waves).
* [BottomSheet.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/BottomSheet.tsx)
  * **Role:** Snappable sliding bottom overlay panel.
  * **Features:** Custom touch/drag events with 4 distinct snap positions (`hidden`, `collapsed`, `expanded`, `full`). Houses either the POI detail card or navigation turn-by-turn guidance.
* [POIDetailCard.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/POIDetailCard.tsx)
  * **Role:** 2GIS-style business details viewer.
  * **Features:** Renders POI details: title, category, contact (phone/website/email), rating (stars), amenities tags, notes, and a collapsible weekly schedule table showing open/closed status based on timezone.
* [SearchBar.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/SearchBar.tsx)
  * **Role:** Map search controller.
  * **Features:** Autocomplete dropdown list with category-based icons; category quick-filters (Meeting Rooms, Restrooms, Cafeteria, Offices, ATMs, etc.); contains a navigation shortcut to the QR Scanner page.
* [FloorSwitcher.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/FloorSwitcher.tsx)
  * **Role:** Vertical floor selector widget.
  * **Features:** Enables switching between Ground (G), 1st, and 2nd floors with scale-popping button transitions.
* [RouteInfoPanel.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/RouteInfoPanel.tsx)
  * **Role:** Turn-by-turn routing HUD.
  * **Features:** Displays remaining distance (meters), estimated travel time (seconds), list of turn instructions with custom icons (straight, turn left/right, floor change), and an "arrived" modal celebration overlay.
* [QRScanner.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/QRScanner.tsx)
  * **Role:** Indoor positioning simulation view.
  * **Features:** Renders an animated camera viewfinder HUD overlay with a sweeps scan line. Provides a quick-tap grid of the 10 building QR code anchors to instantly warp/orient the user's starting point.
* [ARNavigationView.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/ARNavigationView.tsx)
  * **Role:** First-person 3D Navigation UI.
  * **Features:** Embeds the Three.js Canvas and renders the HUD overlays ([DirectionOverlay.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/DirectionOverlay.tsx)) and canvas minimap ([FloorPlanMinimap.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/FloorPlanMinimap.tsx)).
* **Legacy Components (Unrouted/Inactive in v2):**
  * [Dashboard.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/Dashboard.tsx): Old dashboard landing screen.
  * [DestinationSearch.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/DestinationSearch.tsx): Separate full-screen search interface.

### 📁 State Management (`src/store/`)
* [navigationStore.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/store/navigationStore.ts)
  * **Role:** Centralized state container utilizing **Zustand**.
  * **Features:** Coordinates search terms, floor levels, selected POIs, active navigation phase, bottom sheet snap height, and calculated waypoint paths. Communicates with the core navigation engine.

### 📁 Data Layer (`src/data/`)
* [building.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/data/building.ts): Defines the indoor map layout of the 3-floor building. Contains coordinates for 25 polygons (regions), 58 waypoints, 68 path connections, and vertical elevator/stairwell connections.
* [destinations.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/data/destinations.ts): Database mock of 21 POIs populated with 2GIS metadata: phone, ratings, website, tags, opening hours, and closest routing waypoints.
* [qrAnchors.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/data/qrAnchors.ts): Coordinates and payloads of the 10 QR code anchors across all 3 floors.

### 📁 Core Navigation Engine (`src/engine/`)
* [pathfinding.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/engine/pathfinding.ts): Implements A\* pathfinding on the waypoint graph.
* [navigationEngine.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/engine/navigationEngine.ts): State machine driving navigation phases.
* [directionCalculator.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/engine/directionCalculator.ts): Analyzes path angles to generate human-readable instructions (e.g., "Turn left in 8m").
* [navmesh.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/engine/navmesh.ts): Walkable spatial polygons.
* [coordinateMapper.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/engine/coordinateMapper.ts): Maps canvas coordinate systems to three-dimensional space vectors.

### 📁 3D Canvas / Scene (`src/scene/`)
* [BuildingScene.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/scene/BuildingScene.tsx), [FloorGeometry.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/scene/FloorGeometry.tsx), [PlayerCamera.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/scene/PlayerCamera.tsx), [DestinationMarker.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/scene/DestinationMarker.tsx), [NavigationPath3D.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/scene/NavigationPath3D.tsx)
  * **Role:** Renders a 3D floor plan layout, navigation path, markers, and player camera in WebGL via `@react-three/fiber` / `three`.

---

## 3. Supabase Database Schema Strategy
In the codebase, database integration is documented via comments in [src/types/index.ts](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/types/index.ts#L220-L267). It details how to set up tables in Supabase when transitioning to a remote database:
1. `buildings`: JSONB container storing layout shapes, nodes, and pathways.
2. `destinations`: Fields for tags, contact info, ratings, and locations of POIs.
3. `locations` (QR Anchors): Mapping QR string payloads to coordinates for positioning.

---

## 4. Implementation Status

This section was updated after a completion pass. Most of the original roadmap is
now implemented and the build + test suite are green. Items are grouped by their
real status.

### ✅ Done and verified (build + tests pass)

* **QRScanner routing bug** — fixed. The scanner returns to `/` after a scan; no
  `/search` route is referenced. (`src/components/QRScanner.tsx`)
* **Cross-floor global search** — search spans all floors with per-result floor
  badges (`G`, `F1`, `F2`), current-floor matches first, and automatic floor switch
  on selection. Browsing (no query) stays scoped to the active floor.
  (`computeFilteredDestinations` in `src/store/navigationStore.ts`; covered by
  `tests/crossFloorSearch.test.ts`)
* **Multi-floor path overlay on the 2D map** — the canvas splits the route by floor
  (`splitPathByFloor`), draws only the active floor's segment, and renders a pulsing
  connector badge ("🛗 ↑ F1") at the elevator/stairs where the route changes level.
  (`src/components/FloorPlanCanvas.tsx`)
* **Supabase data layer (optional, with fallback)** —
  `src/data/supabaseClient.ts` builds a client only when `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are set; `src/data/repository.ts` exposes async getters
  (`getDestinations`, `getQRAnchors`, `getFloors`) that read remotely when configured
  and **fall back to local data on any error/empty result**. `MapExplorer` calls
  `hydrateFromRemote()` on mount (no-op without config). Schema in
  `supabase/schema.sql`; env vars documented in `.env.example`.
* **Camera-based QR scanning** — `html5-qrcode` (lazy-loaded) behind a "📷 Use camera"
  toggle in `QRScanner.tsx`; the simulation grid stays as a fallback when the camera
  is denied/unavailable.
* **Device sensor fusion for AR** — `src/hooks/useDeviceOrientation.ts` reads the
  compass; a 🧭 toggle in `ARNavigationView` requests motion permission (iOS-safe) and
  drives the first-person camera heading, falling back to mouse-look without a sensor.
* **Offline PWA** — `public/manifest.webmanifest` + `public/sw.js` (cache-first app
  shell, network-first navigations), registered in `src/main.tsx` for production.
* **Compass control + dead code** — the previously-dead 🧭 placeholder in
  `MapExplorer` now recenters/fits the floor; unrouted legacy components
  `Dashboard.tsx` and `DestinationSearch.tsx` were removed.

### 🔬 Implemented, but validate on real hardware

These build cleanly and run, but can't be exercised in a desktop/CI environment, so
their final tuning should happen on a phone:

* **Camera QR runtime** — lighting/focus and payload format. The decoder accepts the
  raw anchor payload or a URL whose last path segment is the payload.
* **Compass heading** — the zero-offset and sign of the heading→yaw mapping can vary
  by device/OS; adjust in `src/scene/PlayerCamera.tsx` if north doesn't line up.

### 🛠️ Still open (separate sub-project)

* **Visual Map Editor (CMS)** — map edits still mean editing TypeScript arrays in
  `src/data/`. A drawing-based admin tool to place regions/waypoints/edges and write
  back to Supabase is a self-contained milestone; the schema above is its backend.

---

## 5. Running & Configuring

```bash
npm install
npm run dev        # dev server (http://localhost:5173)
npm run build      # type-check + production build
npx vitest run     # test suite (27 tests)
```

To enable the Supabase backend: copy `.env.example` to `.env.local`, fill in your
project URL and anon key, run `supabase/schema.sql` in the Supabase SQL editor, and
populate the tables. Without these, the app runs entirely on bundled local data, so
nothing breaks in development or offline.

---

## 6. Changelog

### v2.2 — Completion pass
* Multi-floor route overlay on the 2D map (connector badges for elevator/stairs).
* Supabase data layer with automatic local fallback (`supabaseClient`, `repository`,
  `schema.sql`, `.env.example`, `hydrateFromRemote`).
* Real camera QR scanning via `html5-qrcode` (lazy-loaded) with simulation fallback.
* Device-orientation/compass heading for the AR view (`useDeviceOrientation`).
* Offline PWA (manifest + service worker).
* Build green; vitest **27/27**.

### v2.1 — Maintenance & cross-floor search
* Cross-floor global search with floor badges and active-floor-first ordering
  (`tests/crossFloorSearch.test.ts`).
* Wired the previously-dead compass/recenter control in `MapExplorer`.
* Confirmed the QRScanner routing fix; removed unrouted legacy components.
