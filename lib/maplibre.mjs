// Turns a built map-jr-gl style into a style that MapLibre GL JS reads as it is: the images of
// `metadata["map-jr:images"]` go into a sprite sheet (PNG at 1x and 2x), each `image` expression with `params` becomes a
// plain image name for each color, and the fonts of the system become fonts of a `glyphs` URL.
import {createExpression, validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {Resvg} from '@resvg/resvg-js';
import {createHash} from 'node:crypto';

/** The glyphs of OpenFreeMap, which the OpenFreeMap styles use too. */
export const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
// The fonts that it has, for the weight and the style of the first font of a stack ("system-ui Semibold").
const FONTS = {Regular: 'Noto Sans Regular', Semibold: 'Noto Sans Bold', Bold: 'Noto Sans Bold', Italic: 'Noto Sans Italic', 'Semibold Italic': 'Noto Sans Italic'};
const SCHEMES = ['light', 'dark'];
const STRING = {type: 'string', 'property-type': 'data-driven', expression: {parameters: ['zoom', 'feature'], interpolated: false}};
const COLOR = {type: 'color', 'property-type': 'data-driven', expression: {parameters: ['zoom', 'feature'], interpolated: false}};
const ZOOMS = [0, 8, 14, 22];

const walk = (v, f) => { f(v); if (Array.isArray(v)) v.forEach(x => walk(x, f)); else if (v && typeof v === 'object') Object.values(v).forEach(x => walk(x, f)); };

/** An expression as a function of the feature properties and the color scheme; it must not change with the zoom. */
function compile(json, spec, what) {
    const e = createExpression(json, spec);
    if (e.result !== 'success') throw new Error(`${what}: ${e.value.map(x => x.message).join('; ')}`);
    return (properties, scheme) => {
        const out = ZOOMS.map(zoom => String(e.value.evaluate({zoom, globalState: {'color-scheme': scheme}}, {properties}) ?? ''));
        if (out.some(v => v !== out[0])) throw new Error(`${what}: the value changes with the zoom, which a sprite cannot follow.`);
        return out[0];
    };
}

/** The SVG of an image, with its slots filled. (A slot with no value is empty, as in map-jr-gl.) */
const fill = (value, params) => (value.image ?? value).replace(/\{\{(\w+)\}\}/g, (_, slot) => params[slot] ?? '');

/** Keeps the values of `key` that the filter of the layer can let through, as far as its plain comparisons say. */
function allowed(filter, key, values) {
    const passes = (f, x) => {
        if (!Array.isArray(f)) return true;
        const [op, k, ...v] = f;
        if (op === 'all') return f.slice(1).every(g => passes(g, x));
        if (op === 'any') return f.slice(1).some(g => passes(g, x));
        const name = Array.isArray(k) && k[0] === 'get' ? k[1] : k;
        if (name !== key || v.some(y => typeof y !== 'string' && typeof y !== 'number')) return true;
        if (op === '==' || op === 'in') return v.includes(x);
        if (op === '!=' || op === '!in') return !v.includes(x);
        return true;
    };
    return values.filter(x => passes(filter, x));
}

/**
 * Returns the style for MapLibre GL JS, whose `sprite` is `spriteUrl`. The images that it uses are added to `entries`,
 * which `sheet` draws; styles that share `entries` share the sprite.
 */
export function maplibre(source, spriteUrl, entries) {
    const style = structuredClone(source), images = style.metadata?.['map-jr:images'] ?? {};
    if (style.state?.['color-scheme'] === undefined) throw new Error('maplibre: the style has no global state color-scheme.');

    // An image in the sheet: its name, with a hash of its colors when it has some.
    const add = (name, params, what) => {
        if (!(name in images)) return '';
        const svg = fill(images[name], params), id = Object.keys(params).length ? `${name}-${createHash('sha1').update(svg).digest('hex').slice(0, 6)}` : name;
        if (entries.has(id) && entries.get(id).svg !== svg) throw new Error(`maplibre: two images named ${id}.`);
        entries.set(id, {svg, value: images[name]});
        return id;
    };

    // `["image", name, {params}]` → a `match` on the properties that it reads, for each color scheme.
    // (An image can be inside another expression, such as a `step` on the zoom.)
    const convert = (v, layer) => {
        if (typeof v === 'string') return add(v, {}, layer.id) || v;
        if (Array.isArray(v) && v[0] === 'image') return image(v, layer);
        if (Array.isArray(v) && v[0] !== 'literal') return v.map((x, i) => i && Array.isArray(x) ? convert(x, layer) : x);
        return v;
    };
    const image = (v, layer) => {
        const [, nameJson, opts = {}] = v, what = `maplibre: layer "${layer.id}"`;
        const keys = new Set(), states = new Set(), labels = new Set();
        walk(v, x => {
            if (!Array.isArray(x)) return;
            if (x[0] === 'get') keys.add(x[1]);
            if (x[0] === 'global-state') states.add(x[1]);
            if (x[0] === 'match') for (let i = 2; i < x.length - 1; i += 2) for (const l of [x[i]].flat()) if (typeof l === 'string') labels.add(l);
        });
        for (const s of states) if (s !== 'color-scheme') throw new Error(`${what}: the image reads the global state ${s}.`);
        if (keys.size > 2) throw new Error(`${what}: the image reads more than two properties.`);
        // The values a property can have, as far as the image goes: the labels of a match, and the names of the images.
        const values = [...new Set([...labels, ...Object.keys(images).flatMap(n => [n, n.replace(/_\d+$/, ''), n.replace(/^shield_/, '')])])].sort();
        const name = compile(nameJson, STRING, what), params = Object.entries(opts.params ?? {}).map(([k, j]) => [k, compile(j, COLOR, `${what} params.${k}`)]);
        const id = (props, s) => add(name(props, s), Object.fromEntries(params.map(([k, f]) => [k, f(props, s)])), what);
        const [k1, k2] = [...keys];
        const OTHER = '\u0000';
        // A match on one property, the other given; the default is the image of a value that is not listed.
        const match = (key, given, leaf) => {
            const listed = allowed(layer.filter, key, values);
            // (A missing property gives no image in a match, in map-jr-gl and in MapLibre alike.)
            const fallback = leaf({...given, [key]: OTHER});
            const groups = new Map();
            for (const x of listed) {
                const out = leaf({...given, [key]: x}), j = JSON.stringify(out);
                if (j === JSON.stringify(fallback)) continue;
                if (!groups.has(j)) groups.set(j, {out, labels: []});
                groups.get(j).labels.push(x);
            }
            if (!groups.size) return fallback;
            return ['match', ['get', key], ...[...groups.values()].flatMap(g => [g.labels.length === 1 ? g.labels[0] : g.labels, g.out]), fallback];
        };
        const of = s => k1 === undefined ? id({}, s) : match(k1, {}, p => k2 === undefined ? id(p, s) : match(k2, p, q => id(q, s)));
        const [light, dark] = SCHEMES.map(of);
        return JSON.stringify(light) === JSON.stringify(dark) ? light : ['case', ['==', ['global-state', 'color-scheme'], 'dark'], dark, light];
    };

    for (const layer of style.layers) {
        if (layer.layout?.['icon-image'] !== undefined) layer.layout['icon-image'] = convert(layer.layout['icon-image'], layer);
        for (const k of ['fill-pattern', 'line-pattern', 'background-pattern']) if (layer.paint?.[k] !== undefined) layer.paint[k] = convert(layer.paint[k], layer);
        const font = layer.layout?.['text-font'];
        if (Array.isArray(font) && typeof font[0] === 'string' && font[0].startsWith('system-ui ')) {
            const face = FONTS[font[0].slice('system-ui '.length)];
            if (!face) throw new Error(`maplibre: the layer "${layer.id}" has the font ${font[0]}, which the glyphs do not have.`);
            layer.layout['text-font'] = [face];
        }
        if (layer.metadata) {
            for (const k of Object.keys(layer.metadata)) if (k.startsWith('map-jr:')) delete layer.metadata[k];
            if (!Object.keys(layer.metadata).length) delete layer.metadata;
        }
    }
    for (const k of Object.keys(style.metadata ?? {})) if (k.startsWith('map-jr:')) delete style.metadata[k];
    if (style.metadata && !Object.keys(style.metadata).length) delete style.metadata;
    style.glyphs ??= GLYPHS;
    // (The keys in the order of the style specification, as `sprite` and `glyphs` come after `sources`.)
    const {version, name, metadata, center, zoom, bearing, pitch, state, sources, sprite: _, glyphs, ...rest} = style;
    const out = Object.fromEntries(Object.entries({version, name, metadata, center, zoom, bearing, pitch, state, sources, sprite: spriteUrl, glyphs, ...rest}).filter(([, v]) => v !== undefined));
    const errors = validateStyleMin(out);
    if (errors.length) throw new Error(`maplibre: ${errors.map(e => e.message).join('; ')}`);
    return out;
}

/** Packs the images in rows, and draws the sheet at 1x and 2x: the files by the suffix of their name ('.json', '.png', '@2x.json', '@2x.png'). */
export function sheet(entries) {
    const items = [...entries].map(([id, {svg, value}]) => {
        const root = /<svg[^>]*>/.exec(svg)[0], attr = k => +new RegExp(` ${k}="([\\d.]+)"`).exec(root)?.[1];
        const box = /viewBox="([^"]*)"/.exec(root)?.[1].split(/[\s,]+/).map(Number);
        const width = value.width ?? (attr('width') || box[2]), height = value.height ?? (attr('height') || box[3]);
        return {id, svg, value, width, height, w: Math.ceil(width), h: Math.ceil(height)};
    }).sort((a, b) => b.h - a.h || a.id.localeCompare(b.id));
    const WIDTH = 256, GAP = 1;
    let x = 0, y = 0, row = 0;
    for (const it of items) {
        if (x + it.w > WIDTH) { x = 0; y += row + GAP; row = 0; }
        Object.assign(it, {x, y});
        x += it.w + GAP; row = Math.max(row, it.h);
    }
    const height = y + row;
    const files = {};
    for (const ratio of [1, 2]) {
        const body = items.map((it, i) => {
            // (Each image keeps its own ids: a prefix makes them unique in the sheet.)
            const svg = it.svg.replace(/\bid="([^"]+)"/g, `id="i${i}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#i${i}-$1)`).replace(/href="#([^"]+)"/g, `href="#i${i}-$1"`);
            return svg.replace(/<svg\b([^>]*)>/, (_, a) => `<svg${a.replace(/\s(?:width|height|x|y)="[^"]*"/g, '')} x="${it.x}" y="${it.y}" width="${it.width}" height="${it.height}"${/viewBox=/.test(a) ? '' : ` viewBox="0 0 ${it.width} ${it.height}"`}>`);
        }).join('');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">${body}</svg>`;
        const suffix = ratio === 1 ? '' : `@${ratio}x`;
        files[`${suffix}.png`] = new Resvg(svg, {fitTo: {mode: 'zoom', value: ratio}, font: {loadSystemFonts: false}}).render().asPng();
        const index = {};
        for (const it of items.toSorted((a, b) => a.id.localeCompare(b.id))) {
            const r = v => Math.round(v * ratio * 100) / 100;
            const e = {x: it.x * ratio, y: it.y * ratio, width: it.w * ratio, height: it.h * ratio, pixelRatio: ratio};
            if (it.value.stretchX) e.stretchX = it.value.stretchX.map(p => p.map(r));
            if (it.value.stretchY) e.stretchY = it.value.stretchY.map(p => p.map(r));
            if (it.value.content) e.content = it.value.content.map(r);
            index[it.id] = e;
        }
        files[`${suffix}.json`] = JSON.stringify(index);
    }
    return files;
}
