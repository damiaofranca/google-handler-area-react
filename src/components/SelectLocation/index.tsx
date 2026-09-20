import React, { FC, FunctionComponent, useEffect, useRef } from 'react';
import { Status, Wrapper } from '@googlemaps/react-wrapper';
import { Libraries } from '@googlemaps/js-api-loader';

import { useResolvedGoogleMapsConfig } from '../../core/context';
import { setDebug, debugLog } from '../../core/debug';
import { importMapsLibrary } from '../../core/loader';
import { createManagedMarker, type ManagedMarker } from '../../core/markers';
import type { ICoordinates, MapSize, MapTypeId } from '../../core/types';

interface IMap {
    radius?: string;
    mapId?: string;
    iconPath?: string;
    initialZoom?: number;
    size: MapSize;
    initialCoordinates: ICoordinates;
    typeMaps?: MapTypeId;
    /** Show a Places search box that recenters the map/marker on the chosen address. */
    showSearch?: boolean;
    /** Placeholder text for the search box (legacy fallback only). */
    searchPlaceholder?: string;
    onSetLocation: (coordinates: ICoordinates) => void;
}

const searchBoxStyle: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 5,
    width: 'min(340px, calc(100% - 20px))'
};

/** Reads a `{ lat, lng }` from either a LatLng instance or a literal. */
const readLatLng = (loc: { lat: number | (() => number); lng: number | (() => number) }): ICoordinates => ({
    lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
    lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng
});

const Map: React.FC<IMap> = ({ size, radius, mapId, typeMaps, iconPath, initialZoom, initialCoordinates, showSearch, searchPlaceholder, onSetLocation }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchElementRef = useRef<HTMLElement | null>(null);

    const onSetLocationRef = useRef(onSetLocation);
    onSetLocationRef.current = onSetLocation;

    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<ManagedMarker | null>(null);
    const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

    useEffect(() => {
        let cancelled = false;
        const listeners = listenersRef.current;

        const setup = async () => {
            const [markerLibrary] = await Promise.all([
                mapId ? importMapsLibrary<google.maps.MarkerLibrary>('marker') : Promise.resolve(null),
                showSearch ? importMapsLibrary('places') : Promise.resolve(null)
            ]);
            if (cancelled || !containerRef.current) return;

            const map = new google.maps.Map(containerRef.current, {
                tilt: 0,
                draggableCursor: 'pointer',
                center: initialCoordinates,
                zoom: initialZoom ?? 13,
                mapTypeId: typeMaps ?? 'satellite',
                ...(mapId ? { mapId } : {})
            });
            mapRef.current = map;

            const marker = createManagedMarker({ map, iconPath, markerLibrary });
            markerRef.current = marker;

            listeners.push(
                map.addListener('click', (event: google.maps.MapMouseEvent) => {
                    if (!event.latLng) return;
                    const position = { lat: event.latLng.lat(), lng: event.latLng.lng() };
                    onSetLocationRef.current(position);
                    marker.setPosition(position);
                })
            );

            if (showSearch && searchContainerRef.current) {
                setupSearch(map, marker);
            }
        };

        // Wires the Places search box. Prefers the modern PlaceAutocompleteElement
        // (Places API New) and falls back to the legacy Autocomplete when needed.
        const setupSearch = (map: google.maps.Map, marker: ManagedMarker) => {
            const container = searchContainerRef.current!;
            const placesNs = google.maps.places as unknown as {
                PlaceAutocompleteElement?: new (options?: unknown) => HTMLElement;
                Autocomplete?: typeof google.maps.places.Autocomplete;
            };

            const applyPlace = (position: ICoordinates, viewport?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral) => {
                if (cancelled) return;
                if (viewport) map.fitBounds(viewport);
                else {
                    map.setCenter(position);
                    map.setZoom(Math.max(map.getZoom() ?? 13, 16));
                }
                marker.setPosition(position);
                onSetLocationRef.current(position);
            };

            if (placesNs.PlaceAutocompleteElement) {
                const el = new placesNs.PlaceAutocompleteElement({});
                el.style.width = '100%';
                container.appendChild(el);
                searchElementRef.current = el;

                // The select event's shape varies across Maps versions, so read
                // defensively: `event.place` (older) or `event.placePrediction`.
                const handleSelect = async (event: Event) => {
                    try {
                        const e = event as unknown as { place?: PlaceLike; placePrediction?: { toPlace?: () => PlaceLike } };
                        let place: PlaceLike | null = e.place ?? null;
                        if (!place && e.placePrediction?.toPlace) place = e.placePrediction.toPlace();
                        if (!place) return;
                        if (typeof place.fetchFields === 'function') {
                            await place.fetchFields({ fields: ['location', 'viewport', 'displayName', 'formattedAddress'] });
                        }
                        if (!place.location) return;
                        applyPlace(readLatLng(place.location), place.viewport ?? undefined);
                    } catch (err) {
                        debugLog('SelectLocation', 'place select failed', err);
                    }
                };
                el.addEventListener('gmp-select', handleSelect as EventListener);
                el.addEventListener('gmp-placeselect', handleSelect as EventListener);
                return;
            }

            if (placesNs.Autocomplete) {
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = searchPlaceholder ?? 'Search a place…';
                Object.assign(input.style, {
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #dadce0',
                    color: '#202124',
                    backgroundColor: '#fff'
                });
                container.appendChild(input);
                searchElementRef.current = input;

                const autocomplete = new placesNs.Autocomplete(input, { fields: ['geometry', 'name', 'formatted_address'] });
                autocomplete.bindTo('bounds', map);
                listeners.push(
                    autocomplete.addListener('place_changed', () => {
                        const place = autocomplete.getPlace();
                        const location = place.geometry?.location;
                        if (!location) return;
                        applyPlace({ lat: location.lat(), lng: location.lng() }, place.geometry?.viewport ?? undefined);
                    })
                );
            }
        };

        void setup();

        return () => {
            cancelled = true;
            listeners.forEach((listener) => listener.remove());
            listenersRef.current = [];
            markerRef.current?.remove();
            markerRef.current = null;
            if (searchElementRef.current) {
                searchElementRef.current.remove();
                searchElementRef.current = null;
            }
            if (mapRef.current) {
                google.maps.event.clearInstanceListeners(mapRef.current);
                mapRef.current = null;
            }
            // Remove the legacy Places dropdown Google appends to <body>.
            document.querySelectorAll('.pac-container').forEach((el) => el.remove());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ width: size.width, height: size.height, position: 'relative' }}>
            {showSearch && <div ref={searchContainerRef} style={searchBoxStyle} />}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: radius ?? '8px'
                }}
            />
        </div>
    );
};

/** Minimal structural type for a Places `Place`, tolerant of version differences. */
interface PlaceLike {
    fetchFields?: (options: { fields: string[] }) => Promise<unknown>;
    location?: { lat: number | (() => number); lng: number | (() => number) } | null;
    viewport?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral | null;
}

/**
 * Props for {@link SelectLocation}.
 *
 * @public
 */
export interface ISelectLocation extends Pick<IMap, 'typeMaps' | 'initialZoom' | 'onSetLocation' | 'iconPath' | 'size' | 'mapId' | 'showSearch' | 'searchPlaceholder'> {
    apiKey?: string;
    /** Enable library debug logging for this component. */
    debug?: boolean;
    /** Pin a specific Google Maps API version (e.g. `"quarterly"`). Defaults to the weekly channel. */
    version?: string;
    borderRadius?: string;
    libraries?: Libraries;
    initialCoordinates: ICoordinates;
    /** Rendered while the Google Maps API is loading. Defaults to `"loading..."`. */
    loading?: FunctionComponent;
    /** Rendered if the Google Maps API fails to load. Defaults to `"failed"`. */
    failed?: FunctionComponent;
}

/**
 * Renders a Google Map on which the user picks a single location by clicking. A
 * marker follows each click and the chosen `{ lat, lng }` is reported through
 * {@link ISelectLocation.onSetLocation}. Set `showSearch` to add a Places
 * autocomplete box (modern `PlaceAutocompleteElement`, with a legacy fallback)
 * that recenters the map and marker on the chosen address.
 *
 * When `mapId` is provided the modern `AdvancedMarkerElement` is used; otherwise
 * it falls back to the legacy marker. The map, marker, search box and listeners
 * are cleaned up on unmount.
 *
 * @remarks Requires a browser environment; it does not run during SSR.
 * `showSearch` requires the Places API (New) to be enabled on the key.
 *
 * @example
 * ```tsx
 * <SelectLocation
 *   apiKey={process.env.MAPS_KEY!}
 *   showSearch
 *   size={{ width: '100%', height: '400px' }}
 *   initialCoordinates={{ lat: -23.55, lng: -46.63 }}
 *   onSetLocation={(coords) => console.log(coords)}
 * />
 * ```
 *
 * @public
 */
export const SelectLocation: FC<ISelectLocation> = ({
    size,
    apiKey,
    debug,
    version,
    mapId,
    iconPath,
    typeMaps,
    libraries,
    initialZoom,
    borderRadius,
    showSearch,
    searchPlaceholder,
    initialCoordinates,
    failed: FailedComponent,
    loading: LoadingComponent,
    onSetLocation
}) => {
    const resolved = useResolvedGoogleMapsConfig({ apiKey, version, mapId, libraries, debug });
    useEffect(() => {
        if (resolved.debug) setDebug(true);
    }, [resolved.debug]);

    if (!resolved.apiKey) {
        return FailedComponent ? <FailedComponent /> : <>failed</>;
    }

    const renderMap = (status: Status) => {
        switch (status) {
            case Status.LOADING:
                return LoadingComponent ? <LoadingComponent /> : <>loading...</>;
            case Status.FAILURE:
                return FailedComponent ? <FailedComponent /> : <>failed</>;
            case Status.SUCCESS:
                return (
                    <Map
                        size={size}
                        mapId={resolved.mapId}
                        iconPath={iconPath}
                        typeMaps={typeMaps}
                        radius={borderRadius}
                        showSearch={showSearch}
                        searchPlaceholder={searchPlaceholder}
                        initialZoom={initialZoom}
                        onSetLocation={onSetLocation}
                        initialCoordinates={initialCoordinates}
                    />
                );
        }
    };

    return (
        <Wrapper
            apiKey={resolved.apiKey!}
            render={renderMap}
            libraries={Array.from(new Set([...resolved.libraries, ...(resolved.mapId ? ['marker' as const] : []), ...(showSearch ? ['places' as const] : [])]))}
            {...(resolved.version ? { version: resolved.version } : {})}
            {...(resolved.language ? { language: resolved.language } : {})}
            {...(resolved.region ? { region: resolved.region } : {})}
        />
    );
};
