import type { ICoordinates } from './types';

/** Mean Earth radius in metres (WGS-84 authalic sphere, as used by Google Maps). */
const EARTH_RADIUS_M = 6378137;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Computes the geodesic area of a polygon, in **square metres**.
 *
 * Uses the spherical-excess formula on a sphere of Earth's radius (the same
 * approach as `google.maps.geometry.spherical.computeArea`), but as a **pure
 * function** — no Google Maps runtime or `geometry` library required. The ring
 * is closed automatically; vertex winding order does not affect the result
 * (the absolute value is returned).
 *
 * @param path - Polygon vertices (at least 3). Fewer returns `0`.
 * @returns Area in square metres (always ≥ 0).
 *
 * @example
 * ```ts
 * const m2 = computePolygonArea(coords);
 * const km2 = m2 / 1_000_000;
 * ```
 *
 * @public
 */
export const computePolygonArea = (path: ICoordinates[]): number => {
    if (!path || path.length < 3) return 0;

    let total = 0;
    for (let i = 0; i < path.length; i++) {
        const p1 = path[i];
        const p2 = path[(i + 1) % path.length];
        total += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
    }
    return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
};

/**
 * Computes the great-circle distance between two points, in **metres**
 * (haversine formula). Pure function.
 *
 * @public
 */
export const computeDistance = (a: ICoordinates, b: ICoordinates): number => {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Computes the perimeter of a polygon, in **metres** (sum of great-circle edge
 * lengths, including the closing edge). Pure function.
 *
 * @param path - Polygon vertices (at least 2). Fewer returns `0`.
 * @returns Perimeter in metres.
 *
 * @public
 */
export const computePolygonPerimeter = (path: ICoordinates[]): number => {
    if (!path || path.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < path.length; i++) {
        total += computeDistance(path[i], path[(i + 1) % path.length]);
    }
    return total;
};

/**
 * Computes the centroid (center of mass) of a polygon using the planar shoelace
 * formula on lat/lng. Accurate enough for city-scale areas; falls back to the
 * average of the vertices for degenerate (zero-area) inputs. Pure function.
 *
 * @param path - Polygon vertices (at least 1). Empty returns `null`.
 * @returns The centroid `{ lat, lng }`, or `null` for an empty path.
 *
 * @public
 */
export const computePolygonCentroid = (path: ICoordinates[]): ICoordinates | null => {
    if (!path || path.length === 0) return null;
    if (path.length < 3) {
        const avg = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
        return { lat: avg.lat / path.length, lng: avg.lng / path.length };
    }

    let twiceArea = 0;
    let lat = 0;
    let lng = 0;
    for (let i = 0; i < path.length; i++) {
        const p1 = path[i];
        const p2 = path[(i + 1) % path.length];
        const cross = p1.lng * p2.lat - p2.lng * p1.lat;
        twiceArea += cross;
        lat += (p1.lat + p2.lat) * cross;
        lng += (p1.lng + p2.lng) * cross;
    }

    if (twiceArea === 0) {
        const avg = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
        return { lat: avg.lat / path.length, lng: avg.lng / path.length };
    }

    const factor = 1 / (3 * twiceArea);
    return { lat: lat * factor, lng: lng * factor };
};

/**
 * Convenience bundle of a polygon's metrics.
 *
 * @public
 */
export interface PolygonMetrics {
    /** Area in square metres. */
    area: number;
    /** Perimeter in metres. */
    perimeter: number;
    /** Centroid, or `null` for an empty path. */
    centroid: ICoordinates | null;
}

/**
 * Computes {@link PolygonMetrics} (area, perimeter, centroid) for a polygon in
 * one call. Pure function.
 *
 * @public
 */
export const computePolygonMetrics = (path: ICoordinates[]): PolygonMetrics => ({
    area: computePolygonArea(path),
    perimeter: computePolygonPerimeter(path),
    centroid: computePolygonCentroid(path)
});
