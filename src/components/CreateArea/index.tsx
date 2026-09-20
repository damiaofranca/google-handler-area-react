import React, { FC, FunctionComponent, useEffect, useRef, useState } from 'react';
import { Status, Wrapper } from '@googlemaps/react-wrapper';
import { Libraries } from '@googlemaps/js-api-loader';

import { createPolygonEditor, type PolygonEditor } from '../../core/polygonEditor';
import type { ICoordinates, MapSize, MapTypeId } from '../../core/types';
import { DeleteIcon } from '../shared/DeleteIcon';
import { deleteControlStyle } from '../shared/deleteControlStyle';

const DEFAULT_CENTER: ICoordinates = { lat: 37.775, lng: -122.434 };

interface IMap {
    apiKey: string;
    /** Pin a specific Google Maps API version (e.g. `"quarterly"`). Defaults to the weekly channel. */
    version?: string;
    radius?: string;
    mapId?: string;
    initialZoom?: number;
    libraries: Libraries;
    size: MapSize;
    onGetMap: (value: ICoordinates[] | null) => void;
    initialCoordinates: ICoordinates;
    typeMaps?: MapTypeId;
    /** Styling for the drawn polygon (fill/stroke, etc.). */
    polygonOptions?: google.maps.PolygonOptions;
}

const Map: React.FC<IMap> = ({ size, radius, mapId, typeMaps, initialZoom, initialCoordinates, polygonOptions, onGetMap }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasPolygon, setHasPolygon] = useState(false);

    // Keep the latest values without re-running the map-setup effect.
    const onGetMapRef = useRef(onGetMap);
    onGetMapRef.current = onGetMap;
    const polygonOptionsRef = useRef(polygonOptions);
    polygonOptionsRef.current = polygonOptions;

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
            polygonOptions: polygonOptionsRef.current,
            onChange: (path) => {
                onGetMapRef.current(path);
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
        // Map is created once; live values are read through refs.
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
 * Props for {@link CreateArea}.
 *
 * @public
 */
export interface ICreateArea extends IMap {
    /** Rendered while the Google Maps API is loading. Defaults to `"loading..."`. */
    loading?: FunctionComponent;
    /** Rendered if the Google Maps API fails to load. Defaults to `"failed"`. */
    failed?: FunctionComponent;
}

/**
 * Renders a Google Map on which the user draws a single editable polygon (an
 * "area") by clicking to place vertices. The polygon is always editable, so
 * vertices can be dragged, inserted or removed afterwards. Every change is
 * reported through {@link ICreateArea.onGetMap} as an array of `{ lat, lng }`,
 * or `null` when the area is cleared.
 *
 * @remarks
 * As of Maps JS API v3.65 Google removed the `drawing` library
 * (`DrawingManager`). This component therefore uses a click-to-draw editable
 * polygon instead of the old drawing toolbar. Requires a browser environment;
 * it does not run during SSR.
 *
 * @example
 * ```tsx
 * <CreateArea
 *   apiKey={process.env.MAPS_KEY!}
 *   libraries={[]}
 *   size={{ width: '100%', height: '480px' }}
 *   initialCoordinates={{ lat: -23.55, lng: -46.63 }}
 *   onGetMap={(coords) => console.log(coords)}
 * />
 * ```
 *
 * @public
 */
export const CreateArea: FC<ICreateArea> = ({
    size,
    radius,
    apiKey,
    version,
    mapId,
    typeMaps,
    onGetMap,
    libraries,
    initialZoom,
    initialCoordinates,
    polygonOptions,
    failed: FailedComponent,
    loading: LoadingComponent
}) => {
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
                        mapId={mapId}
                        onGetMap={onGetMap}
                        typeMaps={typeMaps}
                        libraries={libraries}
                        initialZoom={initialZoom}
                        initialCoordinates={initialCoordinates}
                        polygonOptions={polygonOptions}
                    />
                );
        }
    };

    return <Wrapper apiKey={apiKey} render={renderMap} libraries={[...(libraries ?? [])]} {...(version ? { version } : {})} />;
};
