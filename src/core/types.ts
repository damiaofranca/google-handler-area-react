/**
 * A geographic point in decimal degrees.
 *
 * @public
 */
export interface ICoordinates {
    lat: number;
    lng: number;
}

/**
 * CSS dimensions for the map container.
 *
 * @public
 */
export interface MapSize {
    width: string;
    height: string;
}

/**
 * Supported Google Maps base map types.
 *
 * @public
 */
export type MapTypeId = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
