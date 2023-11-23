import React, { FC, FunctionComponent, useEffect } from 'react';
import { Status, Wrapper } from '@googlemaps/react-wrapper';
import { Libraries } from '@googlemaps/js-api-loader';

interface IMap {
    radius?: string;
    iconPath?: string;
    initialZoom?: number;
    size: { width: string; height: string };
    initialCoordinates: { lat: number; lng: number };
    typeMaps?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
    onSetLocation: ({ lat, lng }: { lat: number; lng: number }) => void;
}

const Map: React.FC<IMap> = ({
    size,
    radius,
    typeMaps,
    iconPath,
    initialZoom,
    initialCoordinates,

    onSetLocation
}) => {
    useEffect(() => {
        const map = new window.google.maps.Map(document.getElementById('map-select')!, {
            tilt: 0,
            draggableCursor: 'pointer',
            center: initialCoordinates,
            zoom: initialZoom ? initialZoom : 13,
            mapTypeId: typeMaps ? typeMaps : 'satellite'
        });

        const marker = new google.maps.Marker({
            map,
            draggable: false,
            ...(iconPath ? { icon: iconPath } : {})
        });

        map.addListener('click', (click: google.maps.MapMouseEvent) => {
            onSetLocation({
                lat: click.latLng?.lat() || 0,
                lng: click.latLng?.lng() || 0
            });
            marker.setPosition({
                lat: click.latLng?.lat() || 0,
                lng: click.latLng?.lng() || 0
            });
        });
    }, []);

    return (
        <div
            style={{
                width: size.width,
                height: size.height
            }}
        >
            <div
                id="map-select"
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: radius ? radius : '8px'
                }}
            ></div>
        </div>
    );
};

interface ISelectLocation extends Pick<IMap, 'typeMaps' | 'initialZoom' | 'onSetLocation' | 'iconPath' | 'size'> {
    apiKey: string;
    borderRadius?: string;
    libraries: Libraries;
    failed?: FunctionComponent;
    loading?: FunctionComponent;
    initialCoordinates: { lat: number; lng: number };
}

export const SelectLocation: FC<ISelectLocation> = ({
    size,
    apiKey,
    iconPath,
    typeMaps,
    libraries,
    initialZoom,
    borderRadius,
    initialCoordinates,
    failed: FailedComponent,
    loading: LoadingComponent,

    onSetLocation
}) => {
    const renderMap = (status: Status) => {
        switch (status) {
            case Status.LOADING:
                return LoadingComponent ? <LoadingComponent /> : <>loading...</>;

            case Status.FAILURE:
                return FailedComponent ? <FailedComponent /> : <>failed</>;

            case Status.SUCCESS:
                return (
                    <Map size={size} iconPath={iconPath} typeMaps={typeMaps} radius={borderRadius} initialZoom={initialZoom} onSetLocation={onSetLocation} initialCoordinates={initialCoordinates} />
                );
        }
    };

    return <Wrapper apiKey={apiKey} render={renderMap} libraries={libraries} key={'wrapper-create'}></Wrapper>;
};
