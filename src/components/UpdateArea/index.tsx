import React, { FC, useEffect, useState, FunctionComponent, useCallback } from 'react';
import { Status, Wrapper } from '@googlemaps/react-wrapper';
import { Libraries } from '@googlemaps/js-api-loader';

interface ICoordinates {
    lat: number;
    lng: number;
}

interface IMap {
    apiKey: string;
    radius?: string;
    initialZoom?: number;
    existingPolygon: ICoordinates[];
    size: { width: string; height: string };
    typeMaps?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
    initialCoordinates: { lat: number; lng: number };

    onGetMap: (value: ICoordinates[] | null) => void;
}

const DeleteIcon = () => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M9 3V4H4V6H5V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z"
            fill="#666666"
        />
    </svg>
);

const Map: React.FC<IMap> = ({
    size,
    radius,
    apiKey,
    typeMaps,
    initialZoom,
    existingPolygon,
    initialCoordinates,

    onGetMap
}) => {
    const [haveDrawingTool, setHaveDrawingTool] = useState<boolean>(true);
    const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);
    const [initialPolygon, setInitialPolygon] = useState<google.maps.Polygon | null>(null);
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);

    const clearPolygon = () => {
        if (initialPolygon && drawingManager) {
            initialPolygon.setMap(null);
            drawingManager.setMap(null);
            setInitialPolygon(null);
            onGetMap(null);
        } else if (polygon && drawingManager) {
            polygon.setMap(null);
            drawingManager.setMap(null);
            setPolygon(null);
            onGetMap(null);
        }
        const newDrawingManager = new google.maps.drawing.DrawingManager({
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.POLYGON]
            },
            polygonOptions: {
                editable: true
            }
        });
        setHaveDrawingTool(false);
        newDrawingManager.setMap(map);
        setDrawingManager(newDrawingManager);
    };

    const handlePolygonUpdate = useCallback(
        (polygonChanges: google.maps.Polygon) => {
            setPolygon(polygonChanges);
            onGetMap(
                polygonChanges
                    .getPath()
                    .getArray()
                    .map((val) => ({ lat: val.lat(), lng: val.lng() }))
            );
        },
        [onGetMap]
    );

    useEffect(() => {
        if (drawingManager && !initialPolygon) {
            google.maps.event.addListener(drawingManager, 'polygoncomplete', (createdPolygon: google.maps.Polygon) => {
                // handlePolygonUpdate(createdPolygon);
                setHaveDrawingTool(true);
                setPolygon(createdPolygon);
                drawingManager.setOptions({
                    drawingMode: null,
                    drawingControl: false,
                    drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: []
                    }
                });
                createdPolygon.setEditable(true);
                onGetMap(
                    createdPolygon
                        .getPath()
                        .getArray()
                        .map((val) => ({ lat: val.lat(), lng: val.lng() }))
                );
                google.maps.event.addListener(createdPolygon.getPath(), 'set_at', () => {
                    handlePolygonUpdate(createdPolygon);
                });
                google.maps.event.addListener(createdPolygon.getPath(), 'insert_at', () => {
                    handlePolygonUpdate(createdPolygon);
                });
            });
        }
    }, [drawingManager, handlePolygonUpdate, initialPolygon, onGetMap]);

    useEffect(() => {
        if (map && !drawingManager) {
            setDrawingManager(
                new google.maps.drawing.DrawingManager({
                    map,
                    drawingControl: true,
                    drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: []
                    },
                    polygonOptions: {
                        editable: true,
                        paths: [existingPolygon]
                    }
                })
            );

            const _poligon = new google.maps.Polygon({
                map,
                editable: true,
                paths: existingPolygon
            });

            if (_poligon && !initialPolygon) {
                google.maps.event.addListener(_poligon.getPath(), 'set_at', () => {
                    handlePolygonUpdate(_poligon);
                });

                google.maps.event.addListener(_poligon.getPath(), 'insert_at', () => {
                    handlePolygonUpdate(_poligon);
                });
                setInitialPolygon(_poligon);
            }
        }
    }, [drawingManager, existingPolygon, handlePolygonUpdate, initialPolygon, map]);

    useEffect(() => {
        if (!map) {
            const _map = new google.maps.Map(document.getElementById('map-area-update')!, {
                tilt: 0,
                zoom: initialZoom || 13,
                mapTypeId: typeMaps || 'satellite',
                streetViewControl: false,
                center: initialCoordinates || { lat: 37.775, lng: -122.434 }
            });
            setMap(_map);
        }
    }, [apiKey, existingPolygon, initialCoordinates, initialZoom, map, typeMaps]);

    return (
        <div
            style={{
                width: size.width,
                height: size.height,
                borderRadius: radius || '8px'
            }}
        >
            <div
                id="map-area-update"
                key={'map-area-update'}
                style={{
                    width: size.width,
                    height: size.height,
                    borderRadius: radius || '8px'
                }}
            ></div>
            {haveDrawingTool ? (
                <div
                    style={{
                        top: 10,
                        width: '40px',
                        right: '60px',
                        height: '40px',
                        borderRadius: 2,
                        display: 'flex',
                        cursor: 'pointer',
                        alignItems: 'center',
                        position: 'absolute',
                        justifyContent: 'center',
                        backgroundColor: '#fff',
                        borderLeft: '1px solid #f1f1f1'
                    }}
                    onClick={() => clearPolygon()}
                    title="Deletar area"
                >
                    <DeleteIcon />
                </div>
            ) : (
                <></>
            )}
        </div>
    );
};

interface IUpdateArea extends IMap {
    libraries?: Libraries;
    failed?: FunctionComponent;
    loading?: FunctionComponent;
}

export const UpdateArea: FC<IUpdateArea> = ({
    size,
    radius,
    apiKey,
    typeMaps,
    libraries,
    initialZoom,
    existingPolygon,
    initialCoordinates,
    failed: FailedComponent,
    loading: LoadingComponent,

    onGetMap
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
                        onGetMap={onGetMap}
                        typeMaps={typeMaps}
                        initialZoom={initialZoom}
                        existingPolygon={existingPolygon}
                        initialCoordinates={initialCoordinates}
                    />
                );
        }
    };

    return <Wrapper apiKey={apiKey} render={renderMap} libraries={[...(libraries ? libraries : []), 'drawing']} key={'wrapper-create'}></Wrapper>;
};
