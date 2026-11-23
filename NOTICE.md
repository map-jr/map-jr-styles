# Third-party material

The MIT licence in `LICENSE` covers what is written for this repository: the build (`build.mjs`, `lib/`, `scripts/`,
`test/`), the style modules (`styles/*.mjs`) and the shield templates (`shields/*.svg`, `shields/shields.mjs`).
The material below comes from other projects and keeps its own terms. `dist/` is built from both.

| Material | From | Terms |
|---|---|---|
| `icons/upstream/*.svg` | [openfreemap-styles](https://github.com/hyperknot/openfreemap-styles), the liberty and bright icon sets | `icons/upstream/LICENSE-liberty.md`, `icons/upstream/LICENSE-bright.md` |
| `icons/extra/*.svg` | Glyphs of [Maki](https://github.com/mapbox/maki), on the disc of the sprite icons | CC0 1.0: `icons/extra/LICENSE-maki.txt` |
| `styles/src/openfreemap/*.json` | [openfreemap-styles](https://github.com/hyperknot/openfreemap-styles), at the commit in `styles/src/openfreemap/COMMIT` | BSD 3-Clause for the style code and CC-BY 4.0 for the design: `styles/src/openfreemap/LICENSE*.md` |
| `styles/src/elevation.json` | Based on [OSM Liberty](https://github.com/maputnik/osm-liberty), with the tiles and the sprite of OpenFreeMap | BSD 3-Clause for the style code and CC-BY 4.0 for the design, as `styles/src/openfreemap/LICENSE-liberty.md` |
| `styles/src/elevation-radar.json` | Based on a style of the OpenMapTiles family; the closest is [MapTiler Basic](https://github.com/openmaptiles/maptiler-basic-gl-style) | BSD 3-Clause for the style code and CC-BY 4.0 for the design |
| `data/natural-earth.pmtiles` | Countries and states and provinces at 1:50m of [Natural Earth](https://www.naturalearthdata.com/) 5.1.2, made into vector tiles (zoom 0 to 6) by `scripts/natural-earth-pmtiles.mjs` of [map-jr-gl](https://github.com/map-jr/map-jr-gl) | Public domain |
| `shields/networks.json` | Made from the shield definitions of [OSM Americana](https://github.com/osm-americana/openstreetmap-americana) (`https://americanamap.org/shields.json`) | CC0 1.0 |

Map data shown with the styles: OpenFreeMap, © OpenMapTiles, data from OpenStreetMap; terrain © Mapterhorn.
