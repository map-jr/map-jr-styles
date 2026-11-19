// "Elevation · color": a full-color terrain map. Dark is the same map under bright moonlight.
import {useIcons, useShields, retune, scheme, peaks, layer, names, ssr} from '../lib/style.mjs';
import {ICON_DARK, PLATE} from './shared.mjs';

export const source = 'styles/src/elevation-color.json';

// New dark values, by "dark|light" of the source style.
export const PAIRS = {
    
    '#18252d|rgba(255, 250, 248, 1)':'#3b5247',
    '#0b2638|rgba(153, 213, 255, 1)':'#3d74a3',
    '#80b7d1|#5d60be':'#c2c9ff',
    '#203b35|rgba(148, 228, 93, 1)':'#4fb35a','#203b35|rgba(143, 221, 90, 1)':'#5cbd66',
    '#203b35|rgba(212, 240, 183, 1)':'#4fa468','#203b35|rgba(95, 208, 100, 1)':'#6cc884',
    '#203b35|rgba(227, 239, 210, 1)':'#5aaa78','#203b35|rgba(206, 235, 173, 1)':'#4f9068',
    '#413e32|rgba(239, 230, 179, 0.4)':'rgba(226, 208, 132, 0.16)',
    '#46323e|rgba(246, 197, 227, 0.2)':'rgba(234, 150, 200, 0.13)',
    '#494338|rgba(247, 239, 195, 0.3)':'rgba(232, 214, 150, 0.18)',
    '#617c87|rgba(245, 245, 245, 1)':'#b9cad1',
    '#536570|rgba(229, 228, 224, 1)':'#3e4d57','#536570|#f0ede9':'#5a6a74',
    '#3c4a54|rgba(242, 239, 232, 1)':'#465661','#3c4a54|rgba(228, 221, 206, 1)':'#4d5d68',
    '#3c4a54|hsl(35, 6%, 79%)':'#586873','#3c4a54|hsla(35, 6%, 79%, 0.32)':'rgba(88, 104, 115, 0.32)',
    '#c6a377|rgba(175, 175, 182, 1)':'#c2cacf','#c6a377|rgba(209, 209, 210, 1)':'#c2cacf',
    '#c6a377|rgba(190, 190, 192, 1)':'#a9b4bb','#c6a377|rgba(197, 197, 201, 1)':'#aeb9bf',
    '#c6a377|rgba(198, 198, 200, 1)':'#a3afb6','#c6a377|rgba(201, 201, 201, 1)':'#98a5ad',
    '#657783|rgba(215, 215, 218, 1)':'#84949d','#657783|rgba(211, 211, 212, 1)':'#84949d','#657783|#fff4c6':'#7a8a94',
    '#657783|rgba(153, 153, 153, 1)':'#909ea7','#657783|rgba(209, 209, 210, 1)':'#84949d','#657783|#fea':'#909ea7',
    '#657783|#fff':'#66767f','#657783|hsl(0, 0%, 100%)':'#72818b',
    '#617c87|#fff':'#5c6b75','#617c87|#cfcdca':'#27343c',
    '#657783|#bbb':'#7c8b95',
    '#c0cdd0|#4898ff':'#8fc0ff',
    '#c0cdd0|rgba(161, 114, 114, 1)':'#e0b9b9',
    '#e4e9e9|rgba(144, 96, 96, 1)':'#dbb0b0','#e4e9e9|rgba(165, 121, 121, 1)':'#e0b9b9',
    '#e4e9e9|#633':'#e6c8c8',
    '#c0cdd0|#666':'#bcc7cb','#c0cdd0|#765':'#d0c6bb',
    '#dfbe92|#666':'#c3ccd0','#dfbe92|rgba(165, 71, 8, 1)':'#f6b071',
    '#c0cdd0|#333':'#e1e8ea','#c0cdd0|#444':'#e1e8ea',
    '#070f19|hsl(39, 21%, 33%)':'#15231d',
};
// Dark values that have no pair above.
const OLD = {'#152029': '#27343c', '#17232c': '#22303a', '#82929c': '#9eabb3', '#e4e9e9': '#eef2f2'};

const FURNITURE = ['bollard', 'gate', 'lift_gate', 'cycle_barrier', 'stile', 'sally_port', 'toll_booth', 'border_control', 'bicycle_parking', 'motorcycle_parking'];

export function build(style, icons) {
    // The POI class of a station is `railway`: the source style asks for `rail`, which the tiles never have.
    const transit = layer(style, 'poi_transit');
    transit.filter = ['all', ['in', 'class', 'bus', 'railway', 'airport']];
    // Street furniture and parking for two wheels are not worth a label.
    for (const id of ['poi_z16', 'poi_z15', 'poi_z14']) layer(style, id).filter.push(['!in', 'class', ...FURNITURE]);
    // The capital of a country: a layer above the other cities, with a ringed dot in place of the dot.
    const city = layer(style, 'place_city_rank_0_3'), capital = structuredClone(city);
    Object.assign(capital, {id: 'place_capital', filter: ['all', ['==', 'class', 'city'], ['==', 'capital', 2]]});
    capital.layout['icon-image'] = {stops: [[0, 'dot_capital'], [8, '']]};
    for (const id of ['place_city_rank_0_3', 'place_city_rank_4+']) layer(style, id).filter.push(['!=', 'capital', 2]);
    style.layers.splice(style.layers.indexOf(city) + 1, 0, capital);

    useIcons(style, icons, ICON_DARK, PLATE.dark);
    names(style);

    // Stations from zoom 12; bus and tram stops only when close in.
    const local = structuredClone(transit);
    Object.assign(local, {id: 'poi_transit_local', minzoom: 15, filter: ['all', ['any', ['==', 'class', 'bus'], ['all', ['==', 'class', 'railway'], ['==', 'subclass', 'tram_stop']]]]});
    Object.assign(transit, {minzoom: 12, filter: ['all', ['==', 'class', 'railway'], ['!=', 'subclass', 'tram_stop']]});
    style.layers.splice(style.layers.indexOf(transit), 0, local);
    // A hidden layer whose zoom range ends before its own color stops begin.
    style.layers = style.layers.filter(l => l.id !== 'landuse_residential');
    peaks(style);

    // As OpenFreeMap did in its version of OSM Liberty: no boundary lines across the sea, and a disputed border
    // of a country as a line of its own, with short dashes. (Before `retune`, so that the new layer gets its dark color.)
    const border = layer(style, 'boundary_2_z5-'), disputed = structuredClone(border);
    Object.assign(disputed, {id: 'boundary_disputed', minzoom: layer(style, 'boundary_2_z0-4').minzoom, filter: ['all', ['==', 'admin_level', 2], ['==', 'disputed', 1], ['!=', 'maritime', 1]]});
    disputed.paint['line-dasharray'] = [1, 2];
    for (const id of ['boundary_3', 'boundary_2_z0-4', 'boundary_2_z5-']) layer(style, id).filter.push(['!=', 'maritime', 1]);
    for (const id of ['boundary_2_z0-4', 'boundary_2_z5-']) layer(style, id).filter.push(['!=', 'disputed', 1]);
    style.layers.splice(style.layers.indexOf(border) + 1, 0, disputed);

    retune(style, PAIRS, OLD);

    const relief = layer(style, 'natural_earth').paint;
    Object.assign(relief, {'raster-saturation': scheme(0.35, 0), 'raster-brightness-max': scheme(0.66, 1), 'raster-brightness-min': scheme(0.06, 0)});
    // The default highlight is white, which embosses every ridge on a dark map; and shadows have less room there,
    // so the dark branch leans harder on the relief.
    Object.assign(layer(style, 'terrain-rgb-terrarium').paint, {
        'hillshade-highlight-color': scheme('#9cb5a6', '#FFFFFF'), 'hillshade-accent-color': scheme('#10191f', '#000000'),
        'hillshade-exaggeration': ['interpolate', ['linear'], ['zoom'], 10, scheme(0.4, 0.25), 12, scheme(0.22, 0.1), 16, scheme(0.16, 0.08)],
    });
    // Light: airports were the same tone as the ground.
    layer(style, 'aeroway_fill').paint['fill-color'][3] = 'rgba(222, 220, 213, 1)';
    for (const id of ['aeroway_runway', 'aeroway_taxiway']) layer(style, id).paint['line-color'][3] = '#d3d0c9';

    useShields(style, 'road_shield', PLATE);
    ssr(style);
    delete style.name;
}
