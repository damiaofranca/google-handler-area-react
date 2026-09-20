import React, { FC, FunctionComponent, useEffect, useRef, useState } from 'react';
import { Status, Wrapper } from '@googlemaps/react-wrapper';
import { Libraries } from '@googlemaps/js-api-loader';

import { useResolvedGoogleMapsConfig } from '../../core/context';
import { setDebug } from '../../core/debug';

import { createPolygonEditor, type PolygonEditor } from '../../core/polygonEditor';
import type { ICoordinates, MapSize, MapTypeId } from '../../core/types';
import { computePolygonMetrics, type PolygonMetrics } from '../../core/geometry';
import { DeleteIcon } from '../shared/DeleteIcon';
import { deleteControlStyle } from '../shared/deleteControlStyle';

const DEFAULT_CENTER: ICoordinates = { lat: 37.775, lng: -122.434 };

interface IMap {
    apiKey?: string;
    /** Enable library debug logging for this component. */
    debug?: boolean;
    /** Pin a specific Google Maps API version (e.g. `"quarterly"`). Defaults to the weekly channel. */
    version?: string;
    radius?: string;
    mapId?: string;
    initialZoom?: number;
    existingPolygon: ICoordinates[];
    size: MapSize;
    initialCoordinates: ICoordinates;
    typeMaps?: MapTypeId;
    onGetMap: (value: ICoordinates[] | null) => void;
    /** Styling for the polygon (fill/stroke, etc.). */
    polygonOptions?: google.maps.PolygonOptions;
    /** Called with area/perimeter/centroid on every change, or `null` when cleared. */
    onMetrics?: (metrics: PolygonMetrics | null) => void;
}

const Map: React.FC<IMap> = ({ size, radius, mapId, typeMaps, initialZoom, existingPolygon, initialCoordinates, polygonOptions, onMetrics, onGetMap }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasPolygon, setHasPolygon] = useState((existingPolygon?.length ?? 0) > 0);

    const onGetMapRef = useRef(onGetMap);
    onGetMapRef.current = onGetMap;
    const polygonOptionsRef = useRef(polygonOptions);
    polygonOptionsRef.current = polygonOptions;
    const onMetricsRef = useRef(onMetrics);
    onMetricsRef.current = onMetrics;

    // The initial polygon is applied once, at mount.
    const initialPathRef = useRef(existingPolygon);

    const mapRef = useRef<google.maps.Map | null>(null);
    const editorRef = useRef<PolygonEditor | null>(null);

    const clearPolygon = () => {
        editorRef.current?.clear();
        setHasPolygon(false);
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
            tilt: 0,
            zoom: initialZoom ?? 13,
            streetViewControl: false,
            mapTypeId: typeMaps ?? 'satellite',
            center: initialCoordinates ?? DEFAULT_CENTER,
            ...(mapId ? { mapId } : {})
        });
        mapRef.current = map;

        editorRef.current = createPolygonEditor({
            map,
            initialPath: initialPathRef.current,
            polygonOptions: polygonOptionsRef.current,
            onChange: (path) => {
                onGetMapRef.current(path);
                onMetricsRef.current?.(path ? computePolygonMetrics(path) : null);
                setHasPolygon(!!path && path.length > 0);
            }
        });

        return () => {
            editorRef.current?.destroy();
            editorRef.current = null;
            if (mapRef.current) {
                google.maps.event.clearInstanceListeners(mapRef.current);
                mapRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            style={{
                width: size.width,
                height: size.height,
                position: 'relative',
                borderRadius: radius || '8px'
            }}
        >
            <div
                ref={containerRef}
                style={{
                    width: size.width,
                    height: size.height,
                    borderRadius: radius || '8px'
                }}
            />
            {hasPolygon && (
                <div style={deleteControlStyle} onClick={clearPolygon} title="Delete area" role="button" aria-label="Delete area">
                    <DeleteIcon />
                </div>
            )}
        </div>
    );
};

/**
 * Props for {@link UpdateArea}.
 *
 * @public
 */
export interface IUpdateArea extends IMap {
    libraries?: Libraries;
    /** Rendered while the Google Maps API is loading. Defaults to `"loading..."`. */
    loading?: FunctionComponent;
    /** Rendered if the Google Maps API fails to load. Defaults to `"failed"`. */
    failed?: FunctionComponent;
}

/**
 * Renders a Google Map showing an **existing** polygon (`existingPolygon`) as an
 * editable area. The user can drag its vertices, click the map to append new
 * ones, or delete it and draw a fresh one. Every change is reported through
 * {@link IUpdateArea.onGetMap} as an array of `{ lat, lng }`, or `null` when the
 * area is cleared. `existingPolygon` is applied once, on mount.
 *
 * @remarks
 * As of Maps JS API v3.65 Google removed the `drawing` library
 * (`DrawingManager`); this component uses a click-to-draw editable polygon
 * instead. Requires a browser environment; it does not run during SSR.
 *
 * @example
 * ```tsx
 * <UpdateArea
 *   apiKey={process.env.MAPS_KEY!}
 *   size={{ width: '100%', height: '480px' }}
 *   initialCoordinates={{ lat: -23.55, lng: -46.63 }}
 *   existingPolygon={[{ lat: -23.55, lng: -46.63 }, { lat: -23.56, lng: -46.62 }, { lat: -23.54, lng: -46.61 }]}
 *   onGetMap={(coords) => console.log(coords)}
 * />
 * ```
 *
 * @public
 */
export const UpdateArea: FC<IUpdateArea> = ({
    size,
    radius,
    apiKey,
    debug,
    version,
    mapId,
    typeMaps,
    libraries,
    onGetMap,
    onMetrics,
    initialZoom,
    existingPolygon,
    initialCoordinates,
    polygonOptions,
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
                        apiKey={apiKey}
                        radius={radius}
                        mapId={resolved.mapId}
                        onGetMap={onGetMap}
                        onMetrics={onMetrics}
                        typeMaps={typeMaps}
                        initialZoom={initialZoom}
                        existingPolygon={existingPolygon}
                        initialCoordinates={initialCoordinates}
                        polygonOptions={polygonOptions}
                    />
                );
        }
    };

    return <Wrapper apiKey={resolved.apiKey!} render={renderMap} libraries={Array.from(new Set([...resolved.libraries]))} {...(resolved.version ? { version: resolved.version } : {})}{...(resolved.language ? { language: resolved.language } : {})}{...(resolved.region ? { region: resolved.region } : {})} />;
};
