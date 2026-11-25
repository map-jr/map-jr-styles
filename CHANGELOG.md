# Changelog

Each version has one entry. The styles are served at `https://styles.map-jr.org/<major>/`, so a version that breaks a
map increases the first number, and its entry starts with a section "Breaking changes". A version that adds to a
map increases the second number, and a fix increases the third. See [Release](README.md#release).

## 1.2.1 (2026-11-25)

- `https://styles.map-jr.org/data/natural-earth-5.1.2.pmtiles`: a PMTiles archive of the countries and the states and
  provinces of Natural Earth 5.1.2 (public domain), for the PMTiles example of map-jr-gl. Its name has the version of
  the data, and each upload from `main` or a release writes it.
- Elevation and Elevation · zero load the shaded relief of Natural Earth from OpenFreeMap as WebP
  (`ne2sr/{z}/{x}/{y}.webp`) in place of PNG: the same 512-pixel tiles, with exactly the same pixels (the PNG tiles of
  OpenFreeMap are its WebP tiles decoded), at about a sixteenth of the bytes. The source, layer and paint are the
  same.

## 1.2.0 (2026-11-19)

- The styles are for map-jr-gl 0.9.0 or later: the peer dependency is now `>=0.9.0`. The filters of `map-jr:ssr` read
  `["zoom"]` as the zoom of the render, and `relief` in Elevation · radar is a global state in `visibility`, both of
  which map-jr-gl reads from 0.9.0. The styles still load in an older map-jr-gl, with the limits of 1.1.0. The
  layers, images and URLs are the same.

## 1.1.0 (2026-11-19)

- Elevation · color is renamed Elevation: `elevation-color.json` is now `elevation.json`, with the same layers. The
  old name is gone.
- Elevation · zero (`elevation-zero.json`): Elevation without the elevation tiles. It has no hillshade, no 3D terrain
  and no labels of peaks, and keeps the shaded relief of Natural Earth at low zooms.
- Elevation · radar: the global state `relief` (`true` by default) switches off the hillshade and the labels of
  peaks. map-jr-gl reads a global state in `visibility` after 0.8.0
  ([map-jr/map-jr-gl#998](https://github.com/map-jr/map-jr-gl/issues/998)); MapLibre GL JS from 5.16.0.
- MapLibre styles: Elevation, Elevation · zero and Elevation · radar for MapLibre GL JS 5.16.0 or later, at
  `/1/maplibre/<name>.json` and `@map-jr/styles/maplibre/<name>.json`. They have the same layers and global state,
  with the icons in a sprite (`/1/maplibre/sprite`) in the colors of each branch, and the Noto Sans glyphs of
  OpenFreeMap in place of the fonts of the system. See [MapLibre GL JS](README.md#maplibre-gl-js).
- Each style has `metadata["map-jr:ssr"]`, for the first view that the server renderer of map-jr-gl writes: a
  placeholder, like a blurred image while the map loads. It keeps the background, the large areas, the water, the
  main roads, the borders and the names of places, and leaves out the rest. With `tileZoomOffset: 2` (map-jr-gl
  after 0.8.0) it is 4 to 12 KB with gzip in most views, 86% smaller than without it. The map in the browser and
  MapLibre GL JS ignore it. See [Server render](README.md#how-it-is-made).

## 1.0.0 (2026-11-18)

The first release at `https://styles.map-jr.org/1/`.

- The styles Elevation · color, Elevation · radar, and the five styles of OpenFreeMap, each as one JSON file without
  white space, with its icons and road shields inside it.
- The two elevation styles draw their labels with the fonts of the system and load no glyph files. They need a
  map-jr-gl with commit `bd4d4ea`. MapLibre GL JS does not load them.
