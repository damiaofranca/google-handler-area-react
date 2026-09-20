import React, { createContext, useContext, useMemo, type FC, type ReactNode } from 'react';
import type { Libraries } from '@googlemaps/js-api-loader';

/**
 * Shared Google Maps configuration provided to every component below a
 * {@link GoogleMapsProvider}. Any of these can still be overridden per component
 * via props.
 *
 * @public
 */
export interface GoogleMapsConfig {
    /** Google Maps API key applied to all descendant components. */
    apiKey?: string;
    /** Maps API version (e.g. `"quarterly"`). */
    version?: string;
    /** Base libraries to load (merged with each component's own). */
    libraries?: Libraries;
    /** Cloud Map ID (enables `AdvancedMarkerElement`). */
    mapId?: string;
    /** UI language, e.g. `"pt-BR"`. */
    language?: string;
    /** Region bias, e.g. `"BR"`. */
    region?: string;
    /** Enable library debug logging for all descendants. */
    debug?: boolean;
}

const GoogleMapsConfigContext = createContext<GoogleMapsConfig>({});

/**
 * Provides shared Google Maps configuration (API key, version, libraries,
 * map ID, language/region, debug) to every `CreateArea` / `UpdateArea` /
 * `SelectLocation` / `InfosInMap` rendered inside it, so you don't repeat the
 * `apiKey` on each one. Component props always take precedence over the
 * provider, and `libraries` from both are merged.
 *
 * @example
 * ```tsx
 * <GoogleMapsProvider config={{ apiKey: KEY, language: 'pt-BR' }}>
 *   <CreateArea size={...} initialCoordinates={...} libraries={[]} onGetMap={...} />
 *   <SelectLocation size={...} initialCoordinates={...} onSetLocation={...} />
 * </GoogleMapsProvider>
 * ```
 *
 * @public
 */
export const GoogleMapsProvider: FC<{ config: GoogleMapsConfig; children: ReactNode }> = ({ config, children }) => {
    const value = useMemo(() => config, [config]);
    return <GoogleMapsConfigContext.Provider value={value}>{children}</GoogleMapsConfigContext.Provider>;
};

/**
 * Returns the current {@link GoogleMapsConfig} from the nearest
 * {@link GoogleMapsProvider}, or an empty object when there is none.
 *
 * @public
 */
export const useGoogleMapsConfig = (): GoogleMapsConfig => useContext(GoogleMapsConfigContext);

/**
 * Merges per-component overrides over the provider config. Component values win;
 * `libraries` are combined and de-duplicated.
 *
 * @internal
 */
export const useResolvedGoogleMapsConfig = (overrides: GoogleMapsConfig): Required<Pick<GoogleMapsConfig, 'libraries'>> & Omit<GoogleMapsConfig, 'libraries'> => {
    const base = useGoogleMapsConfig();
    return useMemo(() => {
        const libraries = Array.from(new Set([...(base.libraries ?? []), ...(overrides.libraries ?? [])]));
        return {
            apiKey: overrides.apiKey ?? base.apiKey,
            version: overrides.version ?? base.version,
            mapId: overrides.mapId ?? base.mapId,
            language: overrides.language ?? base.language,
            region: overrides.region ?? base.region,
            debug: overrides.debug ?? base.debug,
            libraries
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base, overrides.apiKey, overrides.version, overrides.mapId, overrides.language, overrides.region, overrides.debug, JSON.stringify(overrides.libraries ?? [])]);
};
