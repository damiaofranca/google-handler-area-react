import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const state = vi.hoisted(() => ({
    ctorCalls: 0,
    lastOptions: null as unknown,
    load: vi.fn(async () => ({ maps: {} }) as unknown as typeof google),
    importLibrary: vi.fn(async (name: string) => ({ name }))
}));

vi.mock('@googlemaps/js-api-loader', () => ({
    Loader: class {
        constructor(options: unknown) {
            state.ctorCalls++;
            state.lastOptions = options;
        }
        load() {
            return state.load();
        }
        importLibrary(name: string) {
            return state.importLibrary(name);
        }
    }
}));

import { loadGoogleMaps, importMapsLibrary, resetGoogleMapsLoader, isGoogleMapsLoaded } from '../src/core/loader';
import { GoogleMapsError } from '../src/core/errors';

const OPTS = { apiKey: 'KEY_A', libraries: ['drawing' as const] };

beforeEach(() => {
    resetGoogleMapsLoader();
    state.ctorCalls = 0;
    state.load.mockClear();
    state.importLibrary.mockClear();
});

describe('loadGoogleMaps — shared singleton', () => {
    it('returns the SAME promise for concurrent calls and loads only once', () => {
        const first = loadGoogleMaps(OPTS);
        const second = loadGoogleMaps(OPTS);
        const third = loadGoogleMaps(OPTS);

        expect(first).toBe(second);
        expect(second).toBe(third);
        expect(state.ctorCalls).toBe(1);
        expect(state.load).toHaveBeenCalledTimes(1);
    });

    it('ignores library order when comparing options', () => {
        const a = loadGoogleMaps({ apiKey: 'KEY_A', libraries: ['drawing', 'marker'] as const });
        const b = loadGoogleMaps({ apiKey: 'KEY_A', libraries: ['marker', 'drawing'] as const });
        expect(a).toBe(b);
        expect(state.ctorCalls).toBe(1);
    });

    it('rejects when apiKey is missing', async () => {
        await expect(loadGoogleMaps({ apiKey: '' })).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });

    it('throws INCOMPATIBLE_OPTIONS when re-called with a conflicting apiKey', () => {
        loadGoogleMaps({ apiKey: 'KEY_A' });
        expect(() => loadGoogleMaps({ apiKey: 'KEY_B' })).toThrowError(GoogleMapsError);
        try {
            loadGoogleMaps({ apiKey: 'KEY_B' });
        } catch (err) {
            expect((err as GoogleMapsError).code).toBe('INCOMPATIBLE_OPTIONS');
        }
    });

    it('resets the cache after a load failure so a retry can happen', async () => {
        state.load.mockRejectedValueOnce(new Error('network'));
        await expect(loadGoogleMaps(OPTS)).rejects.toMatchObject({ code: 'LOAD_FAILED' });

        state.load.mockResolvedValueOnce({ maps: {} } as unknown as typeof google);
        await expect(loadGoogleMaps(OPTS)).resolves.toBeDefined();
        expect(state.ctorCalls).toBe(2);
    });

    it('rejects with NO_WINDOW when there is no window (SSR)', async () => {
        vi.stubGlobal('window', undefined);
        await expect(loadGoogleMaps(OPTS)).rejects.toMatchObject({ code: 'NO_WINDOW' });
        vi.unstubAllGlobals();
    });
});

describe('importMapsLibrary', () => {
    it('delegates to the shared loader instance', async () => {
        loadGoogleMaps(OPTS);
        await importMapsLibrary('marker');
        expect(state.importLibrary).toHaveBeenCalledWith('marker');
    });

    it('rejects with NO_WINDOW during SSR', async () => {
        vi.stubGlobal('window', undefined);
        await expect(importMapsLibrary('marker')).rejects.toMatchObject({ code: 'NO_WINDOW' });
        vi.unstubAllGlobals();
    });
});

describe('isGoogleMapsLoaded', () => {
    afterEach(() => {
        delete (window as { google?: unknown }).google;
    });

    it('is false when google.maps is absent', () => {
        expect(isGoogleMapsLoaded()).toBe(false);
    });

    it('is true when google.maps is present', () => {
        (window as { google?: unknown }).google = { maps: {} };
        expect(isGoogleMapsLoaded()).toBe(true);
    });
});
