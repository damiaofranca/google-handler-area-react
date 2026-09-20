# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [1.5.0] - 2026-09-20

A stability, performance and modernization release. **No breaking changes** —
the public component API from `1.4.x` is fully preserved.

### Fixed

- **Area drawing no longer depends on the removed `DrawingManager`.** Google
  removed the `drawing` library from all served Maps versions (v3.65+), which
  broke `CreateArea`/`UpdateArea` at runtime. They now draw a native editable
  polygon (click to add vertices, drag to edit). The public props and
  `onGetMap` contract are unchanged.
- **Multiple maps of the same type no longer collide.** Components used fixed DOM
  ids (`map-area-create`, `map-area-update`, `map-select`, `map-infos`); rendering
  two of the same component made both maps target the same element. They now use
  React refs, so any number of maps can coexist.
- **`CreateArea` double-loading of the Maps API.** It created a second
  `new Loader(...)` alongside `@googlemaps/react-wrapper`, which could throw
  *"Loader must not be called again with different options"*. Removed; it now
  imports the `drawing` library through the shared loader.
- **`SelectLocation` / `InfosInMap` `libraries` bug.** `libraries={(libraries = { ...(libraries ? libraries : []) })}`
  mutated the prop and turned the array into `{}`. Now passes a proper array.
- **`UpdateArea` drew a duplicate/mis-configured polygon** (a `DrawingManager`
  with `polygonOptions.paths` *and* a separate `Polygon`). Now renders a single
  editable polygon.
- **Memory leaks:** click / `set_at` / `insert_at` / `polygoncomplete` listeners,
  markers, polygons, drawing managers and maps are now all removed on unmount.
- **`InfosInMap` orphaned markers:** changing `infos` created new markers without
  removing the old ones. Markers are now fully rebuilt and cleaned up.
- Stale closures in `useEffect` callbacks (callbacks are read through refs).

### Security

- **`injectAttributes` now HTML-escapes injected values by default** to prevent
  XSS in info-window content. Opt out with `allowHtml` when the data is trusted.

### Added

- Shared, deduplicated loader: `loadGoogleMaps`, `importMapsLibrary`,
  `isGoogleMapsLoaded`, `resetGoogleMapsLoader`.
- Typed errors: `GoogleMapsError` with a stable `code` (`GoogleMapsErrorCode`).
- Optional **`mapId`** prop → opt into modern `AdvancedMarkerElement`
  (`SelectLocation`, `InfosInMap`) with automatic fallback to the legacy marker.
- Optional **`version`** prop to pin the Maps API version.
- Optional **`allowHtml`** prop on `InfosInMap`.
- Exported prop types (`ICreateArea`, `IUpdateArea`, `ISelectLocation`,
  `IInfosInMap`) and shared types (`ICoordinates`, `MapSize`, `MapTypeId`,
  `ManagedMarker`).
- Pure geometry helpers (no Maps runtime needed): `computePolygonArea`,
  `computePolygonPerimeter`, `computePolygonCentroid`, `computeDistance`,
  `computePolygonMetrics` (+ `PolygonMetrics`).
- Optional `onMetrics` callback and `polygonOptions` prop on `CreateArea` /
  `UpdateArea` (area/perimeter/centroid reported alongside `onGetMap`).
- `GoogleMapsProvider` + `useGoogleMapsConfig` to share `apiKey`/`version`/
  `libraries`/`mapId`/`language`/`region`/`debug` across components (`apiKey` is
  now optional on components when a provider supplies it).
- Debug/observability: `setDebug`, `isDebugEnabled`, and a `debug` prop/config
  that logs loader and lifecycle events (no-op when disabled).
- `role="button"` / `aria-label` on the delete control.

### Performance

- Single Maps script load and single loader instance across the whole app.
- Lazy, cached library imports (`drawing`, `marker`).
- No per-render construction of `Loader` / `DrawingManager`.
- Tree-shakable ESM build (`sideEffects: false`); React and the Google Maps
  packages are externalized instead of bundled.

### Changed

- Build now runs `vite build && tsc` sequentially (was `vite build & tsc`, a race).
- Modern tooling: TypeScript 5, `react-jsx` transform, Vitest test suite,
  `exports` map, `engines.node >= 18`.
- `@types/google.maps` pinned to `3.58.1` for stable typings.
- `rimraf` moved from `peerDependencies` to `devDependencies`; duplicated runtime
  deps removed from `devDependencies`.

### Deprecated

- `google.maps.Marker` remains the default marker; pass `mapId` to opt into
  `AdvancedMarkerElement`. Legacy `Marker` will be removed in a future major.

## [1.4.7] - previous

- Legacy releases. See git history.
