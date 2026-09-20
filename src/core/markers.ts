import type { ICoordinates } from './types';

/**
 * A marker wrapper that hides the difference between the modern
 * `AdvancedMarkerElement` and the legacy `google.maps.Marker`, exposing a
 * single lifecycle-safe interface.
 *
 * @public
 */
export interface ManagedMarker {
    /**
     * The underlying Google Maps object, suitable for use as an
     * `InfoWindow` anchor.
     */
    readonly anchor: google.maps.MVCObject | google.maps.marker.AdvancedMarkerElement;
    /** Moves the marker to a new position. */
    setPosition(position: ICoordinates): void;
    /** Registers a click handler and returns the listener for cleanup. */
    addClickListener(handler: () => void): google.maps.MapsEventListener;
    /** Detaches the marker from the map. Always call this on cleanup. */
    remove(): void;
}

interface CreateMarkerParams {
    map: google.maps.Map;
    position?: ICoordinates;
    /** Optional custom icon URL. */
    iconPath?: string;
    /**
     * Resolved `marker` library. When provided (and the map has a `mapId`), an
     * `AdvancedMarkerElement` is used; otherwise the legacy `Marker` is used.
     */
    markerLibrary?: google.maps.MarkerLibrary | null;
    draggable?: boolean;
}

/**
 * Creates a {@link ManagedMarker}, preferring the modern
 * `AdvancedMarkerElement` when the `marker` library is available and falling
 * back to the (deprecated but universally supported) `google.maps.Marker`.
 *
 * @internal
 */
export const createManagedMarker = ({ map, position, iconPath, markerLibrary, draggable = false }: CreateMarkerParams): ManagedMarker => {
    if (markerLibrary?.AdvancedMarkerElement) {
        const { AdvancedMarkerElement } = markerLibrary;

        let content: HTMLElement | undefined;
        if (iconPath) {
            const img = document.createElement('img');
            img.src = iconPath;
            img.style.width = '32px';
            img.style.height = '32px';
            content = img;
        }

        const marker = new AdvancedMarkerElement({
            map,
            gmpClickable: true,
            gmpDraggable: draggable,
            ...(position ? { position } : {}),
            ...(content ? { content } : {})
        });

        return {
            anchor: marker,
            setPosition(next) {
                marker.position = next;
            },
            addClickListener(handler) {
                return marker.addListener('gmp-click', handler);
            },
            remove() {
                marker.map = null;
            }
        };
    }

    // Legacy fallback.
    const marker = new google.maps.Marker({
        map,
        draggable,
        ...(position ? { position } : {}),
        ...(iconPath ? { icon: iconPath } : {})
    });

    return {
        anchor: marker,
        setPosition(next) {
            marker.setPosition(next);
        },
        addClickListener(handler) {
            return marker.addListener('click', handler);
        },
        remove() {
            marker.setMap(null);
        }
    };
};
