// Icons: upstream SVG -> minified SVG -> SVG template with {{color}}, {{background}}, {{border}} slots.
import {optimize} from 'svgo';
import {readdirSync, readFileSync} from 'node:fs';

// The full-canvas transparent rectangle that every upstream icon starts with.
const removeCanvasRect = {name: 'removeCanvasRect', fn: () => ({element: {enter: (n, p) => {
    if (n.name === 'path' && n.attributes.fill === 'none' && /^M0 0h[\d.]+v[\d.]+H0z$/.test(n.attributes.d) && Object.keys(n.attributes).length === 2) p.children = p.children.filter(c => c !== n);
}}})};

export function minify(svg) {
    return optimize(svg, {multipass: true, plugins: [
        'convertStyleToAttrs', {name: 'removeAttrs', params: {attrs: ['xml:space', 'color', 'marker', 'overflow', 'visibility', 'display']}},
        'preset-default', 'removeTitle', removeCanvasRect,
    ]}).data.replace(/ style="marker:none"| xml:space="preserve"/g, '');
}

const PAINT = /\b(fill|stroke)="([^"]*)"/g, SHAPE = /<(path|rect|circle|ellipse|polygon)\b([^>]*?)(\/?)>/g;

/** The role of each colour of a minified icon: which slot it becomes. Throws for an icon that fits no rule. */
function roles(name, colors) {
    const s = new Set(colors), rest = (m, role) => { for (const c of s) if (!(c in m)) m[c] = role; return m; };
    if (name.startsWith('dot_')) return {'#fff': 'border', '#000': 'color'};
    if (s.has('#bbb')) return rest({'#bbb': 'border', '#fff': 'background'}, 'color');           // POI disc
    if (s.has('#4898ff')) return {'#4898ff': 'background', '#fff': 'color'};                      // transport tile
    if (s.has('rgba(255,255,255,0.25)')) return {'rgba(255,255,255,0.25)': 'border', '#444': 'color'};
    if (name === 'wetland_bg_11') return {'#ddddbd': 'background', '#9ab660': 'color'};
    if (s.size === 1) return {[colors[0]]: 'color'};
    if (s.has('#fff') && s.size === 2) return rest({'#fff': 'background'}, 'border');             // road shields
    throw new Error(`icons: no colour rule for "${name}" (${colors.join(', ')}). Add one in lib/icons.mjs.`);
}

/** A minified icon as a template, with the current value of each slot. */
export function templatize(name, min) {
    // (A shape with no fill is black in SVG: make that explicit, so it gets a slot.)
    const svg = min.replace(SHAPE, (all, tag, attrs, close) => attrs.includes('fill=') ? all : `<${tag} fill="#000"${attrs}${close}>`);
    const colors = [...new Set([...svg.matchAll(PAINT)].map(m => m[2]))], role = roles(name, colors);
    const used = new Set(Object.values(role));
    if (used.size !== colors.length || colors.some(c => !(c in role))) throw new Error(`icons: "${name}" has colours without a slot of their own.`);
    const template = svg.replace(PAINT, (_, attr, c) => `${attr}="{{${role[c]}}}"`);
    if (/#[0-9a-f]{3,6}\b|rgb/.test(template)) throw new Error(`icons: "${name}" still has a colour outside fill and stroke.`);
    return {template, defaults: Object.fromEntries(colors.map(c => [role[c], c]))};
}

/**
 * The icons of the folders, then the aliases of `extra` (icons/extra.json): `alias` gives a name and its `_11` form
 * the icon of another name, `alias-exact` gives one name the icon of another.
 */
export function buildIcons(dirs, extra = {}) {
    const min = {}, template = {}, defaults = {}, aliasOf = {};
    for (const dir of dirs) for (const file of readdirSync(dir).filter(f => f.endsWith('.svg')).sort()) {
        const name = file.slice(0, -4);
        if (min[name]) throw new Error(`icons: "${name}" is in two folders.`);
        min[name] = minify(readFileSync(`${dir}/${file}`, 'utf8').trim());
        ({template: template[name], defaults: defaults[name]} = templatize(name, min[name]));
    }
    const alias = (name, target) => {
        if (min[name]) throw new Error(`icons: the alias "${name}" is an icon already.`);
        if (!min[target]) throw new Error(`icons: the alias "${name}" names "${target}", which is no icon.`);
        min[name] = min[target]; template[name] = template[target]; defaults[name] = defaults[target];
        aliasOf[name] = aliasOf[target] ?? target;
    };
    // (An alias can name another alias that comes before it.)
    for (const [name, target] of Object.entries(extra.alias ?? {})) for (const suffix of ['', '_11']) alias(name + suffix, target + suffix);
    for (const [name, target] of Object.entries(extra['alias-exact'] ?? {})) alias(name, target);
    // (`aliasOf` is not written to dist/: a style uses it to draw an alias from the image of its target.)
    return {min, template, defaults, aliasOf};
}

/** The value of an image for `metadata["map-jr:images"]`: the SVG, with its size when the viewBox does not give it. */
export function imageValue(svg) {
    const root = /<svg[^>]*>/.exec(svg)[0], num = k => +new RegExp(` ${k}="([\\d.]+)"`).exec(root)[1];
    const box = /viewBox="([^"]*)"/.exec(root)?.[1].split(/\s+/).map(Number);
    return box && (box[2] !== num('width') || box[3] !== num('height')) ? {image: svg, width: num('width'), height: num('height')} : svg;
}
