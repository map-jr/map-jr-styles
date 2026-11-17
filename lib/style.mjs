// Helpers that turn a sprite style into a map-jr-gl style with SVG template images.
import {imageValue} from './icons.mjs';
import {SHAPES, NETWORKS} from '../shields/shields.mjs';
import {readFileSync} from 'node:fs';

export const DARK = ['==', ['global-state', 'color-scheme'], 'dark'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** A value for each colour scheme, in the form the source styles use. */
export const scheme = (dark, light) => same(dark, light) ? light : ['case', DARK, dark, light];
const ROLES = ['color', 'background', 'border'];

/**
 * Replaces the sprite of a style by template images in `metadata["map-jr:images"]`. Each `icon-image` becomes an
 * `image` expression whose `params` give the slots the colours of the sprite icon, and `iconDark` gives the dark ones.
 */
export function useIcons(style, icons, iconDark, plate) {
    const {template: T, defaults: D} = icons, used = new Set();
    const dark = (role, light) => {
        const v = iconDark[role]?.[light];
        if (v === undefined) throw new Error(`icons: no dark ${role} for ${light}. Add it to the palette of the style.`);
        return v;
    };
    const params = name => Object.fromEntries(ROLES.filter(r => r in D[name]).map(r => [r, scheme(name.startsWith('default_') ? plate[r] : dark(r, D[name][r]), D[name][r])]));
    // `{class}_11`: one `match` on the class for each slot, so that each icon keeps its own colours.
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
        return ['image', ['concat', ['get', 'class'], '_11'], {params: P}];
    };
    const all11 = Object.keys(T).filter(k => k.endsWith('_11')).map(k => k.slice(0, -3)).sort();
    const classesOf = layer => {
        let found;
        const walk = f => { if (!Array.isArray(f)) return; if (f[1] === 'class' && (f[0] === 'in' || f[0] === '==')) found ??= f.slice(2); f.forEach(walk); };
        walk(layer.filter);
        return found ? found.filter(c => T[c + '_11']) : all11;
    };
    const convert = (v, layer) => {
        if (v && typeof v === 'object' && !Array.isArray(v) && v.stops) return ['step', ['zoom'], convert(v.stops[0][1], layer), ...v.stops.slice(1).flatMap(([z, x]) => [z, convert(x, layer)])];
        if (v === '') return '';
        if (v === '{class}_11') { const cs = classesOf(layer); cs.forEach(c => used.add(c + '_11')); return byClass(cs); }
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
    if (missing.length) throw new Error(`palette: the style "${style.name}" has no colour pair ${missing.join('; ')}`);
}

/**
 * Road shields: the shield layer gets a template that stretches around the number, with the shape and the colours of
 * the network of the route. `plate` is the neutral plate of the style: `{light: {background, border, text}, dark: {...}}`.
 */
export function useShields(style, layerId, plate, {color = true} = {}) {
    const layer = style.layers.find(l => l.id === layerId);
    if (!layer) throw new Error(`shields: the style "${style.name}" has no layer "${layerId}".`);
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
    (layer.paint ??= {})['text-color'] = pick(n => n.plate ? undefined : n.text, scheme(plate.dark.text, plate.light.text));
}

/** Peak labels: no "(0 ft)" for a peak with no elevation. */
export function peaksWithoutZero(style) {
    for (const l of style.layers) if (l.id.startsWith('poi_peak_')) {
        const field = l.layout['text-field'];
        if (field[0] !== 'concat') throw new Error(`peaks: the text of "${l.id}" is not the expected concat.`);
        l.layout['text-field'] = ['case', ['>', ['to-number', ['get', 'ele_ft'], 0], 0], field, ['get', 'name_int']];
    }
}
export const layer = (style, id) => { const l = style.layers.find(l => l.id === id); if (!l) throw new Error(`the style "${style.name}" has no layer "${id}".`); return l; };
