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

## 4. What is Missing (Product Roadmap & Improvements)

This section highlights features, bugs, or architectural improvements that are needed to transition the project from a local web-first prototype to a production-ready application.

### ⚠️ Bugs & Navigation Fixes
* **QRScanner Router Mismatch:** In [src/components/QRScanner.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/components/QRScanner.tsx#L80), the code triggers `navigate('/search')` after a successful simulation scan. However, there is no `/search` route registered in [src/App.tsx](file:///C:/Users/ResTIC16/.gemini/antigravity/scratch/inmap/src/App.tsx). 
  * *Fix needed:* Update the navigation callback to send the user back to the home route `/` (or update it to the proper state).

### 🛠️ Core Functional Implementations Missing
1. **Live Database Integration (Supabase Connection):**
   * *Current:* All POI data, building coordinates, and QR payloads are hardcoded locally.
   * *Missing:* Setup of `@supabase/supabase-js` client library, API hooks to fetch records from database tables dynamically, and synchronization of building graphs.
2. **Camera-Based Hardware QR Scanning:**
   * *Current:* QR codes are simulated with buttons.
   * *Missing:* Integration of browser media APIs via `html5-qrcode` or `@yudiel/react-qr-scanner` to read physical QR codes via mobile cameras.
3. **Mobile Sensors Fusion for AR view:**
   * *Current:* The 3D AR camera uses fixed mock orientations.
   * *Missing:* Integration with the `DeviceOrientation` API and Magnetometer/Compass sensors to rotate the 3D viewport dynamically relative to the physical orientation of the phone.
4. **Dynamic Multi-Floor Path Overlays on 2D Map:**
   * *Current:* The 2D Canvas shows paths only on the active floor.
   * *Missing:* Render indicators on the 2D plan representing path segments on other floors (e.g. "take elevator to F1" represented by a highlighted zone or dotted line on the ground floor).
5. **Cross-Floor Global Search UI:**
   * *Current:* Search autocomplete only returns POIs located on the currently active floor.
   * *Missing:* Unified search result lists showing matches across all floors, with badges indicating their floor levels (e.g. "Cafe (Floor 2)").
6. **Offline PWA Capabilities:**
   * *Current:* Standard client SPA.
   * *Missing:* Service workers to cache map layout geometries and pathfinding logic, allowing offline use inside buildings where internet connectivity is poor.
7. **Visual Map Editor (CMS):**
   * *Current:* Map edits require manually configuring vertices in typescript arrays.
   * *Missing:* An administration visual editor to draw regions, place waypoints, and wire pathways.
