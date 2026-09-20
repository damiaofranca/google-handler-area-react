# google-handler-area-react

React components for drawing, editing and displaying areas (polygons) and points
on Google Maps — with a **shared, deduplicated Google Maps loader**, safe
**resource cleanup**, first-class **TypeScript** types and support for
**multiple independent maps** on the same page.

- 🧩 4 ready-to-use components: `CreateArea`, `UpdateArea`, `SelectLocation`, `InfosInMap`
- ⚡ The Google Maps script is loaded **once**, no matter how many maps you render
- 🧹 Every listener, marker, polygon and map is torn down on unmount (no leaks)
- 🗺️ Multiple maps of the same type can coexist (fixed the old fixed-`id` bug)
- 🔐 Info-window values are **HTML-escaped by default** (XSS-safe)
- 🌱 Tree-shakable ESM build with accurate `.d.ts`

---

## Installation

```bash
npm install google-handler-area-react
```

Peer dependencies (you almost certainly already have these):

```bash
npm install react react-dom
```

The Google Maps packages (`@googlemaps/js-api-loader`,
`@googlemaps/react-wrapper`) ship as regular dependencies and are installed
automatically.

---

## Quick Start

```tsx
import { CreateArea } from 'google-handler-area-react';

export function Demo() {
    return (
        <CreateArea
            apiKey={import.meta.env.VITE_MAPS_KEY}
            libraries={[]}
            size={{ width: '100%', height: '480px' }}
            initialCoordinates={{ lat: -23.55, lng: -46.63 }}
            onGetMap={(coords) => console.log('area:', coords)}
        />
    );
}
```

---

## Components

### `CreateArea`

Draw a single editable polygon. Reports the vertices on every change
(create / move / insert / remove / delete) via `onGetMap`, or `null` when cleared.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | ✅ | Google Maps API key. |
| `size` | `{ width: string; height: string }` | ✅ | Container dimensions. |
| `initialCoordinates` | `{ lat: number; lng: number }` | ✅ | Map center. |
| `onGetMap` | `(value: ICoordinates[] \| null) => void` | ✅ | Called with the polygon path (or `null`). |
| `libraries` | `Libraries` | ✅ | Extra Google Maps libraries to load. |
| `initialZoom` | `number` | – | Default `13`. |
| `typeMaps` | `'roadmap' \| 'satellite' \| 'hybrid' \| 'terrain'` | – | Default `'satellite'`. |
| `radius` | `string` | – | Border radius, default `'8px'`. |
| `mapId` | `string` | – | Cloud Map ID (enables vector maps / advanced features). |
| `version` | `string` | – | Pin a Maps API version. |
| `polygonOptions` | `google.maps.PolygonOptions` | – | Fill/stroke styling for the polygon. |
| `onMetrics` | `(m: PolygonMetrics \| null) => void` | – | Area/perimeter/centroid on each change. |
| `loading` / `failed` | `FunctionComponent` | – | Custom loading / error UI. |

### `UpdateArea`

Same as `CreateArea` but seeded with an `existingPolygon: ICoordinates[]`
rendered as an editable area. Delete it to draw a new one. `existingPolygon` is
applied once, on mount.

### `SelectLocation`

Pick a single point by clicking the map; the chosen `{ lat, lng }` is reported
through `onSetLocation`. Pass `iconPath` for a custom marker icon, or `showSearch`
to add a Places autocomplete box (modern `PlaceAutocompleteElement`, with a
legacy fallback) that recenters the map/marker on the chosen address. `showSearch`
requires the **Places API (New)** enabled on the key.

### `InfosInMap`

Render one marker per entry in `infos: IContentInfoWindow[]`. Clicking a marker
opens an info window built from `infoWindowHtml`, whose `$>key<$` placeholders
are filled from that entry.

```tsx
<InfosInMap
    apiKey={KEY}
    size={{ width: '100%', height: '400px' }}
    initialCoordinates={{ lat: -23.55, lng: -46.63 }}
    infos={[{ lat: -23.55, lng: -46.63, name: 'HQ', city: 'São Paulo' }]}
    infoWindowHtml={'<h4>$>name<$</h4><p>$>city<$</p>'}
/>
```

> **Security:** injected values are HTML-escaped by default. Pass `allowHtml`
> only if the data is fully trusted.

Pass `cluster` to group markers with `@googlemaps/markerclusterer` (an optional
peer dependency, loaded on demand only when `cluster` is set):

```tsx
<InfosInMap cluster infos={manyPoints} infoWindowHtml={'<p>$>name<$</p>'} /* ... */ />
```

## Advanced usage

### Shared configuration (`GoogleMapsProvider`)

Wrap your tree once to share `apiKey`, `version`, `libraries`, `mapId`,
`language`/`region` and `debug` — components then omit those props (their own
props still win, and `libraries` merge):

```tsx
import { GoogleMapsProvider, CreateArea, SelectLocation } from 'google-handler-area-react';

<GoogleMapsProvider config={{ apiKey: KEY, language: 'pt-BR' }}>
  <CreateArea size={...} initialCoordinates={...} libraries={[]} onGetMap={...} />
  <SelectLocation size={...} initialCoordinates={...} onSetLocation={...} />
</GoogleMapsProvider>
```

`useGoogleMapsConfig()` exposes the current config if you need it.

### Debugging

Turn on namespaced `console.debug` logging (loader, lifecycle) — globally or per
component. It is a no-op when off, so it is safe in production:

```tsx
import { setDebug } from 'google-handler-area-react';
setDebug(true);                          // global
<CreateArea debug /* ... */ />           // per component
<GoogleMapsProvider config={{ debug: true }}>…</GoogleMapsProvider>  // app-wide
```


### Modern markers (`AdvancedMarkerElement`)

`SelectLocation` and `InfosInMap` use the deprecated `google.maps.Marker` by
default so existing setups keep working. Provide a **`mapId`** to opt into the
modern `AdvancedMarkerElement` automatically (the `marker` library is then
loaded for you):

```tsx
<SelectLocation apiKey={KEY} mapId="YOUR_MAP_ID" /* ... */ />
```

### How area drawing works (no more `DrawingManager`)

Google **removed the `drawing` library / `DrawingManager`** from all served Maps
versions (v3.65+) — the old toolbar-based drawing no longer works. `CreateArea`
and `UpdateArea` therefore draw with a **native editable polygon**: click the
map to place vertices, drag them to edit, use the trash control to clear. The
public props and the `onGetMap` contract are unchanged, so no code change is
needed on your side. The `version` prop remains available for pinning the Maps
API version for other reasons.

### Info windows & CSS theming

`InfosInMap`'s info window is rendered by Google **inside the map DOM** (a child
of `<body>`), so it inherits your app's global styles. On a **dark theme**, a
global `body { color: ... }` bleeds into the white info box — washing out the
text and hiding the close "X" (a masked element whose glyph uses the current
color) while it stays clickable.

The library only injects your `infoWindowHtml`; the fix belongs to the consuming
app. Either set an explicit color in the template:

```tsx
<InfosInMap infoWindowHtml={'<div style="color:#202124">$>name<$</div>'} /* ... */ />
```

or scope the info window in your global CSS:

```css
.gm-style-iw,
.gm-style-iw-d,
.gm-style-iw * { color: #202124; }
.gm-style .gm-ui-hover-effect > span { background-color: #5f6368 !important; }
```

---

## Geometry helpers

Pure, dependency-free functions to measure the areas you draw — no Google Maps
runtime or `geometry` library needed, so they work anywhere (server included)
and are fully tree-shakable:

```ts
import { computePolygonArea, computePolygonPerimeter, computePolygonCentroid, computePolygonMetrics } from 'google-handler-area-react';

const area = computePolygonArea(coords); // m²
const perimeter = computePolygonPerimeter(coords); // m
const centroid = computePolygonCentroid(coords); // { lat, lng } | null
const all = computePolygonMetrics(coords); // { area, perimeter, centroid }
```

`CreateArea` and `UpdateArea` also accept an optional **`onMetrics`** callback,
fired alongside `onGetMap` with `{ area, perimeter, centroid }` (or `null` when
cleared):

```tsx
<CreateArea
  /* ... */
  onGetMap={(coords) => setCoords(coords)}
  onMetrics={(m) => setArea(m ? m.area : 0)}
/>
```

---

## Public API

Components: `CreateArea`, `UpdateArea`, `SelectLocation`, `InfosInMap`
(+ their prop types `ICreateArea`, `IUpdateArea`, `ISelectLocation`, `IInfosInMap`).

Core: `loadGoogleMaps`, `importMapsLibrary`, `isGoogleMapsLoaded`,
`resetGoogleMapsLoader`, `GoogleMapsError`, and types `LoadGoogleMapsOptions`,
`GoogleMapsErrorCode`, `Library`, `ICoordinates`, `MapSize`, `MapTypeId`,
`ManagedMarker`. Geometry: `computePolygonArea`, `computePolygonPerimeter`,
`computePolygonCentroid`, `computeDistance`, `computePolygonMetrics`
(+ `PolygonMetrics`).

Utils: `injectAttributes` (+ `IContentInfoWindow`, `InjectAttributesOptions`).

---

## Migration

Upgrading from `1.4.x`? See [MIGRATION.md](./MIGRATION.md). **No breaking
changes** — it is a drop-in upgrade.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT © Damião França
