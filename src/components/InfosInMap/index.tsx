import React, { FC, FunctionComponent, useEffect } from 'react';
import { Status, Wrapper } from '@googlemaps/react-wrapper';
import { Libraries } from '@googlemaps/js-api-loader';

import injectAttributes from '../../utils/injectAttributes';

interface IContentInfoWindow {
    lat: number;
    lng: number;
    [key: string]: any;
}

interface IMap {
    radius?: string;
    iconPath?: string;
    initialZoom?: number;
    /**
     * Replaces placeholders in the HTML code with corresponding values provided in `info`.
     *
     * The format `$>key<$` will be swapped for each iteration of `infos[index][key]`.
     *
     * It is mandatory to use ` `` ` instead of `""` in the passed string format for the layout to work accordingly.
     *
     * @returns {string} - The modified HTML code with injected values.
     *
     * You can create styles for elements by passing classes (use class instead className) and styling in a global style file.
     *
     * @example
     * // The users provided are: [{ name: 'John', age: 25, city: 'New York' },...];
     * // The htmlCode property is = '<p>$>name<$ is $>age<$ years old and lives in $>city<$.</p>';
     *
     * // Result: '<p>John is 25 years old and lives in New York.</p>'
     */

    infoWindowHtml: string;
    ariaLabelCustom?: string;
    infos: IContentInfoWindow[];
    size: { width: string; height: string };
    initialCoordinates: { lat: number; lng: number };
    typeMaps?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
}

const Map: React.FC<IMap> = ({ size, infos, radius, typeMaps, iconPath, initialZoom, infoWindowHtml, ariaLabelCustom, initialCoordinates }) => {
    const [map, setMap] = React.useState<google.maps.Map | null>(null);

    useEffect(() => {
        if (map && infos.length) {
            infos.map((info) => {
                const infoWindow = new google.maps.InfoWindow({
                    content: injectAttributes(info, infoWindowHtml),
                    ariaLabel: ariaLabelCustom ? ariaLabelCustom : 'Open Sans'
                });
                const marker = new window.google.maps.Marker({
                    map,
                    position: { lat: info.lat, lng: info.lng },
                    ...(iconPath ? { icon: iconPath } : {})
                });

                marker.addListener('click', () => {
                    infoWindow.open({
                        map,
                        anchor: marker
                    });
                });
            });
        }
    }, [infos, ariaLabelCustom, iconPath, infoWindowHtml, map]);

    useEffect(() => {
        const _map = new window.google.maps.Map(document.getElementById('map-infos')!, {
            tilt: 0,
            center: initialCoordinates,
            zoom: initialZoom ? initialZoom : 13,
            mapTypeId: typeMaps ? typeMaps : 'satellite',
            streetViewControl: false
        });

        setMap(_map);
    }, []);

    return (
        <div
            style={{
                width: size.width,
                height: size.height
            }}
        >
            <div
                id="map-infos"
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: radius ? radius : '8px'
                }}
            ></div>
        </div>
    );
};

interface IInfosInMap extends IMap {
    apiKey: string;
    libraries?: Libraries;
    failed?: FunctionComponent;
    loading?: FunctionComponent;
}

export const InfosInMap: FC<IInfosInMap> = ({
    size,
    infos,
    radius,
    apiKey,
    iconPath,
    typeMaps,
    libraries,
    initialZoom,
    infoWindowHtml,
    ariaLabelCustom,
    initialCoordinates,
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
                        infos={infos}
                        radius={radius}
                        iconPath={iconPath}
                        typeMaps={typeMaps}
                        initialZoom={initialZoom}
                        infoWindowHtml={infoWindowHtml}
                        ariaLabelCustom={ariaLabelCustom}
                        initialCoordinates={initialCoordinates}
                    />
                );
        }
    };

    return <Wrapper apiKey={apiKey} render={renderMap} libraries={...libraries ? libraries : []} key={'wrapper-create'}></Wrapper>;
};
