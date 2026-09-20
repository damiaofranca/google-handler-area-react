import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';

vi.mock('@googlemaps/react-wrapper', () => ({
    Status: { LOADING: 'LOADING', FAILURE: 'FAILURE', SUCCESS: 'SUCCESS' },
    Wrapper: ({ render }: { render: (s: string) => React.ReactNode }) => <>{render('SUCCESS')}</>
}));

const createdSearchEls: HTMLElement[] = [];

class FakeMap {
    constructor(public container: HTMLElement) {}
    addListener = vi.fn(() => ({ remove: vi.fn() }));
    setCenter = vi.fn();
    setZoom = vi.fn();
    getZoom = vi.fn(() => 13);
    fitBounds = vi.fn();
}
class FakeMarker {
    setMap = vi.fn();
    setPosition = vi.fn();
    addListener = vi.fn(() => ({ remove: vi.fn() }));
    constructor(_: unknown) {}
}
class FakePlaceAutocompleteElement {
    constructor() {
        const el = document.createElement('div');
        createdSearchEls.push(el);
        return el as unknown as FakePlaceAutocompleteElement;
    }
}

beforeEach(() => {
    createdSearchEls.length = 0;
    (globalThis as { google?: unknown }).google = {
        maps: {
            Map: FakeMap,
            Marker: FakeMarker,
            importLibrary: vi.fn(async () => ({})),
            event: { clearInstanceListeners: vi.fn() },
            places: { PlaceAutocompleteElement: FakePlaceAutocompleteElement }
        }
    };
});
afterEach(() => {
    cleanup();
    delete (globalThis as { google?: unknown }).google;
});

import { SelectLocation } from '../src/components/SelectLocation';

const props = { apiKey: 'KEY', size: { width: '100%', height: '200px' }, initialCoordinates: { lat: 0, lng: 0 } };

describe('SelectLocation search (PlaceAutocompleteElement)', () => {
    it('creates the search element and reports the selected place location', async () => {
        const onSetLocation = vi.fn();
        render(<SelectLocation {...props} showSearch onSetLocation={onSetLocation} />);

        await waitFor(() => expect(createdSearchEls.length).toBe(1));

        const el = createdSearchEls[0];
        const event = new Event('gmp-select');
        (event as unknown as { place: unknown }).place = {
            fetchFields: vi.fn(async () => {}),
            location: { lat: () => -23.5, lng: () => -46.6 }
        };
        el.dispatchEvent(event);

        await waitFor(() => expect(onSetLocation).toHaveBeenCalledWith({ lat: -23.5, lng: -46.6 }));
    });

    it('does not create a search element when showSearch is off', async () => {
        render(<SelectLocation {...props} onSetLocation={() => {}} />);
        await waitFor(() => expect((globalThis as { google: { maps: { importLibrary: ReturnType<typeof vi.fn> } } }).google.maps.importLibrary).toHaveBeenCalledTimes(0) || true);
        expect(createdSearchEls.length).toBe(0);
    });
});
