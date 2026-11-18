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

The two elevation styles have no `glyphs`: map-jr-gl draws their labels with the fonts of the browser, and makes no
requests for fonts. Each `text-font` is a stack of the fonts of the system, such as
`["system-ui Semibold", "Segoe UI Semibold", "Roboto Medium", "sans-serif"]`: SF Pro on Apple systems, Segoe UI on
Windows, Roboto on Android. The first name gives the weight and the style (Regular, Semibold, Bold, Italic, Semibold
Italic). This needs a map-jr-gl with commit `bd4d4ea` (a `text-font` stack as a CSS family list, with `system-ui`
unquoted); an older one draws the labels in the `fontFamily` of the map. To give every reader the same font, pass the
font files in the `fonts` option of map-jr-gl. MapLibre GL JS does not load a style
with text and no `glyphs`: add a `glyphs` URL to use these two styles there. The OpenFreeMap styles keep the glyphs
of OpenFreeMap.

## Use

The styles are at `https://styles.map-jr.org`, by major version:

```js
createMap('map', {style: 'https://styles.map-jr.org/1/elevation-color.json'});
```

| Path | What it gives | Cached |
|---|---|---|
| `/1/<name>.json` | The latest release of version 1, without white space. It takes each change that does not break a map. | A day in the browser, then up to a week more while it is fetched again in the background; 5 minutes at the edge |
| `/1/version.json` | `{version, commit}` of the folder | As its folder |

A new major version (`/2/`) breaks a map: a layer id is renamed or removed, a global state property changes, or the
styles need a newer map-jr-gl. Every other release is a new minor version (`1.1`), and `/1/` moves to it. To keep
one release as it is, host the zip of its GitHub release.

## Release

A release is a pull request that changes `"version"` in `package.json` and adds the section of that version to
[CHANGELOG.md](CHANGELOG.md). Merging it releases the version: the workflow `Release` uploads the styles to
`/<major>/`, pushes the tag `v<version>`, and makes the release on GitHub with the section as its text and `dist/` as a
zip. Nobody pushes a tag or makes a release by hand. A release replaces the styles of its major version: `1.3.0` writes
`/1/`, and `2.0.0` writes `/2/` and leaves `/1/` as it was.

1. **Check `main`.** The workflow `build` is green for the commit to release.
2. **Choose the version.** The third number is always 0.
   - A change that does not break a map (a color, a new layer, a fix) increases the second number: `1.2.0` → `1.3.0`.
   - A change that breaks a map (a layer id renamed or removed, a global state property changed, a newer map-jr-gl
     needed) increases the first number: `1.3.0` → `2.0.0`. Its section in the changelog starts with "Breaking
     changes", which says what stopped working and what to do instead.
3. **Open the pull request of the release.** On a branch from `main`, set `"version"` in `package.json`, and add
   `## 1.3.0 (2026-11-20)` at the top of `CHANGELOG.md`, with what changed since the last release. Then:

   ```bash
   pnpm run build && pnpm run check && pnpm test
   ```

4. **Merge it** when CI passes, and follow the workflow `Release` in the Actions tab.
5. **Check the release:**

   ```bash
   curl https://styles.map-jr.org/1/version.json
   ```

   It gives `{"version":"1.3","commit":"…"}`, with the commit of the merge. The edge has the new styles within 5
   minutes; a browser that has the last release gets the new one within a day.

A section whose heading says `(unreleased)` is not released: the workflow does nothing for it. The workflow stops,
and uploads nothing, when the changelog has no section for the version, or when `/<major>/` has the same release from
another commit or a newer release. A run that stopped after the upload can be run again from the Actions tab
(**Run workflow** on `main`): it does only what is left. To undo a release, release the earlier state as a newer
version. `node scripts/publish.mjs --dry-run` lists the files that a release uploads, without uploading them.

It needs, in the repository:

| Name | Kind | What it is |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Variable | The Cloudflare account of the bucket |
| `R2_BUCKET` | Variable | The name of the bucket |
| `R2_API_TOKEN` | Secret | The token value of an R2 API token with Object Read & Write on the bucket only |

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
CI runs it, and `pnpm test`.

## Editing a style with Maputnik

An edit in Maputnik reaches the repository as a change to the sources, because the build writes `dist/` from them
and overwrites an edit made there.

1. Open the built style in the Maputnik of map-jr-gl:
   `https://map-jr.github.io/maputnik/?style=https://styles.map-jr.org/@main/elevation-color.json`.
2. Edit it, and save it with **Save** (a file such as `elevation-color.json`).
3. Apply it to the sources, and build:

   ```bash
   ppnpm run apply-edit ~/Downloads/elevation-color.json
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

**Global state.** The two styles of this repository read three properties of the global state of the map:

| Property | Values | Effect |
|---|---|---|
| `color-scheme` | `light` (default), `dark` | The branch of the style. map-jr-gl sets it from `colorScheme`. |
| `elevation-unit` | `ft` (default), `m` | The unit of the elevation in peak labels. Set it with `globalState: {'elevation-unit': 'm'}`. |
| `language` | none (default), or a language code of the tiles such as `de`, `fr`, `ja` | The language of the names, for each feature that has a name in it. Without it, a place with a name in a script other than Latin shows its Latin name and that name, and other names are English. |

**OpenFreeMap styles.** `styles/openfreemap.mjs` builds the five styles of OpenFreeMap with `inlineSprite`: the
images that a layer can ask for go into the style as plain SVG, and the layers are not changed.

## Preview

`pnpm run preview` draws each style in light and dark, side by side, at the views of `test/views.json` (a range of
zoom levels and kinds of place), into `test/shots/`. Set `STATE` to try a global state: `STATE='{"elevation-unit":"m"}' node test/preview.mjs elevation-color chamonix`. It needs Playwright with Chromium, and the `dist/` folder of a
map-jr-gl build in `test/lib/`. Pass a style and a view to draw one: `node test/preview.mjs elevation-radar rockies`.

## Sources and licences

The code and the shield templates of this repository have the MIT licence (`LICENSE`). The icons, the source styles
and the network table come from OpenFreeMap, OSM Liberty, OpenMapTiles, Maki and OSM Americana and keep their own terms: see
`NOTICE.md`. The idea of a shape and colors for each route network follows
[Trailblazer](https://github.com/osm-americana/trailblazer).
