import { Loader, type Library, type LoaderOptions } from '@googlemaps/js-api-loader';
import { GoogleMapsError } from './errors';

/**
 * Options accepted by {@link loadGoogleMaps}.
 *
 * This is the {@link LoaderOptions} type from `@googlemaps/js-api-loader`, which
 * covers `apiKey`, `version`, `language`, `region`, `libraries`, `channel`,
 * `authReferrerPolicy` and related fields.
 *
 * @public
 */
export type LoadGoogleMapsOptions = LoaderOptions;

export type { Library };

/**
 * The subset of {@link LoaderOptions} that must match between concurrent
 * `loadGoogleMaps` calls. The Google Maps script is a single global resource,
 * so these values cannot differ once loading has started.
 */
const IDENTITY_KEYS = ['apiKey', 'version', 'language', 'region', 'channel', 'id', 'url', 'authReferrerPolicy'] as const;

let loaderInstance: Loader | null = null;
let loadPromise: Promise<typeof google> | null = null;
let activeIdentity: string | null = null;

/**
 * Builds a stable, order-independent identity string for a set of loader
 * options so two calls can be compared for compatibility.
 */
const identityOf = (options: LoadGoogleMapsOptions): string => {
    const identity: Record<string, unknown> = {};
    for (const key of IDENTITY_KEYS) {
        const value = (options as unknown as Record<string, unknown>)[key];
        if (value !== undefined) identity[key] = value;
    }
    // `libraries` order is irrelevant to the loaded result.
    identity.libraries = [...(options.libraries ?? [])].sort();
    return JSON.stringify(identity);
};

/**
 * Returns `true` when the Google Maps JavaScript API is already available on
 * the current page (`window.google.maps` is present). Safe to call during SSR.
 *
 * @public
 */
export const isGoogleMapsLoaded = (): boolean => typeof window !== 'undefined' && typeof (window as typeof window & { google?: typeof google }).google?.maps !== 'undefined';

/**
 * Loads the Google Maps JavaScript API exactly once and shares the result.
 *
 * The API script is a single global resource. This function guarantees that no
 * matter how many parts of the application request it concurrently, the script
 * is fetched only once and every caller receives the **same** promise:
 *
 * ```ts
 * loadGoogleMaps(opts) === loadGoogleMaps(opts) // true
 * ```
 *
 * If a second call supplies options incompatible with the first (a different
 * `apiKey`, `version`, `language`, `region`, …) a {@link GoogleMapsError} with
 * code `INCOMPATIBLE_OPTIONS` is thrown, because the already-loaded script
 * cannot be reconfigured. Adding new `libraries` is always allowed — libraries
 * are imported on demand and do not conflict.
 *
 * On failure the internal cache is cleared so a later call can retry.
 *
 * @param options - Google Maps loader configuration. `apiKey` is required.
 * @returns A promise resolving to the global `google` namespace.
 * @throws {GoogleMapsError} `NO_WINDOW` when called without a `window` (SSR).
 * @throws {GoogleMapsError} `MISSING_API_KEY` when `apiKey` is empty.
 * @throws {GoogleMapsError} `INCOMPATIBLE_OPTIONS` when re-called with a conflicting configuration.
 *
 * @example
 * ```ts
 * const google = await loadGoogleMaps({ apiKey: 'YOUR_KEY', libraries: ['drawing'] });
 * const { Map } = await google.maps.importLibrary('maps');
 * ```
 *
 * @public
 */
export const loadGoogleMaps = (options: LoadGoogleMapsOptions): Promise<typeof google> => {
    if (typeof window === 'undefined') {
        return Promise.reject(new GoogleMapsError('Google Maps cannot be loaded in a non-browser environment (no `window`).', 'NO_WINDOW'));
    }

    if (!options?.apiKey) {
        return Promise.reject(new GoogleMapsError('A Google Maps `apiKey` is required to load the API.', 'MISSING_API_KEY'));
    }

    const identity = identityOf(options);

    if (loadPromise) {
        if (activeIdentity !== identity) {
            throw new GoogleMapsError(
                'Google Maps was already loaded with a different configuration. ' + 'The API is a single global resource and cannot be reloaded with conflicting ' + '`apiKey`/`version`/`language`/`region` options.',
                'INCOMPATIBLE_OPTIONS'
            );
        }
        return loadPromise;
    }

    loaderInstance = new Loader(options);
    activeIdentity = identity;
    loadPromise = loaderInstance
        .load()
        .then((google) => google)
        .catch((error) => {
            // Reset so consumers can retry after a transient failure.
            loadPromise = null;
            activeIdentity = null;
            loaderInstance = null;
            throw new GoogleMapsError('Failed to load the Google Maps JavaScript API.', 'LOAD_FAILED', error);
        });

    return loadPromise;
};

/**
 * Imports a single Google Maps library on demand (e.g. `'drawing'`, `'marker'`,
 * `'places'`), reusing the shared loader. Libraries are cached by the Google
 * Maps runtime, so repeated imports of the same library are effectively free.
 *
 * Requires {@link loadGoogleMaps} to have been called first (which the library's
 * components do via `@googlemaps/react-wrapper`).
 *
 * @typeParam T - The resolved library type.
 * @param name - The library to import.
 * @returns A promise resolving to the requested library.
 * @throws {GoogleMapsError} `NO_WINDOW` during SSR.
 * @throws {GoogleMapsError} `LIBRARY_IMPORT_FAILED` when the import fails.
 *
 * @example
 * ```ts
 * const { AdvancedMarkerElement } = await importMapsLibrary('marker');
 * ```
 *
 * @public
 */
export const importMapsLibrary = async <T = unknown>(name: Library): Promise<T> => {
    if (typeof window === 'undefined') {
        throw new GoogleMapsError('Google Maps libraries cannot be imported in a non-browser environment (no `window`).', 'NO_WINDOW');
    }

    try {
        if (loaderInstance) {
            return (await loaderInstance.importLibrary(name)) as T;
        }
        const g = (window as typeof window & { google?: typeof google }).google;
        if (g?.maps?.importLibrary) {
            return (await g.maps.importLibrary(name)) as T;
        }
        throw new GoogleMapsError('Google Maps is not loaded yet. Call `loadGoogleMaps` (or render a library component) before importing libraries.', 'LIBRARY_IMPORT_FAILED');
    } catch (error) {
        if (error instanceof GoogleMapsError) throw error;
        throw new GoogleMapsError(`Failed to import the Google Maps "${name}" library.`, 'LIBRARY_IMPORT_FAILED', error);
    }
};

/**
 * Clears the shared loader cache.
 *
 * This does **not** remove the already-injected Google Maps script from the
 * page; it only resets this module's memoized promise so the next
 * {@link loadGoogleMaps} call starts fresh. Intended for tests and advanced
 * teardown scenarios — most applications never need it.
 *
 * @public
 */
export const resetGoogleMapsLoader = (): void => {
    loadPromise = null;
    activeIdentity = null;
    loaderInstance = null;
};
