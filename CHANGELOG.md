# Changelog

Each version has one entry. The styles are served at `https://styles.map-jr.org/<major>/`, so a version that breaks a
map increases the first number, and its entry starts with a section "Breaking changes". Every other version
increases the second number. The third number is always 0. See [Release](README.md#release).

## 1.0.0 (2026-11-18)

The first release at `https://styles.map-jr.org/1/`.

- The styles Elevation · color, Elevation · radar, and the five styles of OpenFreeMap, each as one JSON file without
  white space, with its icons and road shields inside it.
- The two elevation styles draw their labels with the fonts of the system and load no glyph files. They need a
  map-jr-gl with commit `bd4d4ea`. MapLibre GL JS does not load them.
