import { describe, it, expect } from 'vitest';
import { computePolygonArea, computePolygonPerimeter, computePolygonCentroid, computeDistance, computePolygonMetrics } from '../src/core/geometry';
import type { ICoordinates } from '../src/core/types';

const SQUARE: ICoordinates[] = [
    { lat: 0, lng: 0 },
    { lat: 1, lng: 0 },
    { lat: 1, lng: 1 },
    { lat: 0, lng: 1 }
];

describe('computeDistance', () => {
    it('matches one degree of longitude at the equator (~111.3 km)', () => {
        const d = computeDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
        expect(d).toBeGreaterThan(111_000);
        expect(d).toBeLessThan(111_600);
    });

    it('is zero for identical points', () => {
        expect(computeDistance({ lat: 5, lng: 5 }, { lat: 5, lng: 5 })).toBe(0);
    });
});

describe('computePolygonArea', () => {
    it('computes ~1.24e10 m² for a 1°×1° square near the equator', () => {
        const area = computePolygonArea(SQUARE);
        expect(area).toBeGreaterThan(1.2e10);
        expect(area).toBeLessThan(1.3e10);
    });

    it('is winding-order independent', () => {
        expect(computePolygonArea(SQUARE)).toBeCloseTo(computePolygonArea([...SQUARE].reverse()), 0);
    });

    it('returns 0 for fewer than 3 points', () => {
        expect(computePolygonArea([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }])).toBe(0);
        expect(computePolygonArea([])).toBe(0);
    });
});

describe('computePolygonPerimeter', () => {
    it('sums all four ~111 km edges of the square (~445 km)', () => {
        const p = computePolygonPerimeter(SQUARE);
        expect(p).toBeGreaterThan(444_000);
        expect(p).toBeLessThan(446_000);
    });

    it('returns 0 for fewer than 2 points', () => {
        expect(computePolygonPerimeter([{ lat: 0, lng: 0 }])).toBe(0);
    });
});

describe('computePolygonCentroid', () => {
    it('finds the center of a square', () => {
        const c = computePolygonCentroid(SQUARE)!;
        expect(c.lat).toBeCloseTo(0.5, 6);
        expect(c.lng).toBeCloseTo(0.5, 6);
    });

    it('averages for < 3 points and returns null for empty', () => {
        expect(computePolygonCentroid([{ lat: 2, lng: 4 }, { lat: 4, lng: 8 }])).toEqual({ lat: 3, lng: 6 });
        expect(computePolygonCentroid([])).toBeNull();
    });
});

describe('computePolygonMetrics', () => {
    it('bundles area, perimeter and centroid', () => {
        const m = computePolygonMetrics(SQUARE);
        expect(m.area).toBeGreaterThan(0);
        expect(m.perimeter).toBeGreaterThan(0);
        expect(m.centroid).not.toBeNull();
    });
});
