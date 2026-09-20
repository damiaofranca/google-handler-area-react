/**
 * Lightweight, zero-overhead-when-off debug logging for the library.
 *
 * Debug output is emitted to `console` only while enabled. When disabled (the
 * default), {@link debugLog} returns immediately after a single boolean check,
 * so it is safe to leave calls in hot paths.
 *
 * @packageDocumentation
 */

let enabled = false;

/**
 * Enables or disables library debug logging globally.
 *
 * You can also enable it per component via the `debug` prop, or app-wide via
 * `GoogleMapsProvider`'s `debug` config.
 *
 * @param value - `true` to enable, `false` to disable.
 *
 * @example
 * ```ts
 * import { setDebug } from 'google-handler-area-react';
 * setDebug(process.env.NODE_ENV !== 'production');
 * ```
 *
 * @public
 */
export const setDebug = (value: boolean): void => {
    enabled = value;
};

/**
 * Returns whether debug logging is currently enabled globally.
 *
 * @public
 */
export const isDebugEnabled = (): boolean => enabled;

/**
 * Logs a namespaced debug message when debug is enabled globally OR when
 * `local` is `true` (e.g. a component's `debug` prop). No-op otherwise.
 *
 * @param scope - Short namespace, e.g. `'loader'` or `'CreateArea'`.
 * @param message - Human-readable message.
 * @param data - Optional structured payload.
 * @param local - Force-enable for this call regardless of the global flag.
 *
 * @internal
 */
export const debugLog = (scope: string, message: string, data?: unknown, local = false): void => {
    if (!enabled && !local) return;
    const prefix = `[gh-area:${scope}]`;
    if (data !== undefined) {
        // eslint-disable-next-line no-console
        console.debug(prefix, message, data);
    } else {
        // eslint-disable-next-line no-console
        console.debug(prefix, message);
    }
};
