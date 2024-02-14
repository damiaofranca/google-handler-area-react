import React, { FC, useState, useEffect, FunctionComponent } from 'react';
import { Status, Wrapper } from '@googlemaps/react-wrapper';
import { Libraries, Loader } from '@googlemaps/js-api-loader';

interface ICoordinates {
    lat: number;
    lng: number;
}

interface IMap {
    apiKey: string;
    radius?: string;
    initialZoom?: number;
    libraries: Libraries;
    size: { width: string; height: string };
    onGetMap: (value: ICoordinates[] | null) => void;
    initialCoordinates: { lat: number; lng: number };
    typeMaps?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
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
    libraries,
    initialZoom,
    initialCoordinates,

    onGetMap
}) => {
    const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);
    const [drawingManager] = useState<google.maps.drawing.DrawingManager>(
        new google.maps.drawing.DrawingManager({
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.POLYGON]
            },
            polygonOptions: {
                editable: true
            }
        })
    );

    const loader = new Loader({
        apiKey: apiKey,
        libraries: [...libraries, 'drawing']
    });

    const clearPolygon = () => {
        if (polygon) {
            polygon.setMap(null);
            setPolygon(null);
            onGetMap(null);
        }
    };

    useEffect(() => {
        loader.importLibrary('drawing').then(() => {
            if (!polygon && drawingManager) {
                drawingManager.setOptions({
                    drawingControl: true,
                    drawingMode: window.google.maps.drawing.OverlayType.POLYGON,
                    drawingControlOptions: {
                        position: window.google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: [window.google.maps.drawing.OverlayType.POLYGON]
                    },
                    polygonOptions: {
                        editable: true
                    }
                });
            }
        });
    }, [polygon]);

    useEffect(() => {
        const handlePolygonComplete = (createdPolygon: google.maps.Polygon) => {
            handlePolygonUpdate(createdPolygon);

            drawingManager.setOptions({
                drawingControlOptions: {
                    drawingModes: [],
                    position: google.maps.ControlPosition.TOP_CENTER
                }
            });
            drawingManager.setDrawingMode(null);

            google.maps.event.addListener(createdPolygon.getPath(), 'set_at', () => {
                handlePolygonUpdate(createdPolygon);
            });
            google.maps.event.addListener(createdPolygon.getPath(), 'insert_at', () => {
                handlePolygonUpdate(createdPolygon);
            });
        };

        const handlePolygonUpdate = (polygonChanges: google.maps.Polygon): any => {
            setPolygon(polygonChanges);
            onGetMap(
                polygonChanges
                    .getPath()
                    .getArray()
                    .map((val) => {
                        return { lat: val.lat(), lng: val.lng() };
                    })
            );
        };

        const handleMapLoad = () => {
            drawingManager.setMap(map);

            google.maps.event.addListener(drawingManager, 'polygoncomplete', handlePolygonComplete);
        };

        const map = new google.maps.Map(document.getElementById('map-area-create')!, {
            tilt: 0,
            zoom: initialZoom || 13,
            streetViewControl: false,
            mapTypeId: typeMaps || 'satellite',
            center: initialCoordinates || { lat: 37.775, lng: -122.434 }
        });

        google.maps.event.addListener(map, 'idle', handleMapLoad);
        return () => {
            google.maps.event.clearInstanceListeners(map);
        };
    }, [drawingManager]);

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
                id="map-area-create"
                key={'map-area-create'}
                style={{
                    width: size.width,
                    height: size.height,
                    borderRadius: radius || '8px'
                }}
            ></div>
            <div
                style={{
                    top: 10,
                    right: '52px',
                    width: '40px',
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
                title="Delete area"
            >
                <DeleteIcon />
            </div>
        </div>
    );
};

interface ICreateArea extends IMap {
    failed?: FunctionComponent;
    loading?: FunctionComponent;
}

export const CreateArea: FC<ICreateArea> = ({ size, radius, apiKey, typeMaps, onGetMap, libraries, initialZoom, initialCoordinates, failed: FailedComponent, loading: LoadingComponent }) => {
    const renderMap = (status: Status) => {
        switch (status) {
            case Status.LOADING:
                return LoadingComponent ? <LoadingComponent /> : <>Loading...</>;

            case Status.FAILURE:
                return FailedComponent ? <FailedComponent /> : <>failed</>;

            case Status.SUCCESS:
                return (
                    <Map size={size} apiKey={apiKey} radius={radius} onGetMap={onGetMap} typeMaps={typeMaps} libraries={libraries} initialZoom={initialZoom} initialCoordinates={initialCoordinates} />
                );
        }
    };

    return <Wrapper apiKey={apiKey} render={renderMap} libraries={[...(libraries ? libraries : []), 'drawing']} key={'wrapper-create'}></Wrapper>;
};
