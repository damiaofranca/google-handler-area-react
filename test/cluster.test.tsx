import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';

const clusterInstances: Array<{ markers: unknown[]; clearMarkers: ReturnType<typeof vi.fn>; setMap: ReturnType<typeof vi.fn> }> = [];

vi.mock('@googlemaps/markerclusterer', () => ({
    MarkerClusterer: class {
        markers: unknown[];
        clearMarkers = vi.fn();
        setMap = vi.fn();
        constructor(opts: { markers: unknown[] }) {
            this.markers = opts.markers;
            clusterInstances.push(this);
        }
    }
}));

vi.mock('@googlemaps/react-wrapper', () => ({
    Status: { LOADING: 'LOADING', FAILURE: 'FAILURE', SUCCESS: 'SUCCESS' },
    Wrapper: ({ render }: { render: (s: string) => React.ReactNode }) => <>{render('SUCCESS')}</>
}));

const markerOpts: Array<Record<string, unknown>> = [];

class FakeMap {
    constructor(public container: HTMLElement) {}
    addListener = vi.fn(() => ({ remove: vi.fn() }));
}
class FakeMarker {
    setMap = vi.fn();
    setPosition = vi.fn();
    addListener = vi.fn(() => ({ remove: vi.fn() }));
    constructor(opts: Record<string, unknown>) {
        markerOpts.push(opts);
    }
}
class FakeInfoWindow {
    open = vi.fn();
    close = vi.fn();
    constructor(_: unknown) {}
}

beforeEach(() => {
    clusterInstances.length = 0;
    markerOpts.length = 0;
    (globalThis as { google?: unknown }).google = {
        maps: { Map: FakeMap, Marker: FakeMarker, InfoWindow: FakeInfoWindow, importLibrary: vi.fn(async () => ({})), event: { clearInstanceListeners: vi.fn() } }
    };
});
afterEach(() => {
    cleanup();
    delete (globalThis as { google?: unknown }).google;
});

import { InfosInMap } from '../src/components/InfosInMap';

const props = {
    apiKey: 'KEY',
    size: { width: '100%', height: '200px' },
    initialCoordinates: { lat: 0, lng: 0 },
    infoWindowHtml: '<p>$>name<$</p>',
    infos: [
        { lat: 1, lng: 1, name: 'A' },
        { lat: 2, lng: 2, name: 'B' },
        { lat: 3, lng: 3, name: 'C' }
    ]
};

describe('InfosInMap clustering', () => {
    it('creates a MarkerClusterer with all markers and does not attach them to the map directly', async () => {
        render(<InfosInMap {...props} cluster />);
        await waitFor(() => expect(clusterInstances.length).toBe(1));
        expect(clusterInstances[0].markers).toHaveLength(3);
        // addToMap:false -> markers built without a `map` option.
        expect(markerOpts.every((o) => o.map === undefined)).toBe(true);
    });

    it('does not create a clusterer when cluster is off', async () => {
        render(<InfosInMap {...props} />);
        await waitFor(() => expect(markerOpts.length).toBe(3));
        expect(clusterInstances.length).toBe(0);
        // markers attached directly to the map.
        expect(markerOpts.every((o) => o.map !== undefined)).toBe(true);
    });
});
