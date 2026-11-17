# map-jr-styles

Map styles for [map-jr-gl](https://github.com/map-jr/map-jr-gl) that carry their own icons and road shields as SVG
templates, in place of a sprite sheet. Each style has a light and a dark branch, chosen by the global state
property `color-scheme`.

| Style | File | What it is |
|---|---|---|
| Elevation · colour | `dist/styles/elevation-color.json` | A full-colour terrain map. Dark is the same map under bright moonlight. |
| Radar | `dist/styles/radar.json` | A neutral base for an overlay (a choropleth, snowfall), with relief and peaks for context. |

Each style also has a `.min.json` without white space. The styles need a map-jr-gl build that reads
`metadata["map-jr:images"]` and `params` of the `image` expression. MapLibre GL JS draws them without icons.

## Build

```bash
npm install
```

```bash
npm run build
```

`dist/` is committed, so that a style has a URL. `npm run check` fails when `dist/` is not what the sources give;
CI runs it.

## How it is made

```
icons/upstream/*.svg   the SVG sources of the OpenFreeMap sprite (ofm_f384), one file for each icon
shields/*.svg          road shield templates, written by hand
shields/shields.mjs    how each shield stretches, and the look of each road network
styles/src/*.json      the source styles, which use the sprite
styles/*.mjs           one module for each style: its dark palette and its fixes
styles/shared.mjs      the dark icon colours and the neutral shield plate
lib/                   the build steps
```

**Icons.** `lib/icons.mjs` minifies each upstream SVG with SVGO and replaces each colour by a slot named for its
role: `{{color}}` (the glyph), `{{background}}` (the plate behind it) and `{{border}}` (the outline or halo). The
build writes three files to `dist/icons/`: `icons.min.json` (`{"name": "<svg…>"}`), `icons.template.json` (the same
with slots) and `icons.defaults.json` (the colours of each icon). An icon whose colours fit no rule stops the build.

**Styles.** A style module gets the source style and changes it: `useIcons` puts the templates that the layers use
into `metadata["map-jr:images"]`, turns each `icon-image` into an `image` expression with the colours as `params`,
and removes `sprite`. `retune` gives the dark branch of the source style new values, by its `dark|light` pair.

**Road shields.** `useShields` gives the shield layer one template for each shape, which stretches around the route
number with `icon-text-fit`. The shape and the colours come from `route_1_network` of the OpenMapTiles layer
`transportation_name`. To add a network, add its name to an entry of `NETWORKS` in `shields/shields.mjs`, or add an
entry. To add a shape, add an SVG with slots to `shields/` and its stretch columns to `SHAPES`.

| Shape | Networks |
|---|---|
| `us_interstate` | US Interstates |
| `us_highway` | US Highways |
| `pill` | US state routes |
| `hex` | German Autobahn (blue), Italian autostrade (green) |
| `rect` | Coloured plates for motorway and trunk networks of about 15 more countries; a neutral plate for the rest |

The colours are a first pass from the real signs, not a survey: check the networks you care about.

## Preview

`npm run preview` draws each style in light and dark, side by side, at the views of `test/views.json` (a range of
zoom levels and kinds of place), into `test/shots/`. It needs Playwright with Chromium, and the `dist/` folder of a
map-jr-gl build in `test/lib/`. Pass a style and a view to draw one: `node test/preview.mjs radar rockies`.

## Sources and licences

- `icons/upstream/` comes from [openfreemap-styles](https://github.com/hyperknot/openfreemap-styles) (the liberty and
  bright icon sets). Their licence files are next to the icons.
- The shield templates in `shields/` are drawn for this repository. The idea of a shape and colours for each route
  network follows [Trailblazer](https://github.com/osm-americana/trailblazer) of OSM Americana.
- Map data in the styles: OpenFreeMap, OpenMapTiles, OpenStreetMap, Mapterhorn.

This repository has no licence of its own yet.
