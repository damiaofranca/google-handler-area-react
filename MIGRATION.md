# Migration Guide

## 1.5.x → 1.6.0

**No breaking changes.** 1.6.0 only adds features (geometry helpers, `onMetrics`,
`polygonOptions`, `GoogleMapsProvider`, debug mode, `SelectLocation` `showSearch`,
`InfosInMap` `cluster`). `apiKey` became optional on components (it can come from
`GoogleMapsProvider`) — existing code passing `apiKey` keeps working unchanged.
Clustering needs the optional peer `@googlemaps/markerclusterer` installed.

## 1.4.x → 1.5.0

**There are no breaking changes.** `1.5.0` is a drop-in upgrade: every existing
prop keeps its meaning and default. You can upgrade without touching your code.

```bash
npm install google-handler-area-react@^1.5.0
```

### Behavior changes worth knowing

1. **Info-window values are now HTML-escaped by default.**
   Previously values injected into `infoWindowHtml` via `$>key<$` were inserted
   as raw HTML (an XSS risk). They are now escaped. The *template* HTML still
   renders normally — only the interpolated values are escaped.

   If you intentionally inject HTML from **trusted** data, restore the old
   behavior with the new `allowHtml` prop:

   ```tsx
   <InfosInMap allowHtml /* ... */ />
   ```

2. **`UpdateArea` now renders exactly one editable polygon.**
   The old code could produce a duplicated/mis-configured polygon. If you relied
   on that artifact, review the result — the corrected behavior is a single
   editable area.

### Recommended (optional) adoptions

- **Multiple maps:** you can now safely render several `CreateArea`/`UpdateArea`/
  `SelectLocation`/`InfosInMap` on the same page.
- **Modern markers:** pass a `mapId` to `SelectLocation`/`InfosInMap` to use
  `AdvancedMarkerElement` instead of the deprecated `google.maps.Marker`.
- **Area drawing changed (important):** Google removed the `drawing` library
  (`DrawingManager`) from all served Maps versions (v3.65+), which broke the old
  toolbar-based drawing. `CreateArea`/`UpdateArea` now draw a **native editable
  polygon** — click the map to add vertices, drag to edit, trash icon to clear.
  Props and `onGetMap` are unchanged, so no code change is required; only the
  interaction gesture differs (no drawing toolbar button).
- **Typed errors:** wrap `loadGoogleMaps`/`importMapsLibrary` and branch on
  `GoogleMapsError.code`.
