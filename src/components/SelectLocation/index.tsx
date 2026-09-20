import React, { FC, FunctionComponent, useEffect, useRef } from 'react';
import { Status, Wrapper } from '@googlemaps/react-wrapper';
import { Libraries } from '@googlemaps/js-api-loader';

import { useResolvedGoogleMapsConfig } from '../../core/context';
import { setDebug } from '../../core/debug';

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
    onSetLocation: (coordinates: ICoordinates) => void;
}

const Map: React.FC<IMap> = ({ size, radius, mapId, typeMaps, iconPath, initialZoom, initialCoordinates, onSetLocation }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const onSetLocationRef = useRef(onSetLocation);
    onSetLocationRef.current = onSetLocation;

    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<ManagedMarker | null>(null);
    const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

    useEffect(() => {
        let cancelled = false;
        const listeners = listenersRef.current;

        const setup = async () => {
            const markerLibrary = mapId ? await importMapsLibrary<google.maps.MarkerLibrary>('marker') : null;
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
        };

        void setup();

        return () => {
            cancelled = true;
            listeners.forEach((listener) => listener.remove());
            listenersRef.current = [];
            markerRef.current?.remove();
            markerRef.current = null;
            if (mapRef.current) {
                google.maps.event.clearInstanceListeners(mapRef.current);
                mapRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ width: size.width, height: size.height }}>
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

/**
 * Props for {@link SelectLocation}.
 *
 * @public
 */
export interface ISelectLocation extends Pick<IMap, 'typeMaps' | 'initialZoom' | 'onSetLocation' | 'iconPath' | 'size' | 'mapId'> {
    apiKey?: string;
    /** Enable library debug logging for this component. */
    debug?: boolean;
    /** Pin a specific Google Maps API version (e.g. `"3.58"` or `"quarterly"`). Defaults to the weekly channel. */
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
 * Renders a Google Map on which the user picks a single location by clicking.
 * A marker follows each click and the chosen `{ lat, lng }` is reported through
 * {@link ISelectLocation.onSetLocation}.
 *
 * When `mapId` is provided the modern `AdvancedMarkerElement` is used;
 * otherwise it falls back to the legacy marker. The map, marker and click
 * listener are cleaned up on unmount.
 *
 * @remarks Requires a browser environment; it does not run during SSR.
 *
 * @example
 * ```tsx
 * <SelectLocation
 *   apiKey={process.env.MAPS_KEY!}
 *   size={{ width: '100%', height: '400px' }}
 *   initialCoordinates={{ lat: -23.55, lng: -46.63 }}
 *   onSetLocation={(coords) => console.log(coords)}
 * />
 * ```
 *
 * @public
 */
export const SelectLocation: FC<ISelectLocation> = ({ size, apiKey, debug, version, mapId, iconPath, typeMaps, libraries, initialZoom, borderRadius, initialCoordinates, failed: FailedComponent, loading: LoadingComponent, onSetLocation }) => {
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
                return <Map size={size} mapId={resolved.mapId} iconPath={iconPath} typeMaps={typeMaps} radius={borderRadius} initialZoom={initialZoom} onSetLocation={onSetLocation} initialCoordinates={initialCoordinates} />;
        }
    };

    return <Wrapper apiKey={resolved.apiKey!} render={renderMap} libraries={[...resolved.libraries, ...(resolved.mapId ? ['marker' as const] : [])]} {...(resolved.version ? { version: resolved.version } : {})}{...(resolved.language ? { language: resolved.language } : {})}{...(resolved.region ? { region: resolved.region } : {})} />;
};
