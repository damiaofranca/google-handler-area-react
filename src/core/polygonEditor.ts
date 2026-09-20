import type { ICoordinates } from './types';

/**
 * Imperative controller for an editable polygon drawn by clicking the map.
 *
 * This replaces the removed `google.maps.drawing.DrawingManager` (Google
 * dropped the `drawing` library from all served Maps versions as of v3.65).
 * Clicking the map appends a vertex; the polygon is always editable, so
 * dragging, inserting or removing vertices works immediately. Every change is
 * reported through `onChange`.
 *
 * @internal
 */
export interface PolygonEditor {
    /** Whether a polygon currently exists with at least one vertex. */
    hasPolygon(): boolean;
    /** Removes the current polygon and reports `null`. Drawing can start again. */
    clear(): void;
    /** Removes all listeners and the polygon. Call on unmount. */
    destroy(): void;
}

interface PolygonEditorParams {
    map: google.maps.Map;
    /** Seed the editor with an existing area (rendered editable). */
    initialPath?: ICoordinates[];
    /** Called with the full path on every change, or `null` when cleared. */
    onChange: (path: ICoordinates[] | null) => void;
    /** Options applied to the underlying polygon (color, etc.). */
    polygonOptions?: google.maps.PolygonOptions;
}

/**
 * Creates a {@link PolygonEditor} bound to `map`.
 *
 * @internal
 */
export const createPolygonEditor = ({ map, initialPath, onChange, polygonOptions }: PolygonEditorParams): PolygonEditor => {
    let polygon: google.maps.Polygon | null = null;
    let pathListeners: google.maps.MapsEventListener[] = [];

    const emit = () => {
        if (!polygon) {
            onChange(null);
            return;
        }
        onChange(
            polygon
                .getPath()
                .getArray()
                .map((point) => ({ lat: point.lat(), lng: point.lng() }))
        );
    };

    const bindPath = (target: google.maps.Polygon) => {
        const path = target.getPath();
        pathListeners.push(
            google.maps.event.addListener(path, 'set_at', emit),
            google.maps.event.addListener(path, 'insert_at', emit),
            google.maps.event.addListener(path, 'remove_at', emit)
        );
    };

    const detach = () => {
        pathListeners.forEach((listener) => listener.remove());
        pathListeners = [];
        if (polygon) {
            polygon.setMap(null);
            polygon = null;
        }
    };

    if (initialPath?.length) {
        polygon = new google.maps.Polygon({ map, editable: true, ...polygonOptions, paths: initialPath });
        bindPath(polygon);
    }

    const clickListener = google.maps.event.addListener(map, 'click', (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        if (!polygon) {
            polygon = new google.maps.Polygon({ map, editable: true, ...polygonOptions });
            // A Polygon built with an empty `paths` has no path (getPath() is
            // undefined). Establish a single empty, mutable path explicitly.
            polygon.setPath(new google.maps.MVCArray<google.maps.LatLng>());
            bindPath(polygon);
        }
        // push() triggers the path's 'insert_at' listener, which emits.
        polygon.getPath().push(event.latLng);
    });

    return {
        hasPolygon: () => !!polygon && polygon.getPath().getLength() > 0,
        clear: () => {
            detach();
            onChange(null);
        },
        destroy: () => {
            clickListener.remove();
            detach();
        }
    };
};
