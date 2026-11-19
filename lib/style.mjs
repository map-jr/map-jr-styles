// Helpers that turn a sprite style into a map-jr-gl style with SVG template images.
import {imageValue} from './icons.mjs';
import {SHAPES, NETWORKS} from '../shields/shields.mjs';
import {readFileSync} from 'node:fs';

export const DARK = ['==', ['global-state', 'color-scheme'], 'dark'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** A value for each color scheme, in the form the source styles use. */
export const scheme = (dark, light) => same(dark, light) ? light : ['case', DARK, dark, light];
const ROLES = ['color', 'background', 'border'];

/**
 * Replaces the sprite of a style by template images in `metadata["map-jr:images"]`. Each `icon-image` becomes an
 * `image` expression whose `params` give the slots the colors of the sprite icon, and `iconDark` gives the dark ones.
 */
export function useIcons(style, icons, iconDark, plate) {
    const {template: T, defaults: D, aliasOf = {}} = icons, used = new Set();
    const dark = (role, light) => {
        const v = iconDark[role]?.[light];
        if (v === undefined) throw new Error(`icons: no dark ${role} for ${light}. Add it to the palette of the style.`);
        return v;
    };
    const params = name => Object.fromEntries(ROLES.filter(r => r in D[name]).map(r => [r, scheme(name.startsWith('default_') ? plate[r] : dark(r, D[name][r]), D[name][r])]));
    // `{class}_11`: one `match` on the class for each slot, so that each icon keeps its own colors.
    const byClass = classes => {
        const P = {};
        for (const r of ROLES) {
            const groups = new Map();
            for (const c of classes) { const v = D[c + '_11'][r]; if (v !== undefined) groups.set(v, [...(groups.get(v) ?? []), c]); }
            if (!groups.size) continue;
            const values = [...groups.keys()].sort((a, b) => groups.get(b).length - groups.get(a).length);
            const match = of => values.length === 1 ? of(values[0]) : ['match', ['get', 'class'], ...values.slice(1).flatMap(v => [groups.get(v).length > 1 ? [...groups.get(v)].sort() : groups.get(v)[0], of(v)]), of(values[0])];
            P[r] = scheme(match(v => dark(r, v)), match(v => v));
        }
        // A class that is an alias is drawn from the image of its target, so that no image is in the style two times.
        const targets = new Map();
        for (const c of classes) { const t = aliasOf[c + '_11']?.slice(0, -3); if (t) targets.set(t, [...(targets.get(t) ?? []), c]); }
        const name = targets.size ? ['match', ['get', 'class'], ...[...targets].flatMap(([t, cs]) => [cs.length > 1 ? cs : cs[0], t]), ['get', 'class']] : ['get', 'class'];
        return ['image', ['concat', name, '_11'], {params: P}];
    };
    const all11 = Object.keys(T).filter(k => k.endsWith('_11')).map(k => k.slice(0, -3)).sort();
    const classesOf = layer => {
        let found;
        const not = new Set();
        const walk = f => {
            if (!Array.isArray(f)) return;
            if (f[1] === 'class' && (f[0] === 'in' || f[0] === '==')) found ??= f.slice(2);
            if (f[1] === 'class' && (f[0] === '!in' || f[0] === '!=')) f.slice(2).forEach(c => not.add(c));
            f.forEach(walk);
        };
        walk(layer.filter);
        return (found ? found.filter(c => T[c + '_11']) : all11).filter(c => !not.has(c));
    };
    const convert = (v, layer) => {
        if (v && typeof v === 'object' && !Array.isArray(v) && v.stops) return ['step', ['zoom'], convert(v.stops[0][1], layer), ...v.stops.slice(1).flatMap(([z, x]) => [z, convert(x, layer)])];
        if (v === '') return '';
        if (v === '{class}_11') { const cs = classesOf(layer); cs.forEach(c => used.add(aliasOf[c + '_11'] ?? c + '_11')); return byClass(cs); }
        if (v === 'default_{ref_length}') { for (let i = 1; i <= 6; i++) used.add('default_' + i); return ['image', ['concat', 'default_', ['to-string', ['get', 'ref_length']]], {params: params('default_1')}]; }
        if (typeof v !== 'string' || v.includes('{') || !T[v]) throw new Error(`icons: the layer "${layer.id}" uses the image ${JSON.stringify(v)}, which the build cannot convert.`);
        used.add(v);
        return ['image', v, {params: params(v)}];
    };
    for (const layer of style.layers) if (layer.layout?.['icon-image'] !== undefined) layer.layout['icon-image'] = convert(layer.layout['icon-image'], layer);
    const images = (style.metadata ??= {})['map-jr:images'] ??= {};
    for (const name of [...used].sort()) images[name] = imageValue(T[name]);
    delete style.sprite;
}

/**
 * Gives the dark branch of each `['case', DARK, dark, light]` a new value. `pairs` has `"dark|light"` of the source
 * style as key; `olds` is used for a dark value that has no pair. A pair that the style does not have is an error.
 */
export function retune(style, pairs, olds = {}) {
    const seen = new Set();
    const walk = o => {
        if (Array.isArray(o)) {
            if (o[0] === 'case' && o.length === 4 && same(o[1], DARK) && (typeof o[2] !== 'object' || o[2] === null)) {
                const key = `${o[2]}|${o[3]}`; seen.add(key);
                const v = pairs[key] ?? olds[o[2]];
                if (v !== undefined) o[2] = v;
                return;
            }
            o.forEach(walk);
        } else if (o && typeof o === 'object') Object.values(o).forEach(walk);
    };
    for (const l of style.layers) { walk(l.paint); walk(l.layout); }
    const missing = Object.keys(pairs).filter(k => !seen.has(k));
    if (missing.length) throw new Error(`palette: the style has no color pair ${missing.join('; ')}`);
}

/**
 * Road shields: the shield layer gets a template that stretches around the number, with the shape and the colors of
 * the network of the route. `plate` is the neutral plate of the style: `{light: {background, border, text}, dark: {...}}`.
 */
export function useShields(style, layerId, plate, {color = true} = {}) {
    const layer = style.layers.find(l => l.id === layerId);
    if (!layer) throw new Error(`shields: the style has no layer "${layerId}".`);
    const nets = color ? NETWORKS : NETWORKS.map(n => ({...n, plate: true}));
    const network = ['coalesce', ['get', 'route_1_network'], ''];
    const one = n => n.networks.length > 1 ? n.networks : n.networks[0];
    const pick = (of, fallback) => {
        // (Networks with the same value share one arm of the `match`.)
        const groups = new Map();
        for (const n of nets) { const v = of(n); if (v === undefined || same(v, fallback)) continue; const k = JSON.stringify(v); groups.set(k, {v, list: [...(groups.get(k)?.list ?? []), ...n.networks]}); }
        return groups.size ? ['match', network, ...[...groups.values()].flatMap(g => [g.list.length > 1 ? g.list : g.list[0], g.v]), fallback] : fallback;
    };
    const slot = (key, plateKey) => pick(n => n.plate ? undefined : n[key] ?? n.background, scheme(plate.dark[plateKey], plate.light[plateKey]));
    const shapes = [...new Set(nets.map(n => n.shape)), 'rect'];
    const images = (style.metadata ??= {})['map-jr:images'] ??= {};
    for (const s of new Set(shapes)) images['shield_' + s] = {image: readFileSync(new URL(`../shields/${s}.svg`, import.meta.url), 'utf8').trim(), ...SHAPES[s]};
    for (const name of Object.keys(images)) if (/^default_\d$/.test(name)) delete images[name];
    layer.layout['icon-image'] = ['image', pick(n => 'shield_' + n.shape, 'shield_rect'), {params: {background: slot('background', 'background'), border: slot('border', 'border'), color: slot('color', 'background')}}];
    Object.assign(layer.layout, {'icon-text-fit': 'both', 'icon-size': 1});
    // The number of the route the shield stands for, when the road has one; else the reference of the road.
    layer.layout['text-field'] = ['coalesce', ['get', 'route_1_ref'], ['get', 'ref']];
    // A number of three characters and more is set smaller, so that its shield does not get much wider than the others.
    const size = layer.layout['text-size'];
    if (typeof size !== 'number') throw new Error(`shields: the text size of "${layerId}" is not one number.`);
    layer.layout['text-size'] = ['case', ['>=', ['length', layer.layout['text-field']], 3], size - 1.5, size];
    layer.layout['text-letter-spacing'] = 0;
    (layer.paint ??= {})['text-color'] = pick(n => n.plate ? undefined : n.text, scheme(plate.dark.text, plate.light.text));
}

/**
 * Peak labels. The elevation is in feet or metres by the global state property `elevation-unit` (`'ft'` or `'m'`),
 * a peak with no elevation has no "(0 ft)", and the icon has the color of the text.
 */
export function peaks(style, unit = 'ft') {
    (style.state ??= {})['elevation-unit'] = {default: unit};
    const text = (property, suffix) => ['case', ['>', ['to-number', ['get', property], 0], 0], ['concat', ['get', 'name_int'], ' (', ['number-format', ['get', property], {}], suffix], ['get', 'name_int']];
    for (const l of style.layers) if (l.id.startsWith('poi_peak_')) {
        if (l.layout['text-field']?.[0] !== 'concat') throw new Error(`peaks: the text of "${l.id}" is not the expected concat.`);
        l.layout['text-field'] = ['case', ['==', ['global-state', 'elevation-unit'], 'm'], text('ele', ' m)'), text('ele_ft', ' ft)')];
        const params = l.layout['icon-image']?.[2]?.params;
        if (!params?.color || !l.paint?.['text-color']) throw new Error(`peaks: "${l.id}" has no icon color or no text color.`);
        params.color = structuredClone(l.paint['text-color']);
    }
}

/**
 * A style of another party, as it is: the images its layers can ask for go into `metadata["map-jr:images"]` as plain
 * SVG, with the colors of the sprite, and `sprite` is removed. Returns the image names the sprite does not have.
 */
export function inlineSprite(style, icons) {
    // The values a property can have, as far as image names go: a number, a network ("us-interstate"), or a class.
    const VALUES = {ref_length: '\\d+', network: '[a-z]+-[a-z-]+'}, WILD = '[a-z][a-z_]*';
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = e => {
        if (typeof e === 'string') return [e.replace(/[^{}]+(?=\{|$)|\{([^}]+)\}/g, (text, token) => token ? VALUES[token] ?? WILD : esc(text))];
        if (!Array.isArray(e)) return e && typeof e === 'object' && e.stops ? e.stops.flatMap(s => patterns(s[1])) : [];
        const [op, ...a] = e;
        if (op === 'concat') return a.map(patterns).reduce((all, part) => all.flatMap(x => part.map(y => x + y)), ['']);
        if (op === 'match') return [...a.slice(1, -1).filter((_, i) => i % 2), a.at(-1)].flatMap(patterns);
        if (op === 'case') return [...a.slice(0, -1).filter((_, i) => i % 2), a.at(-1)].flatMap(patterns);
        if (op === 'step') return a.slice(1).filter((_, i) => i % 2 === 0).flatMap(patterns);
        if (op === 'coalesce') return a.flatMap(patterns);
        if (op === 'image' || op === 'to-string') return patterns(a[0]);
        return [op === 'get' ? VALUES[a[0]] ?? WILD : WILD];
    };
    const all = new Set(), missing = new Set();
    const walk = o => {
        if (Array.isArray(o)) o.forEach(walk);
        else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
            if (k === 'icon-image' || k.endsWith('-pattern')) for (const p of patterns(v)) { if (p) all.add(p); if (p && !/[\\[]/.test(p) && !icons.min[p]) missing.add(p); }
            else walk(v);
        }
    };
    walk(style.layers);
    const names = new RegExp(`^(?:${[...all].join('|')})$`), images = (style.metadata ??= {})['map-jr:images'] ??= {};
    // (Not the icons drawn for the styles of this repository, which no layer of another style asks for.)
    for (const name of Object.keys(icons.min).sort()) if (names.test(name) && icons.folder?.[name] !== 'icons/custom') images[name] = imageValue(icons.min[name]);
    delete style.sprite;
    return [...missing];
}
/**
 * The names of the labels. Without a language, a feature with a name in a script other than Latin has its Latin name
 * and that name (as the OpenFreeMap styles), and another feature its English name; the names of countries, states
 * and continents are English. The global state property `language` (a code of the tiles, as `de` or `ja`; the
 * default is none) asks for the names in that language, for each feature that has one.
 */
export function names(style) {
    (style.state ??= {}).language = {default: ''};
    const inLanguage = rest => ['coalesce', ['get', ['concat', 'name:', ['global-state', 'language']]], rest];
    const plain = ['coalesce', ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];
    const twoScripts = between => ['case', ['all', ['has', 'name:nonlatin'], ['has', 'name:latin']], ['concat', ['get', 'name:latin'], between, ['get', 'name:nonlatin']], plain];
    for (const l of style.layers) {
        const field = l.layout?.['text-field'], between = l.layout?.['symbol-placement'] === 'line' ? ' ' : '\n';
        if (l.type !== 'symbol' || typeof field !== 'string') continue;
        if (field === '{name:latin}' || /^(country|state|continent)/.test(l.id) && field === '{name_en}') l.layout['text-field'] = inLanguage(plain);
        else if (field === '{name}' || field === '{name_en}' || /^\{name:latin\}\s\{name:nonlatin\}$/.test(field)) l.layout['text-field'] = inLanguage(twoScripts(between));
    }
}

export const layer = (style, id) => { const l = style.layers.find(l => l.id === id); if (!l) throw new Error(`the style has no layer "${id}".`); return l; };

const SSR = 'map-jr:ssr', AREAS = ['landcover', 'landuse', 'park'];
/** The properties that make a layer draw nothing while one of them is below its limit (a width in pixels, an opacity). */
const NOTHING = {line: {'line-width': 0.1, 'line-opacity': 0.05}, fill: {'fill-opacity': 0.05}, 'fill-extrusion': {'fill-extrusion-opacity': 0.05}, raster: {'raster-opacity': 0.05}};

/**
 * The zoom from which a value that depends on the zoom reaches `limit`, or 0 when it does from the start; undefined
 * when the build cannot tell (a value of the data, or a curve that falls again). It reads `interpolate` and `step` on
 * `["zoom"]`, the `stops` of the older functions, and a `case` on the color scheme (the lower of its branches).
 */
export function reaches(v, limit) {
    if (typeof v === 'number') return v >= limit ? 0 : Infinity;
    let stops, base = 1, step = false;
    if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.stops) && v.stops.every(s => typeof s[0] === 'number')) ({stops} = v, base = v.base ?? 1);
    else if (Array.isArray(v) && v[0] === 'case' && v.length === 4) { const a = reaches(v[2], limit), b = reaches(v[3], limit); return a === undefined || b === undefined ? undefined : Math.min(a, b); }
    else if (Array.isArray(v) && v[0] === 'interpolate' && v[2]?.[0] === 'zoom' && ['linear', 'exponential'].includes(v[1][0])) { base = v[1][0] === 'linear' ? 1 : v[1][1]; stops = []; for (let i = 3; i < v.length; i += 2) stops.push([v[i], v[i + 1]]); }
    else if (Array.isArray(v) && v[0] === 'step' && v[1]?.[0] === 'zoom') { step = true; stops = [[-Infinity, v[2]]]; for (let i = 3; i < v.length; i += 2) stops.push([v[i], v[i + 1]]); }
    else return;
    if (!stops.every(([z, x]) => typeof z === 'number' && typeof x === 'number')) return;
    // (Only a curve that does not fall below the limit again, once it reaches it.)
    const first = stops.findIndex(([, x]) => x >= limit);
    if (first === -1) return Infinity;
    if (stops.slice(first).some(([, x]) => x < limit)) return;
    if (first === 0) return 0;
    if (step) return stops[first][0];
    const [[z0, a], [z1, b]] = [stops[first - 1], stops[first]], f = (limit - a) / (b - a);
    // (The zoom where the curve between the two stops reaches the limit: for `exponential`, t = (base^(z-z0) - 1) / (base^(z1-z0) - 1).)
    return base === 1 ? z0 + f * (z1 - z0) : z0 + Math.log(1 + f * (base ** (z1 - z0) - 1)) / Math.log(base);
}

/**
 * Changes for the server render of map-jr-gl, in `metadata["map-jr:ssr"]` of the layers: the SVG of the first view
 * that a page shows until the map draws (see "Server render" in the README). A layer that has `map-jr:ssr` in its
 * source keeps it.
 */
export function ssr(style) {
    for (const l of style.layers) {
        if (l.metadata?.[SSR]) continue;
        const v = ssrOf(l);
        if (v?.hidden) { (l.metadata ??= {})[SSR] = {hidden: true}; continue; }
        // The zoom below which the layer draws nothing: the server leaves out its features there.
        const limits = Object.entries(NOTHING[l.type] ?? {}).map(([k, limit]) => reaches(l.paint?.[k] ?? 1, limit));
        const from = Math.ceil(Math.max(0, ...limits.filter(z => z !== undefined)) * 100) / 100;
        if (from === Infinity) { (l.metadata ??= {})[SSR] = {hidden: true}; continue; }
        const {minzoom, ...o} = v ?? {}, z = Math.max(from, minzoom ?? 0);
        if (z > (l.minzoom ?? 0)) o.minzoom = z;
        if (Object.keys(o).length) (l.metadata ??= {})[SSR] = o;
    }
}
/**
 * Road classes by the zoom of the render from which the server draws them: major roads at each zoom, then the others.
 * (In a filter, `["zoom"]` is the zoom of the render as a whole number, also with `tileZoomOffset` and past the last
 * zoom of the tiles.) A road keeps its short pieces (`minSize` 1), or it shows gaps; leaving out classes is what makes
 * the SVG small.
 */
const ROADS = {motorway: 0, trunk: 0, primary: 0, secondary: 14, tertiary: 14, minor: 15, service: 15, minor_road: 15, street: 15};
/** The names that the server writes: those of countries, states, cities and towns. */
const PLACES = ['match', ['get', 'class'], ['continent', 'country', 'state', 'city', 'town'], true, false];
/**
 * The server filter of a road layer: each class from its zoom. A class that is not in `ROADS`, such as a path in a
 * layer of many classes, is left out.
 */
const byClass = ['any', ...Object.entries(Object.groupBy(Object.keys(ROADS), c => ROADS[c])).map(([z, classes]) => {
    const match = ['match', ['get', 'class'], classes, true, false];
    return +z ? ['all', ['>=', ['zoom'], +z], match] : match;
})];
const strings = v => Array.isArray(v) ? v.flatMap(strings) : typeof v === 'string' ? [v] : [];

/**
 * The changes of one layer, apart from the zoom where it draws nothing. The server render is a placeholder, like a
 * blurred image while the full one loads: it has to be small, and it only gives the colors and the large shapes of the
 * place. It keeps the background, the large areas, the water, the main roads (the others from a closer zoom), the
 * borders, and the names of countries, states, cities and towns. It leaves out everything else: buildings, casings,
 * tunnels, railways, rivers drawn as lines, and the other labels. Its shapes lose their small pieces and vertices.
 */
function ssrOf(l) {
    const sl = l['source-layer'], id = l.id, t = l.type;
    if (t === 'background' || t === 'raster' || t === 'hillshade') return;
    // (Image patterns: the server does not draw them.)
    if (l.paint?.['fill-pattern'] !== undefined || l.paint?.['background-pattern'] !== undefined) return {hidden: true};
    if (t === 'symbol') return sl === 'place' ? {filter: PLACES} : {hidden: true};
    if (t === 'fill' && AREAS.includes(sl)) return {simplify: 8, minSize: 48};
    if (t === 'fill' && sl === 'water') return {simplify: 6, minSize: 24};
    if (t === 'line' && sl === 'boundary') return {simplify: 8, minSize: 32};
    if (t !== 'line' || sl !== 'transportation' || /casing|tunnel/.test(id)) return {hidden: true};
    // (The classes of roads that the filter of the layer names, and the zoom of the most important of them.)
    const words = strings(l.filter), zooms = words.filter(w => w in ROADS).map(w => ROADS[w]);
    if (!zooms.length || words.includes('rail') || words.includes('transit')) return {hidden: true};
    return {simplify: 8, minSize: 1, minzoom: Math.min(...zooms), filter: byClass};
}
