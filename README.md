# map-jr-styles

Map styles for [map-jr-gl](https://github.com/map-jr/map-jr-gl) that carry their own icons and road shields as SVG
templates, in place of a sprite sheet, and versions of the elevation styles for
[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/). Each elevation style has a light and a dark branch, chosen by
the global state property `color-scheme`.

## The styles

Pass a link as the `style` of the map. Each one is the latest release of version 1.

| Style | map-jr-gl | MapLibre GL JS 5.16+ | What it is |
|---|---|---|---|
| Elevation | [elevation.json](https://styles.map-jr.org/1/elevation.json) | [maplibre/elevation.json](https://styles.map-jr.org/1/maplibre/elevation.json) | A full-color terrain map. Dark is the same map under bright moonlight. |
| Elevation · zero | [elevation-zero.json](https://styles.map-jr.org/1/elevation-zero.json) | [maplibre/elevation-zero.json](https://styles.map-jr.org/1/maplibre/elevation-zero.json) | Elevation without the elevation tiles: no hillshade, no 3D terrain, no labels of peaks. It keeps the shaded relief of Natural Earth at low zooms. |
| Elevation · radar | [elevation-radar.json](https://styles.map-jr.org/1/elevation-radar.json) | [maplibre/elevation-radar.json](https://styles.map-jr.org/1/maplibre/elevation-radar.json) | A neutral base for an overlay (a choropleth, snowfall), with relief and peaks for context, which the global state `relief` switches off. |
| OpenFreeMap Bright | [openfreemap-bright.json](https://styles.map-jr.org/1/openfreemap-bright.json) | [OpenFreeMap's](https://tiles.openfreemap.org/styles/bright) | The styles of OpenFreeMap as they are, with the images of the sprite inside the style. For MapLibre, use the styles of OpenFreeMap itself. |
| OpenFreeMap Dark | [openfreemap-dark.json](https://styles.map-jr.org/1/openfreemap-dark.json) | [OpenFreeMap's](https://tiles.openfreemap.org/styles/dark) | 〃 |
| OpenFreeMap Fiord | [openfreemap-fiord.json](https://styles.map-jr.org/1/openfreemap-fiord.json) | [OpenFreeMap's](https://tiles.openfreemap.org/styles/fiord) | 〃 |
| OpenFreeMap Liberty | [openfreemap-liberty.json](https://styles.map-jr.org/1/openfreemap-liberty.json) | [OpenFreeMap's](https://tiles.openfreemap.org/styles/liberty) | 〃 |
| OpenFreeMap Positron | [openfreemap-positron.json](https://styles.map-jr.org/1/openfreemap-positron.json) | [OpenFreeMap's](https://tiles.openfreemap.org/styles/positron) | 〃 |

```js
createMap('map', {style: 'https://styles.map-jr.org/1/elevation.json'});                              // map-jr-gl
new maplibregl.Map({container: 'map', style: 'https://styles.map-jr.org/1/maplibre/elevation.json'}); // MapLibre GL JS
```

The same styles are in the npm package [`@map-jr/styles`](#from-npm): `@map-jr/styles/<name>.json` and
`@map-jr/styles/maplibre/<name>.json`. In this repository they are built to `dist/styles/` and `dist/maplibre/`.

Each style also has a `.min.json` without white space. The styles need a map-jr-gl build that reads
`metadata["map-jr:images"]` and `params` of the `image` expression. MapLibre GL JS draws them without icons: use the
MapLibre styles for it ([below](#maplibre-gl-js)).

The three elevation styles have no `glyphs`: map-jr-gl draws their labels with the fonts of the browser, and makes no
requests for fonts. Each `text-font` is a stack of the fonts of the system, such as
`["system-ui Semibold", "Segoe UI Semibold", "Roboto Medium", "sans-serif"]`: SF Pro on Apple systems, Segoe UI on
Windows, Roboto on Android. The first name gives the weight and the style (Regular, Semibold, Bold, Italic, Semibold
Italic). This needs a map-jr-gl with commit `bd4d4ea` (a `text-font` stack as a CSS family list, with `system-ui`
unquoted); an older one draws the labels in the `fontFamily` of the map. To give every reader the same font, pass the
font files in the `fonts` option of map-jr-gl. MapLibre GL JS does not load a style
with text and no `glyphs`: its versions of these three styles have the glyphs of OpenFreeMap. The OpenFreeMap styles
keep the glyphs of OpenFreeMap.

## Use

The styles are at `https://styles.map-jr.org`, by major version:

```js
createMap('map', {style: 'https://styles.map-jr.org/1/elevation.json'});
```

| Path | What it gives | Cached |
|---|---|---|
| `/1/<name>.json` | The latest release of version 1, without white space. It takes each change that does not break a map. | A day in the browser, then up to a week more while it is fetched again in the background; 5 minutes at the edge |
| `/1/version.json` | `{version, commit}` of the folder | As its folder |

A new major version (`/2/`) breaks a map: a layer id is renamed or removed, a global state property changes, or the
styles need a newer map-jr-gl. Every other release is a new minor version (`1.1`), and `/1/` moves to it. To keep
one release as it is, host the zip of its GitHub release.

### MapLibre GL JS

The three elevation styles have a version for [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/) 5.16.0 or later,
with the same layers, sources and global state:

```js
new maplibregl.Map({container: 'map', style: 'https://styles.map-jr.org/1/maplibre/elevation.json'});
map.setGlobalStateProperty('color-scheme', 'dark');
```

| Path | What it is |
|---|---|
| `/1/maplibre/{elevation,elevation-zero,elevation-radar}.json` | The style, without white space. |
| `/1/maplibre/sprite.json`, `sprite.png`, `sprite@2x.json`, `sprite@2x.png` | The sprite that the three styles share: each icon and shield in the colors of the light and of the dark branch. |

Each differs from the map-jr-gl style in three things:

- **The icons are in a sprite.** Each icon with `params` becomes one image of the sprite for each set of colors that it
  can have, named by the icon and a hash of its colors (`arrow-94b3af`). The `icon-image` of a layer chooses the name
  with a `match` on the class, for each branch of `color-scheme`. The sprite has 293 images: 63 KB at 1x, 154 KB at 2x.
- **The labels use glyphs.** The fonts of the system become the Noto Sans fonts of OpenFreeMap
  (`https://tiles.openfreemap.org/fonts/`): Regular, and Bold for Semibold and Bold, and Italic for both italics. So
  the labels look less like the platform than in map-jr-gl.
- **No `map-jr:` metadata.** MapLibre has no server render and no SVG images, so `map-jr:ssr` and `map-jr:images` are
  removed.

MapLibre GL JS reads the global state `relief` of Elevation · radar from 5.16.0. With `relief` false it loads no
elevation tiles, and its attribution leaves out Mapterhorn. The OpenFreeMap styles have no MapLibre version: OpenFreeMap
serves them for MapLibre already (`https://tiles.openfreemap.org/styles/liberty`).

### From npm

The package [`@map-jr/styles`](https://www.npmjs.com/package/@map-jr/styles) has the same styles, by the same names:

```bash
pnpm add @map-jr/styles
```

```js
import style from '@map-jr/styles/elevation.json' with {type: 'json'};

createMap('map', {style});
```

The MapLibre styles are at `@map-jr/styles/maplibre/<name>.json`. Their sprite stays at `https://styles.map-jr.org/1/`:
the package does not have it.

A bundler (Vite, webpack, esbuild) takes the import as it is; Node.js needs `with {type: 'json'}`. A range such as
`^1.0.0` takes each release that does not break a map, as `/1/` does. The CDNs of npm serve the package too:
`https://cdn.jsdelivr.net/npm/@map-jr/styles@1/elevation.json`. The package has only the styles without white
space (`dist/styles/*.min.json` and `dist/maplibre/*.min.json`), the changelog, and the licences of the material in
`NOTICE.md`.

## Release

A release is a pull request that changes `"version"` in `package.json` and adds the section of that version to
[CHANGELOG.md](CHANGELOG.md). Merging it releases the version: the workflow `Release` uploads the styles to
`/<major>/`, publishes `@map-jr/styles` to npm, pushes the tag `v<version>`, and makes the release on GitHub with the
section as its text and `dist/` as a zip. Nobody pushes a tag or makes a release by hand. A release replaces the styles of its major version: `1.3.0` writes
`/1/`, and `2.0.0` writes `/2/` and leaves `/1/` as it was.

1. **Check `main`.** The workflow `build` is green for the commit to release.
2. **Choose the version.**
   - A fix that adds nothing (a color, a wrong filter, the docs of the package) increases the third number: `1.2.0` →
     `1.2.1`.
   - A change that adds to a map without breaking it (a new layer, style or global state property) increases the second
     number: `1.2.1` → `1.3.0`.
   - A change that breaks a map (a layer id renamed or removed, a global state property changed, a newer map-jr-gl
     needed) increases the first number: `1.3.0` → `2.0.0`. Its section in the changelog starts with "Breaking
     changes", which says what stopped working and what to do instead.
3. **Open the pull request of the release.** On a branch from `main`, set `"version"` in `package.json`, and add
   `## 1.3.0 (2026-11-20)` at the top of `CHANGELOG.md`, with what changed since the last release. Then:

   ```bash
   pnpm run build && pnpm run check && pnpm test && pnpm run test:package
   ```

4. **Merge it** when CI passes, and follow the workflow `Release` in the Actions tab.
5. **Check the release:**

   ```bash
   curl https://styles.map-jr.org/1/version.json
   ```

   ```bash
   npm view @map-jr/styles@1.3.0 version
   ```

   The first gives `{"version":"1.3.0","commit":"…"}`, with the commit of the merge, and the second `1.3.0`. The edge has the new styles within 5
   minutes; a browser that has the last release gets the new one within a day.

A section whose heading says `(unreleased)` is not released: the workflow does nothing for it. The workflow stops,
and uploads nothing, when the changelog has no section for the version, when `/<major>/` has the same release from
another commit or a newer release, or when npm has the version and the tag `v<version>` does not exist. A run that stopped after the upload can be run again from the Actions tab
(**Run workflow** on `main`): it does only what is left. To undo a release, release the earlier state as a newer
version. `node scripts/publish.mjs --dry-run` lists the files that a release uploads, without uploading them.

It needs, in the repository:

| Name | Kind | What it is |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Variable | The Cloudflare account of the bucket |
| `R2_BUCKET` | Variable | The name of the bucket |
| `R2_API_TOKEN` | Secret | The token value of an R2 API token with Object Read & Write on the bucket only |

The repository has no token of npm. npm trusts the workflow `Release` by its file name (`release.yml`), as a trusted
publisher in the settings of the package on npmjs.com, and adds a provenance statement to each version. Renaming the
file needs the same change there.

The script makes the S3 keys of R2 from the token, as Cloudflare documents them: the key ID is the id of the token,
and the secret is the SHA-256 of its value.

Cloudflare does not cache `.json` by default. A Cache Rule on the zone makes it: for the hostname
`styles.map-jr.org`, **Eligible for cache**, with the edge TTL from the `Cache-Control` header of the origin. With
the short edge TTL and `stale-while-revalidate`, a release reaches the edge in minutes with no purge, and a reader
does not wait while a file is fetched again.

## Build

```bash
pnpm install
```

```bash
pnpm run build
```

`dist/` is committed, so that a style has a URL. `pnpm run check` fails when `dist/` is not what the sources give;
CI runs it, and `pnpm test`. The build writes the map-jr-gl styles to `dist/styles/`, and the MapLibre styles and
their sprite to `dist/maplibre/`.

## Editing a style with Maputnik

An edit in Maputnik reaches the repository as a change to the sources, because the build writes `dist/` from them
and overwrites an edit made there.

1. Open the built style in the Maputnik of map-jr-gl:
   `https://map-jr.github.io/maputnik/?style=https://styles.map-jr.org/@main/elevation.json`.
2. Edit it, and save it with **Save** (a file such as `elevation.json`).
3. Apply it to the sources, and build:

   ```bash
   ppnpm run apply-edit ~/Downloads/elevation.json
   pnpm run build
   ```

The command builds the style from the sources in memory and compares it with the saved style, layer by layer and
property by property. It finds the style by the file name, or by the layers when the name is not the name of a
style. A second argument gives the name: `ppnpm run apply-edit saved.json elevation-radar`. For each difference it
tries the places that the value can come from, builds again, and keeps a change only when it removes differences and
adds none.

| Edit | Where it goes |
|---|---|
| A value of a layer that the source style has: a light color, a number, a filter, a layout property | `styles/src/<name>.json` |
| A new layer, a removed layer, the order of the layers | `styles/src/<name>.json` |
| The dark value of a `case` on `color-scheme` | `PAIRS` in `styles/<name>.mjs`, by the `dark\|light` pair of the source. When other layers share the pair and keep their value, the dark value goes into the source. |
| The light value of such a `case` | The source, and the pair in `PAIRS` moves to the new light value |

The command does not map a value that a module makes: the images and their colors (`useIcons`, `ICON_DARK`), the
road shields, the peak and name labels, the layers that a module adds (`place_capital`), and a value that a module
sets (the hillshade colors, the light airport colors). It does not map an edit that changes the length of a filter to
which a module adds a clause. It lists each of these with its layer and property and writes nothing for it, so that
you can change the module by hand. At the end it builds from the files again, lists each property that still differs
from the saved style, and exits with 1 when there is one. It does not edit the OpenFreeMap styles, which are copies
of their sources.

## How it is made

```
icons/upstream/*.svg   the SVG sources of the OpenFreeMap sprite (ofm_f384), one file for each icon
icons/extra.json       POI classes the sprite has no icon for: new icons from Maki glyphs, and aliases
icons/extra/*.svg      the new icons (pnpm run update-icons)
icons/custom/*.svg     icons drawn for this repository
shields/*.svg          road shield templates, written by hand
shields/shields.mjs    how each shield stretches, and the networks whose look is set by hand
shields/networks.json  the look of each road network, from OSM Americana (pnpm run update-shields)
styles/src/*.json      the source styles, which use the sprite
styles/*.mjs           one module for each style (or family): its dark palette and its fixes
styles/shared.mjs      the dark icon colors and the neutral shield plate
lib/                   the build steps
lib/maplibre.mjs       the MapLibre styles and their sprite
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

The colors and shapes come from the shield definitions of OSM Americana: `pnpm run update-shields` downloads them
and writes `shields/networks.json`. It keeps the networks of a country, state or province (about 200) and leaves out
county and city networks. A shield that Americana draws from artwork (most US states, Mexico, Korea) gets the pill or
the neutral plate here, unless `MANUAL` in `shields/shields.mjs` gives it a look.

**Global state.** The elevation styles of this repository read these properties of the global state of the map:

| Property | Values | Effect |
|---|---|---|
| `color-scheme` | `light` (default), `dark` | The branch of the style. map-jr-gl sets it from `colorScheme`. |
| `elevation-unit` | `ft` (default), `m` | The unit of the elevation in peak labels. Set it with `globalState: {'elevation-unit': 'm'}`. |
| `relief` | `true` (default), `false` | Elevation · radar: the hillshade and the labels of peaks. With `false` they are hidden, and no elevation tiles load. |
| `language` | none (default), or a language code of the tiles such as `de`, `fr`, `ja` | The language of the names, for each feature that has a name in it. Without it, a place with a name in a script other than Latin shows its Latin name and that name, and other names are English. |

`relief` switches layers with a `global-state` expression in `visibility`, which MapLibre GL JS reads from
5.16.0, and map-jr-gl from 0.9.0. An
older map-jr-gl shows the layers and loads their tiles whatever the state is.

**OpenFreeMap styles.** `styles/openfreemap.mjs` builds the five styles of OpenFreeMap with `inlineSprite`: the
images that a layer can ask for go into the style as plain SVG, and the layers are not changed, except for
`map-jr:ssr` in their metadata (below).

**Server render.** `ssr` in `lib/style.mjs` gives the layers of each style `metadata["map-jr:ssr"]`: changes for
the first view that the server renderer of map-jr-gl writes (`renderToSVG`, `renderFirstView`, the `ssr` prop of
the Vue component), which a page shows inline until the map draws. MapLibre GL JS and the map in the browser ignore
them. The first view is a placeholder, like a blurred image while the full one loads: it must be small, and it only
gives the colors and the large shapes of the place. The map draws everything else over it.

| Layers | `map-jr:ssr` | Why |
|---|---|---|
| The background, rasters, hillshade | none | |
| Land cover, land use, parks | `{"simplify": 8, "minSize": 48}` | Only the large shapes. |
| Water | `{"simplify": 6, "minSize": 24}` | |
| Borders | `{"simplify": 8, "minSize": 32}` | |
| Roads: motorways, trunk and primary roads | `{"simplify": 8, "minSize": 1, "filter": …}` | A road is many short pieces: a larger `minSize` breaks it into dashes. |
| Roads: secondary and tertiary | the same, from zoom 14 | At lower zooms they are most of the bytes. |
| Roads: minor and service | the same, from zoom 15 | |
| Names of countries, states, cities and towns | `{"filter": …}` | |
| Everything else: buildings, casings, tunnels, railways, paths, rivers drawn as lines, other labels and icons, image patterns | `{"hidden": true}` | |
| A layer below the zoom where its width or opacity can be seen (0.1 pixel, 5%) | `{"minzoom": …}` | The server does not fetch or read its tiles. (map-jr-gl 0.8.0 also wrote their paths, which draw nothing.) |

The filter of a road layer draws each class from its zoom, and the layer gets `minzoom` of the most important class
that its own filter names. The filters are written for map-jr-gl 0.9.0, which reads `["zoom"]` in a filter as the zoom
of the render. (map-jr-gl 0.8.0 reads the zoom of the tile, which is never above 14 on OpenMapTiles: with it, minor
roads do not show.)

Render the placeholder with `tileZoomOffset: 2` (map-jr-gl 0.9.0 or later): the server builds it from tiles two zooms
lower, which have fewer and longer features, and fetches fewer tiles.

| Over six views and six styles, gzip | `overrides: false` | Placeholder | Placeholder, `tileZoomOffset: 2` |
|---|---|---|---|
| All 36 renders | 2194 KB, 144 tiles | 521 KB (−76%), 144 tiles | **304 KB (−86%), 60 tiles** |
| Most views | 21 to 125 KB | 5 to 21 KB | 4 to 12 KB |
| Paris at zoom 10 | 67 to 150 KB | 31 to 42 KB | 13 to 18 KB |

The views are Manhattan at zoom 12 and 15, Oakland at 13.5, Paris at 10, the Alps at 11 and Atlanta's suburbs at 15,
800 × 500, measured with map-jr-gl at c4d5e87. A layer whose source style has `map-jr:ssr` keeps it. To render
without the changes, pass `overrides: false`; to change one layer, pass `overrides: {"<layer id>": {…}}`.

**MapLibre styles.** `maplibre` in `lib/maplibre.mjs` builds them from the built map-jr-gl style of each style that
has a global state `color-scheme`. For each `image` expression it finds the values that the image and its colors can
depend on: the labels of each `match` in it, and the names of the images, less those that the filter of the layer
leaves out. It works out the name and the colors for each value, in light and in dark, with the expressions of
MapLibre (`@maplibre/maplibre-gl-style-spec`), and writes one `match` for each branch. The build stops when an image
reads more than two properties, another global state, or the zoom. `sheet` packs the images in rows, 256 pixels
wide, and draws them at 1x and 2x with resvg. A shield keeps its `stretchX`, `stretchY` and `content`. The style is
then checked with `validateStyleMin` of MapLibre.

## Preview

`pnpm run preview` draws each style in light and dark, side by side, at the views of `test/views.json` (a range of
zoom levels and kinds of place), into `test/shots/`. Set `STATE` to try a global state: `STATE='{"elevation-unit":"m"}' node test/preview.mjs elevation chamonix`. It needs Playwright with Chromium, and the `dist/` folder of a
map-jr-gl build in `test/lib/`. Pass a style and a view to draw one: `node test/preview.mjs elevation-radar rockies`.

`test/maplibre.html` shows a MapLibre style in MapLibre GL JS, with the sprite of the checkout. Serve the repository
root (`python3 -m http.server 8123`) and open
`http://localhost:8123/test/maplibre.html?style=elevation&scheme=dark&view=11/39.74/-105`. `state.relief=false` sets
a global state, `pitch=60` tilts the map, and `v=6.19.0` picks another version of MapLibre GL JS. The bar at the top
lists the images that the sprite does not have.

## Sources and licences

The code and the shield templates of this repository have the MIT licence (`LICENSE`). The icons, the source styles
and the network table come from OpenFreeMap, OSM Liberty, OpenMapTiles, Maki and OSM Americana and keep their own terms: see
`NOTICE.md`. The idea of a shape and colors for each route network follows
[Trailblazer](https://github.com/osm-americana/trailblazer).
