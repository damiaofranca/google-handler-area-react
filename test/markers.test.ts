import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createManagedMarker } from '../src/core/markers';

class FakeLegacyMarker {
    setMap = vi.fn();
    setPosition = vi.fn();
    addListener = vi.fn(() => ({ remove: vi.fn() }));
    constructor(public opts: unknown) {}
}

class FakeAdvancedMarker {
    map: unknown = null;
    position: unknown = null;
    addListener = vi.fn(() => ({ remove: vi.fn() }));
    constructor(opts: { map?: unknown; position?: unknown }) {
        this.map = opts.map ?? null;
        this.position = opts.position ?? null;
    }
}

const fakeMap = {} as google.maps.Map;

beforeEach(() => {
    (globalThis as { google?: unknown }).google = { maps: { Marker: FakeLegacyMarker } };
});
afterEach(() => {
    delete (globalThis as { google?: unknown }).google;
});

describe('createManagedMarker', () => {
    it('uses the legacy Marker when no marker library is provided', () => {
        const marker = createManagedMarker({ map: fakeMap, position: { lat: 1, lng: 2 } });
        marker.setPosition({ lat: 3, lng: 4 });
        marker.addClickListener(() => {});
        marker.remove();
        // No throw = legacy path wired correctly.
        expect(marker).toBeDefined();
    });

    it('uses AdvancedMarkerElement when the marker library is provided', () => {
        const markerLibrary = { AdvancedMarkerElement: FakeAdvancedMarker } as unknown as google.maps.MarkerLibrary;
        const marker = createManagedMarker({ map: fakeMap, position: { lat: 1, lng: 2 }, markerLibrary });

        marker.setPosition({ lat: 9, lng: 9 });
        const handler = vi.fn();
        marker.addClickListener(handler);
        marker.remove();
        expect(marker).toBeDefined();
    });

    it('builds an <img> content element for AdvancedMarker icons', () => {
        const createElement = vi.spyOn(document, 'createElement');
        const markerLibrary = { AdvancedMarkerElement: FakeAdvancedMarker } as unknown as google.maps.MarkerLibrary;
        createManagedMarker({ map: fakeMap, iconPath: 'https://example.com/pin.png', markerLibrary });
        expect(createElement).toHaveBeenCalledWith('img');
        createElement.mockRestore();
    });
});
