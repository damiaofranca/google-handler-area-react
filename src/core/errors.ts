/**
 * Machine-readable identifiers for every error the library can raise.
 *
 * Consumers can branch on {@link GoogleMapsError.code} instead of parsing
 * human-readable messages, which keeps error handling stable across releases.
 *
 * @public
 */
export type GoogleMapsErrorCode =
    /** The Google Maps API was requested in an environment without `window` (e.g. SSR). */
    | 'NO_WINDOW'
    /** No API key was provided to a component or to `loadGoogleMaps`. */
    | 'MISSING_API_KEY'
    /**
     * `loadGoogleMaps` was called again with options incompatible with the
     * options used by the first (already in-flight or resolved) call.
     */
    | 'INCOMPATIBLE_OPTIONS'
    /** The Google Maps JavaScript API script failed to load or execute. */
    | 'LOAD_FAILED'
    /** A required Google Maps library (e.g. `drawing`, `marker`) could not be imported. */
    | 'LIBRARY_IMPORT_FAILED';

/**
 * Base error type for every failure surfaced by `google-handler-area-react`.
 *
 * Every thrown/rejected error produced by the library is an instance of this
 * class and carries a stable {@link GoogleMapsErrorCode} in {@link code}.
 *
 * @example
 * ```ts
 * import { loadGoogleMaps, GoogleMapsError } from 'google-handler-area-react';
 *
 * try {
 *   await loadGoogleMaps({ apiKey: '...' });
 * } catch (err) {
 *   if (err instanceof GoogleMapsError && err.code === 'LOAD_FAILED') {
 *     // handle the loading failure explicitly
 *   }
 * }
 * ```
 *
 * @public
 */
export class GoogleMapsError extends Error {
    /** Stable, machine-readable error identifier. */
    public readonly code: GoogleMapsErrorCode;

    /** The underlying error that caused this one, when available. */
    public readonly cause?: unknown;

    constructor(message: string, code: GoogleMapsErrorCode, cause?: unknown) {
        super(message);
        this.name = 'GoogleMapsError';
        this.code = code;
        this.cause = cause;
        // Restore the prototype chain for environments that down-compile classes.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
