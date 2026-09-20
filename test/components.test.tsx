import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

// Control the Wrapper status per test.
const wrapperState = vi.hoisted(() => ({ status: 'SUCCESS' as 'LOADING' | 'FAILURE' | 'SUCCESS' }));

vi.mock('@googlemaps/react-wrapper', () => {
    const Status = { LOADING: 'LOADING', FAILURE: 'FAILURE', SUCCESS: 'SUCCESS' } as const;
    return {
        Status,
        Wrapper: ({ render }: { render: (status: string) => React.ReactNode }) => <>{render(wrapperState.status)}</>
    };
});

const mapContainers: HTMLElement[] = [];
const markers: FakeMarker[] = [];

class FakeMap {
    constructor(public container: HTMLElement) {
        mapContainers.push(container);
    }
    addListener = vi.fn(() => ({ remove: vi.fn() }));
}
class FakeMarker {
    setMap = vi.fn();
    setPosition = vi.fn();
    addListener = vi.fn(() => ({ remove: vi.fn() }));
    constructor(public opts: unknown) {
        markers.push(this);
    }
}
class FakeInfoWindow {
    open = vi.fn();
    close = vi.fn();
    constructor(public opts: unknown) {}
}

beforeEach(() => {
    mapContainers.length = 0;
    markers.length = 0;
    wrapperState.status = 'SUCCESS';
    (globalThis as { google?: unknown }).google = {
        maps: {
            Map: FakeMap,
            Marker: FakeMarker,
            InfoWindow: FakeInfoWindow,
            event: { clearInstanceListeners: vi.fn() }
        }
    };
});
afterEach(() => {
    cleanup();
    delete (globalThis as { google?: unknown }).google;
});

import { SelectLocation } from '../src/components/SelectLocation';
import { InfosInMap } from '../src/components/InfosInMap';

const commonProps = {
    apiKey: 'KEY',
    size: { width: '100%', height: '300px' },
    initialCoordinates: { lat: 0, lng: 0 },
    onSetLocation: () => {}
};

describe('SelectLocation', () => {
    it('renders the custom loading component while loading', () => {
        wrapperState.status = 'LOADING';
        render(<SelectLocation {...commonProps} loading={() => <div>custom-loading</div>} />);
        expect(screen.getByText('custom-loading')).toBeInTheDocument();
    });

    it('renders the custom failed component on failure', () => {
        wrapperState.status = 'FAILURE';
        render(<SelectLocation {...commonProps} failed={() => <div>custom-failed</div>} />);
        expect(screen.getByText('custom-failed')).toBeInTheDocument();
    });

    it('mounts two independent maps into two different containers (no id collision)', async () => {
        render(
            <>
                <SelectLocation {...commonProps} />
                <SelectLocation {...commonProps} />
            </>
        );
        await waitFor(() => expect(mapContainers.length).toBe(2));
        expect(mapContainers[0]).not.toBe(mapContainers[1]);
        expect(mapContainers[0]).toBeInstanceOf(HTMLElement);
    });
});

describe('InfosInMap', () => {
    const infosProps = {
        apiKey: 'KEY',
        size: { width: '100%', height: '300px' },
        initialCoordinates: { lat: 0, lng: 0 },
        infoWindowHtml: '<p>$>name<$</p>'
    };

    it('creates one marker per info entry', async () => {
        render(<InfosInMap {...infosProps} infos={[{ lat: 1, lng: 1, name: 'A' }, { lat: 2, lng: 2, name: 'B' }]} />);
        await waitFor(() => expect(markers.length).toBe(2));
    });

    it('removes previous markers when infos change (no orphans)', async () => {
        const { rerender } = render(<InfosInMap {...infosProps} infos={[{ lat: 1, lng: 1, name: 'A' }, { lat: 2, lng: 2, name: 'B' }]} />);
        await waitFor(() => expect(markers.length).toBe(2));
        const first = markers.slice();

        rerender(<InfosInMap {...infosProps} infos={[{ lat: 3, lng: 3, name: 'C' }]} />);
        await waitFor(() => expect(markers.length).toBe(3));

        // The two original markers were detached from the map.
        expect(first[0].setMap).toHaveBeenCalledWith(null);
        expect(first[1].setMap).toHaveBeenCalledWith(null);
    });
});
