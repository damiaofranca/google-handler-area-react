import React, { FC, FunctionComponent, useEffect, useRef, useState } from 'react';
import { Status, Wrapper } from '@googlemaps/react-wrapper';
import { Libraries } from '@googlemaps/js-api-loader';

import { useResolvedGoogleMapsConfig } from '../../core/context';
import { setDebug } from '../../core/debug';

import { importMapsLibrary } from '../../core/loader';
import { createManagedMarker, type ManagedMarker } from '../../core/markers';
import { injectAttributes, type IContentInfoWindow } from '../../utils/injectAttributes';
import type { ICoordinates, MapSize, MapTypeId } from '../../core/types';
import type { MarkerClusterer } from '@googlemaps/markerclusterer';

interface IMap {
    radius?: string;
    mapId?: string;
    iconPath?: string;
    initialZoom?: number;
    /**
     * HTML template for each marker's info window. Use `$>key<$` placeholders,
     * which are replaced with the matching value from each `infos` entry.
     * Injected values are HTML-escaped unless {@link IMap.allowHtml} is `true`.
     */
    infoWindowHtml: string;
    /** Allow raw (unescaped) HTML in injected values. Only for trusted data. */
    allowHtml?: boolean;
    ariaLabelCustom?: string;
    infos: IContentInfoWindow[];
    /** Group markers into clusters (loads `@googlemaps/markerclusterer` on demand). */
    cluster?: boolean;
    size: MapSize;
    initialCoordinates: ICoordinates;
    typeMaps?: MapTypeId;
}

interface MarkerEntry {
    marker: ManagedMarker;
    listener: google.maps.MapsEventListener;
    infoWindow: google.maps.InfoWindow;
}

const Map: React.FC<IMap> = ({ size, infos, radius, mapId, typeMaps, iconPath, allowHtml, cluster, initialZoom, infoWindowHtml, ariaLabelCustom, initialCoordinates }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);

    const mapRef = useRef<google.maps.Map | null>(null);
    const markerLibraryRef = useRef<google.maps.MarkerLibrary | null>(null);
    const entriesRef = useRef<MarkerEntry[]>([]);
    const clustererRef = useRef<MarkerClusterer | null>(null);

    // Create the map once.
    useEffect(() => {
        let cancelled = false;

        const setup = async () => {
            markerLibraryRef.current = mapId ? await importMapsLibrary<google.maps.MarkerLibrary>('marker') : null;
            if (cancelled || !containerRef.current) return;

            mapRef.current = new google.maps.Map(containerRef.current, {
                tilt: 0,
                center: initialCoordinates,
                zoom: initialZoom ?? 13,
                mapTypeId: typeMaps ?? 'satellite',
                streetViewControl: false,
                ...(mapId ? { mapId } : {})
            });
            setReady(true);
        };

        void setup();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                google.maps.event.clearInstanceListeners(mapRef.current);
                mapRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearEntries = () => {
        if (clustererRef.current) {
            clustererRef.current.clearMarkers();
            clustererRef.current.setMap(null);
            clustererRef.current = null;
        }
        entriesRef.current.forEach(({ marker, listener, infoWindow }) => {
            listener.remove();
            infoWindow.close();
            marker.remove();
        });
        entriesRef.current = [];
    };

    // (Re)build markers whenever the data or map changes; always clear the old
    // markers first so nothing is orphaned. When `cluster` is set, the markers
    // are handed to a MarkerClusterer (loaded on demand) instead of the map.
    useEffect(() => {
        if (!ready || !mapRef.current) return;
        const map = mapRef.current;
        let cancelled = false;

        clearEntries();

        const build = async () => {
            const entries: MarkerEntry[] = infos.map((info) => {
                const infoWindow = new google.maps.InfoWindow({
                    content: injectAttributes(info, infoWindowHtml, { allowHtml }),
                    ariaLabel: ariaLabelCustom ?? 'Open Sans'
                });
                const marker = createManagedMarker({
                    map,
                    position: { lat: info.lat, lng: info.lng },
                    iconPath,
                    markerLibrary: markerLibraryRef.current,
                    addToMap: !cluster
                });
                const listener = marker.addClickListener(() => infoWindow.open({ map, anchor: marker.anchor }));
                return { marker, listener, infoWindow };
            });
            entriesRef.current = entries;

            if (cluster && entries.length) {
                const { MarkerClusterer } = await import('@googlemaps/markerclusterer');
                if (cancelled) {
                    clearEntries();
                    return;
                }
                clustererRef.current = new MarkerClusterer({
                    map,
                    markers: entries.map((entry) => entry.marker.anchor as google.maps.Marker)
                });
            }
        };

        void build();

        return () => {
            cancelled = true;
            clearEntries();
        };
    }, [ready, infos, iconPath, infoWindowHtml, ariaLabelCustom, allowHtml, cluster]);

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
 * Props for {@link InfosInMap}.
 *
 * @public
 */
export interface IInfosInMap extends IMap {
    apiKey?: string;
    /** Enable library debug logging for this component. */
    debug?: boolean;
    /** Pin a specific Google Maps API version (e.g. `"3.58"` or `"quarterly"`). Defaults to the weekly channel. */
    version?: string;
    libraries?: Libraries;
    /** Rendered while the Google Maps API is loading. Defaults to `"loading..."`. */
    loading?: FunctionComponent;
    /** Rendered if the Google Maps API fails to load. Defaults to `"failed"`. */
    failed?: FunctionComponent;
}

/**
 * Renders a Google Map with one marker per entry in `infos`. Clicking a marker
 * opens an info window whose HTML is produced by filling `infoWindowHtml`'s
 * `$>key<$` placeholders with that entry's values (HTML-escaped by default;
 * pass `allowHtml` to opt out).
 *
 * Markers are fully rebuilt whenever `infos` changes and every previous marker,
 * listener and info window is removed first — no orphaned markers accumulate.
 * When `mapId` is provided, `AdvancedMarkerElement` is used instead of the
 * legacy marker.
 *
 * @remarks Requires a browser environment; it does not run during SSR.
 *
 * @example
 * ```tsx
 * <InfosInMap
 *   apiKey={process.env.MAPS_KEY!}
 *   size={{ width: '100%', height: '400px' }}
 *   initialCoordinates={{ lat: -23.55, lng: -46.63 }}
 *   infos={[{ lat: -23.55, lng: -46.63, name: 'HQ' }]}
 *   infoWindowHtml={'<p>$>name<$</p>'}
 * />
 * ```
 *
 * @public
 */
export const InfosInMap: FC<IInfosInMap> = ({
    size,
    infos,
    radius,
    apiKey,
    debug,
    version,
    mapId,
    iconPath,
    typeMaps,
    libraries,
    allowHtml,
    cluster,
    initialZoom,
    infoWindowHtml,
    ariaLabelCustom,
    initialCoordinates,
    failed: FailedComponent,
    loading: LoadingComponent
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
                        infos={infos}
                        radius={radius}
                        mapId={resolved.mapId}
                        iconPath={iconPath}
                        typeMaps={typeMaps}
                        allowHtml={allowHtml}
                        cluster={cluster}
                        initialZoom={initialZoom}
                        infoWindowHtml={infoWindowHtml}
                        ariaLabelCustom={ariaLabelCustom}
                        initialCoordinates={initialCoordinates}
                    />
                );
        }
    };

    return <Wrapper apiKey={resolved.apiKey!} render={renderMap} libraries={Array.from(new Set([...resolved.libraries, ...(resolved.mapId ? ['marker' as const] : [])]))} {...(resolved.version ? { version: resolved.version } : {})}{...(resolved.language ? { language: resolved.language } : {})}{...(resolved.region ? { region: resolved.region } : {})} />;
};
