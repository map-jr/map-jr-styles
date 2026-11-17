# map-jr-styles

Map styles for [map-jr-gl](https://github.com/map-jr/map-jr-gl) that carry their own icons and road shields as SVG
templates, in place of a sprite sheet. Each style has a light and a dark branch, chosen by the global state
property `color-scheme`.

| Style | File | What it is |
|---|---|---|
| Elevation · color | `dist/styles/elevation-color.json` | A full-color terrain map. Dark is the same map under bright moonlight. |
| Elevation · radar | `dist/styles/elevation-radar.json` | A neutral base for an overlay (a choropleth, snowfall), with relief and peaks for context. |
| OpenFreeMap | `dist/styles/openfreemap-{bright,dark,fiord,liberty,positron}.json` | The styles of OpenFreeMap as they are, with the images of the sprite inside the style. |

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
icons/extra.json       POI classes the sprite has no icon for: new icons from Maki glyphs, and aliases
icons/extra/*.svg      the new icons (npm run update-icons)
shields/*.svg          road shield templates, written by hand
shields/shields.mjs    how each shield stretches, and the networks whose look is set by hand
shields/networks.json  the look of each road network, from OSM Americana (npm run update-shields)
styles/src/*.json      the source styles, which use the sprite
styles/*.mjs           one module for each style (or family): its dark palette and its fixes
styles/shared.mjs      the dark icon colors and the neutral shield plate
lib/                   the build steps
```

**Icons.** `lib/icons.mjs` minifies each upstream SVG with SVGO and replaces each color by a slot named for its
role: `{{color}}` (the glyph), `{{background}}` (the plate behind it) and `{{border}}` (the outline or halo). The
build writes three files to `dist/icons/`: `icons.min.json` (`{"name": "<svg…>"}`), `icons.template.json` (the same
with slots) and `icons.defaults.json` (the colors of each icon). An icon whose colors fit no rule stops the build.

The tiles have POI classes that the sprite has no icon for. `icons/extra.json` gives 14 of them a new icon, drawn
from a [Maki](https://github.com/mapbox/maki) glyph in the look of the sprite, and gives 34 more the icon of a
class that has one (`atm` is `bank`, `yoga` is `sports_centre`). In the styles of this repository an alias costs no
image: the layer draws it from the image of its target.

**Styles.** A style module gets the source style and changes it: `useIcons` puts the templates that the layers use
into `metadata["map-jr:images"]`, turns each `icon-image` into an `image` expression with the colors as `params`,
and removes `sprite`. `retune` gives the dark branch of the source style new values, by its `dark|light` pair.

**Road shields.** `useShields` gives the shield layer one template for each shape, which stretches around the route
number with `icon-text-fit`. The shape and the colors come from `route_1_network` of the OpenMapTiles layer
`transportation_name`. To add a network, add its name to an entry of `NETWORKS` in `shields/shields.mjs`, or add an
entry. To add a shape, add an SVG with slots to `shields/` and its stretch columns to `SHAPES`.

| Shape | Networks |
|---|---|
| `us_interstate` | US Interstates |
| `us_highway` | US Highways |
| `pill` | US state routes, and the networks Americana draws as a pill or an ellipse |
| `hex` | German Autobahn, Italian autostrade, and the networks Americana draws as a horizontal hexagon |
| `rect` | The other networks, with the colors of their signs; a neutral plate for a network that is not listed |

The colors and shapes come from the shield definitions of OSM Americana: `npm run update-shields` downloads them
and writes `shields/networks.json`. It keeps the networks of a country, state or province (about 200) and leaves out
county and city networks. A shield that Americana draws from artwork (most US states, Mexico, Korea) gets the pill or
the neutral plate here, unless `MANUAL` in `shields/shields.mjs` gives it a look.

**Global state.** The two styles of this repository read three properties of the global state of the map:

| Property | Values | Effect |
|---|---|---|
| `color-scheme` | `light` (default), `dark` | The branch of the style. map-jr-gl sets it from `colorScheme`. |
| `elevation-unit` | `ft` (default), `m` | The unit of the elevation in peak labels. Set it with `globalState: {'elevation-unit': 'm'}`. |
| `language` | none (default), or a language code of the tiles such as `de`, `fr`, `ja` | The language of the names, for each feature that has a name in it. Without it, a place with a name in a script other than Latin shows its Latin name and that name, and other names are English. |

**OpenFreeMap styles.** `styles/openfreemap.mjs` builds the five styles of OpenFreeMap with `inlineSprite`: the
images that a layer can ask for go into the style as plain SVG, and the layers are not changed.

## Preview

`npm run preview` draws each style in light and dark, side by side, at the views of `test/views.json` (a range of
zoom levels and kinds of place), into `test/shots/`. Set `STATE` to try a global state: `STATE='{"elevation-unit":"m"}' node test/preview.mjs elevation-color chamonix`. It needs Playwright with Chromium, and the `dist/` folder of a
map-jr-gl build in `test/lib/`. Pass a style and a view to draw one: `node test/preview.mjs elevation-radar rockies`.

## Sources and licences

The code and the shield templates of this repository have the MIT licence (`LICENSE`). The icons, the source styles
and the network table come from OpenFreeMap, OSM Liberty, OpenMapTiles, Maki and OSM Americana and keep their own terms: see
`NOTICE.md`. The idea of a shape and colors for each route network follows
[Trailblazer](https://github.com/osm-americana/trailblazer).
