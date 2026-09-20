import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, renderHook } from '@testing-library/react';

const wrapperState = vi.hoisted(() => ({ status: 'SUCCESS' as const }));
vi.mock('@googlemaps/react-wrapper', () => {
    const Status = { LOADING: 'LOADING', FAILURE: 'FAILURE', SUCCESS: 'SUCCESS' } as const;
    return {
        Status,
        Wrapper: ({ render, apiKey }: { render: (s: string) => React.ReactNode; apiKey: string }) => <div data-apikey={apiKey}>{render(wrapperState.status)}</div>
    };
});

const maps: HTMLElement[] = [];
class FakeMap {
    constructor(public container: HTMLElement) {
        maps.push(container);
    }
    addListener = vi.fn(() => ({ remove: vi.fn() }));
}

beforeEach(() => {
    maps.length = 0;
    (globalThis as { google?: unknown }).google = {
        maps: { Map: FakeMap, Marker: class { setMap = vi.fn(); setPosition = vi.fn(); addListener = vi.fn(() => ({ remove: vi.fn() })); constructor(_: unknown) {} }, event: { clearInstanceListeners: vi.fn() } }
    };
});
afterEach(() => {
    cleanup();
    delete (globalThis as { google?: unknown }).google;
});

import { GoogleMapsProvider, useResolvedGoogleMapsConfig } from '../src/core/context';
import { SelectLocation } from '../src/components/SelectLocation';

const props = { size: { width: '100%', height: '200px' }, initialCoordinates: { lat: 0, lng: 0 }, onSetLocation: () => {} };

describe('useResolvedGoogleMapsConfig', () => {
    it('lets component props override provider config and merges libraries', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => <GoogleMapsProvider config={{ apiKey: 'PROVIDER', version: 'quarterly', libraries: ['places'] }}>{children}</GoogleMapsProvider>;
        const { result } = renderHook(() => useResolvedGoogleMapsConfig({ apiKey: 'OVERRIDE', libraries: ['marker'] }), { wrapper });
        expect(result.current.apiKey).toBe('OVERRIDE');
        expect(result.current.version).toBe('quarterly');
        expect(result.current.libraries).toEqual(expect.arrayContaining(['places', 'marker']));
    });
});

describe('SelectLocation + GoogleMapsProvider', () => {
    it('renders the failed fallback when no apiKey is available anywhere', () => {
        render(<SelectLocation {...props} failed={() => <div>no-key</div>} />);
        expect(screen.getByText('no-key')).toBeInTheDocument();
        expect(maps.length).toBe(0);
    });

    it('inherits the apiKey from the provider (no apiKey prop)', async () => {
        render(
            <GoogleMapsProvider config={{ apiKey: 'FROM_PROVIDER' }}>
                <SelectLocation {...props} />
            </GoogleMapsProvider>
        );
        await waitFor(() => expect(maps.length).toBe(1));
    });
});
