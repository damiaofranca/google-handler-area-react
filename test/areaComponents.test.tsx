import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup, act } from '@testing-library/react';

const wrapperState = vi.hoisted(() => ({ status: 'SUCCESS' as const }));

vi.mock('@googlemaps/react-wrapper', () => {
    const Status = { LOADING: 'LOADING', FAILURE: 'FAILURE', SUCCESS: 'SUCCESS' } as const;
    return {
        Status,
        Wrapper: ({ render }: { render: (status: string) => React.ReactNode }) => <>{render(wrapperState.status)}</>
    };
});

type Listeners = Record<string, Array<() => void>>;

const maps: FakeMap[] = [];
const polygons: FakePolygon[] = [];

class FakeLatLng {
    constructor(private _lat: number, private _lng: number) {}
    lat = () => this._lat;
    lng = () => this._lng;
}
class FakePath {
    __listeners: Listeners = {};
    private arr: FakeLatLng[] = [];
    constructor(seed: Array<{ lat: number; lng: number }> = []) {
        this.arr = seed.map((p) => new FakeLatLng(p.lat, p.lng));
    }
    getLength = () => this.arr.length;
    getArray = () => this.arr;
    push = (ll: FakeLatLng) => {
        this.arr.push(ll);
        (this.__listeners['insert_at'] ?? []).forEach((h) => h());
    };
}
class FakePolygon {
    __path: FakePath;
    setMap = vi.fn();
    getPath = () => this.__path;
    setPath = (p: FakePath) => {
        this.__path = p;
    };
    constructor(public opts: { paths?: Array<{ lat: number; lng: number }> }) {
        this.__path = new FakePath(opts.paths ?? []);
        polygons.push(this);
    }
}
class FakeMap {
    __listeners: Listeners = {};
    constructor(public container: HTMLElement) {
        maps.push(this);
    }
}

function makeGoogle() {
    return {
        maps: {
            Map: FakeMap,
            Polygon: FakePolygon,
            MVCArray: FakePath,
            event: {
                addListener: (target: { __listeners: Listeners }, event: string, handler: () => void) => {
                    (target.__listeners[event] ??= []).push(handler);
                    return {
                        remove: () => {
                            target.__listeners[event] = (target.__listeners[event] ?? []).filter((h) => h !== handler);
                        }
                    };
                },
                clearInstanceListeners: vi.fn()
            }
        }
    };
}

function clickMap(map: FakeMap, lat: number, lng: number) {
    act(() => {
        (map.__listeners['click'] ?? []).forEach((h) => (h as (e: unknown) => void)({ latLng: new FakeLatLng(lat, lng) }));
    });
}

beforeEach(() => {
    maps.length = 0;
    polygons.length = 0;
    (globalThis as { google?: unknown }).google = makeGoogle();
});
afterEach(() => {
    cleanup();
    delete (globalThis as { google?: unknown }).google;
});

import { CreateArea } from '../src/components/CreateArea';
import { UpdateArea } from '../src/components/UpdateArea';

const base = {
    apiKey: 'KEY',
    size: { width: '100%', height: '300px' },
    initialCoordinates: { lat: 0, lng: 0 }
};

describe('CreateArea (click-to-draw, no DrawingManager)', () => {
    it('creates a map on mount and no polygon until the user clicks', async () => {
        render(<CreateArea {...base} libraries={[]} onGetMap={() => {}} />);
        await waitFor(() => expect(maps.length).toBe(1));
        expect(polygons.length).toBe(0);
    });

    it('adds a vertex per click and reports the path', async () => {
        const onGetMap = vi.fn();
        render(<CreateArea {...base} libraries={[]} onGetMap={onGetMap} />);
        await waitFor(() => expect(maps.length).toBe(1));

        clickMap(maps[0], 1, 1);
        clickMap(maps[0], 2, 2);
        clickMap(maps[0], 3, 3);

        expect(polygons.length).toBe(1);
        const last = onGetMap.mock.calls.at(-1)?.[0];
        expect(last).toHaveLength(3);
        expect(last[0]).toEqual({ lat: 1, lng: 1 });
    });

    it('supports two independent maps at once', async () => {
        render(
            <>
                <CreateArea {...base} libraries={[]} onGetMap={() => {}} />
                <CreateArea {...base} libraries={[]} onGetMap={() => {}} />
            </>
        );
        await waitFor(() => expect(maps.length).toBe(2));
        expect(maps[0].container).not.toBe(maps[1].container);
    });

    it('removes the click listener and detaches the polygon on unmount', async () => {
        const { unmount } = render(<CreateArea {...base} libraries={[]} onGetMap={() => {}} />);
        await waitFor(() => expect(maps.length).toBe(1));
        clickMap(maps[0], 1, 1);
        const polygon = polygons[0];
        unmount();
        expect(polygon.setMap).toHaveBeenCalledWith(null);
        expect(maps[0].__listeners['click']).toHaveLength(0);
    });
});

describe('UpdateArea (click-to-draw, no DrawingManager)', () => {
    it('renders the existing polygon as an editable area', async () => {
        render(<UpdateArea {...base} onGetMap={() => {}} existingPolygon={[{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { lat: 3, lng: 3 }]} />);
        await waitFor(() => expect(polygons.length).toBe(1));
        expect(polygons[0].opts).toMatchObject({ editable: true });
        expect(polygons[0].getPath().getLength()).toBe(3);
    });

    it('starts with no polygon when existingPolygon is empty', async () => {
        render(<UpdateArea {...base} onGetMap={() => {}} existingPolygon={[]} />);
        await waitFor(() => expect(maps.length).toBe(1));
        expect(polygons.length).toBe(0);
    });
});
