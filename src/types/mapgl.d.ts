// ============================================================
// Inmap — 2GIS MapGL Type Declarations
// ============================================================
//
// The @2gis/mapgl package dynamically loads the WebGL map
// renderer. These declarations cover the public API surface
// used by the Inmap integration layer.
//
// Reference: https://dev.2gis.ru/
// ============================================================

// ── SDK Loader ──────────────────────────────────────────────

/**
 * The `@2gis/mapgl` package exports a single `load()` function
 * that async-loads the full MapGL API and returns the namespace.
 */
declare module '@2gis/mapgl' {
  /** Dynamically loads the MapGL API bundle. Resolves to the API namespace. */
  export function load(): Promise<MapglAPI>;

  // ── API Namespace ───────────────────────────────────────────

  export interface MapglAPI {
    Map: MapConstructor;
    Marker: MarkerConstructor;
    Polyline: PolylineConstructor;
    Polygon: PolygonConstructor;
    GeoJsonSource: GeoJsonSourceConstructor;
  }

  // ── Map ─────────────────────────────────────────────────────

  interface MapConstructor {
    new (container: HTMLElement | string, options: MapOptions): MapInstance;
  }

  export interface MapOptions {
    /** Center of the map as [longitude, latitude]. */
    center: [number, number];
    /** Initial zoom level (0–20). */
    zoom: number;
    /** MapGL API key obtained from https://dev.2gis.ru/ */
    key: string;
    /** Map style URL or preset name. */
    style?: string;
    /** Whether to show the built-in zoom control. */
    zoomControl?: boolean;
    /** Maximum allowed zoom level. */
    maxZoom?: number;
    /** Minimum allowed zoom level. */
    minZoom?: number;
    /** Initial pitch (tilt angle in degrees). */
    pitch?: number;
    /** Initial rotation (bearing in degrees). */
    rotation?: number;
    /** Whether the map should auto-resize when the container changes. */
    autoResize?: boolean;
  }

  export interface MapInstance {
    /** Removes the map from the DOM and cleans up resources. */
    destroy(): void;
    /** Sets the map center. */
    setCenter(center: [number, number], options?: AnimationOptions): void;
    /** Sets the map zoom level. */
    setZoom(zoom: number, options?: AnimationOptions): void;
    /** Returns current center as [longitude, latitude]. */
    getCenter(): [number, number];
    /** Returns current zoom level. */
    getZoom(): number;
    /** Sets the pitch (tilt) angle. */
    setPitch(pitch: number, options?: AnimationOptions): void;
    /** Sets the rotation (bearing) angle. */
    setRotation(rotation: number, options?: AnimationOptions): void;
    /** Returns the map container element. */
    getContainer(): HTMLElement;
    /** Subscribes to a map event. */
    on(event: MapEventType, handler: (e: MapEvent) => void): void;
    /** Unsubscribes from a map event. */
    off(event: MapEventType, handler: (e: MapEvent) => void): void;
    /** Triggers a resize recalculation. */
    invalidateSize(): void;
  }

  export interface AnimationOptions {
    /** Duration of the animation in milliseconds. */
    duration?: number;
    /** Easing function name. */
    easing?: string;
  }

  export type MapEventType =
    | 'click'
    | 'dblclick'
    | 'mousemove'
    | 'mousedown'
    | 'mouseup'
    | 'touchstart'
    | 'touchend'
    | 'zoom'
    | 'pitch'
    | 'rotation'
    | 'movestart'
    | 'move'
    | 'moveend'
    | 'resize'
    | 'idle';

  export interface MapEvent {
    /** Geographic coordinates of the event [lng, lat]. */
    lngLat?: [number, number];
    /** Screen coordinates of the event. */
    point?: { x: number; y: number };
    /** The original DOM event, if applicable. */
    originalEvent?: Event;
  }

  // ── Marker ──────────────────────────────────────────────────

  interface MarkerConstructor {
    new (map: MapInstance, options: MarkerOptions): MarkerInstance;
  }

  export interface MarkerOptions {
    /** Marker position as [longitude, latitude]. */
    coordinates: [number, number];
    /** URL or data-URI of a custom marker icon image. */
    icon?: string;
    /** Size of the custom icon in pixels [width, height]. */
    iconSize?: [number, number];
    /** Anchor point of the icon relative to position. */
    iconAnchor?: [number, number];
    /** Optional text label rendered next to the marker. */
    label?: MarkerLabel;
    /** Z-order among markers. */
    zIndex?: number;
  }

  export interface MarkerLabel {
    /** Text content of the label. */
    text: string;
    /** CSS color of the label text. */
    color?: string;
    /** Font size of the label. */
    fontSize?: number;
    /** Offset of the label from the marker in pixels. */
    offset?: [number, number];
  }

  export interface MarkerInstance {
    /** Removes the marker from the map. */
    destroy(): void;
    /** Moves the marker to new coordinates. */
    setCoordinates(coords: [number, number]): void;
    /** Returns current marker coordinates. */
    getCoordinates(): [number, number];
    /** Subscribes to marker events. */
    on(event: 'click' | 'mouseover' | 'mouseout', handler: (e: MapEvent) => void): void;
    /** Unsubscribes from marker events. */
    off(event: 'click' | 'mouseover' | 'mouseout', handler: (e: MapEvent) => void): void;
  }

  // ── Polyline ────────────────────────────────────────────────

  interface PolylineConstructor {
    new (map: MapInstance, options: PolylineOptions): PolylineInstance;
  }

  export interface PolylineOptions {
    /** Array of [longitude, latitude] coordinate pairs. */
    coordinates: [number, number][];
    /** Line color (CSS color string). */
    color?: string;
    /** Line width in pixels. */
    width?: number;
    /** Dash pattern [dash, gap] in pixels. */
    dashArray?: [number, number];
    /** Z-order among overlays. */
    zIndex?: number;
  }

  export interface PolylineInstance {
    /** Removes the polyline from the map. */
    destroy(): void;
  }

  // ── Polygon ─────────────────────────────────────────────────

  interface PolygonConstructor {
    new (map: MapInstance, options: PolygonOptions): PolygonInstance;
  }

  export interface PolygonOptions {
    /** Ring(s) of [longitude, latitude] coordinate pairs. */
    coordinates: [number, number][][];
    /** Fill color (CSS color string). */
    color?: string;
    /** Stroke color (CSS color string). */
    strokeColor?: string;
    /** Stroke width in pixels. */
    strokeWidth?: number;
    /** Z-order among overlays. */
    zIndex?: number;
  }

  export interface PolygonInstance {
    /** Removes the polygon from the map. */
    destroy(): void;
  }

  // ── GeoJsonSource ───────────────────────────────────────────

  interface GeoJsonSourceConstructor {
    new (map: MapInstance, options: GeoJsonSourceOptions): GeoJsonSourceInstance;
  }

  export interface GeoJsonSourceOptions {
    /** GeoJSON FeatureCollection or Feature. */
    data: Record<string, unknown>;
    /** Unique identifier for the source. */
    id?: string;
  }

  export interface GeoJsonSourceInstance {
    /** Removes the source from the map. */
    destroy(): void;
    /** Replaces the source data. */
    setData(data: Record<string, unknown>): void;
  }
}
