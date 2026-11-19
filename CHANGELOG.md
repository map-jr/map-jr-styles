# Changelog

Each version has one entry. The styles are served at `https://styles.map-jr.org/<major>/`, so a version that breaks a
map increases the first number, and its entry starts with a section "Breaking changes". Every other version
increases the second number. The third number is always 0. See [Release](README.md#release).

## 1.1.0 (unreleased)

- Elevation · color is renamed Elevation: `elevation-color.json` is now `elevation.json`, with the same layers. The
  old name is gone.
- Elevation · zero (`elevation-zero.json`): Elevation without the elevation tiles. It has no hillshade, no 3D terrain
  and no labels of peaks, and keeps the shaded relief of Natural Earth at low zooms.
- Elevation · radar: the global state `relief` (`true` by default) switches off the hillshade and the labels of
  peaks. map-jr-gl does not read a global state in `visibility` yet
  ([map-jr/map-jr-gl#998](https://github.com/map-jr/map-jr-gl/issues/998)).
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
