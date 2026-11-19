// Applies a style saved from Maputnik to the sources of the build, so that the next build gives the saved style.
//   node scripts/apply-edit.mjs <saved.json> [<style>]      (npm run apply-edit -- <saved.json> [<style>])
// The command builds the style from the sources in memory and compares it with the saved style. For each difference
// it tries the places the value can come from (the source style, or the dark palette `PAIRS` of the module), builds
// again, and keeps a change only when it removes differences and adds none. A difference that no change removes is
// listed, and nothing is written for it. After writing, it builds from the files again and lists what still differs.
import {buildIcons} from '../lib/icons.mjs';
import {DARK} from '../lib/style.mjs';
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {resolve, basename} from 'node:path';
import {pathToFileURL} from 'node:url';

const [file, wanted] = process.argv.slice(2);
if (!file) { console.error('Give the saved style: npm run apply-edit -- <saved.json> [<style>]'); process.exit(1); }
const saved = JSON.parse(readFileSync(file, 'utf8'));
// (Maputnik adds an id and its own metadata to the style.)
delete saved.id;
for (const k of Object.keys(saved.metadata ?? {})) if (k.startsWith('maputnik:')) delete saved.metadata[k];
if (saved.metadata && !Object.keys(saved.metadata).length) delete saved.metadata;

const icons = buildIcons(['icons/upstream', 'icons/extra', 'icons/custom'], JSON.parse(readFileSync('icons/extra.json', 'utf8')));
const load = async (path, fresh) => import(pathToFileURL(resolve(path)).href + (fresh ? `?${Date.now()}` : ''));
const all = [];
for (const f of readdirSync('styles').filter(f => f.endsWith('.mjs') && f !== 'shared.mjs').sort()) {
    const mod = await load(`styles/${f}`);
    for (const s of mod.styles ?? [{name: f.slice(0, -4), source: mod.source, build: mod.build}]) all.push({...s, module: `styles/${f}`, pairs: mod.PAIRS});
}

const same = (a, b) => {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => k in b && same(a[k], b[k]));
};
const plain = o => o && typeof o === 'object' && !Array.isArray(o);
/** The differences of two styles: `{layer, path, b, e}`, as deep in a value as the two have the same shape. */
function differences(built, edit) {
    const out = [];
    const walk = (b, e, layer, path) => {
        if (same(b, e)) return;
        if (plain(b) && plain(e)) { for (const k of new Set([...Object.keys(b), ...Object.keys(e)])) walk(b[k], e[k], layer, [...path, k]); return; }
        if (Array.isArray(b) && Array.isArray(e) && b.length === e.length && same(b[0], e[0])) { b.forEach((x, i) => walk(x, e[i], layer, [...path, i])); return; }
        out.push({layer, path, b, e});
    };
    for (const k of new Set([...Object.keys(built), ...Object.keys(edit)])) if (k !== 'layers') walk(built[k], edit[k], null, [k]);
    const byId = new Map(built.layers.map(l => [l.id, l])), ids = new Set(edit.layers.map(l => l.id));
    // (The build gives a layer `map-jr:ssr` (`ssr` in lib/style.mjs), which a layer new in the saved style does not have yet.)
    const generated = (b, e) => {
        if (!b?.metadata?.['map-jr:ssr'] || e?.metadata?.['map-jr:ssr']) return b;
        const {'map-jr:ssr': _, ...rest} = b.metadata;
        return Object.keys(rest).length ? {...b, metadata: rest} : (({metadata, ...x}) => x)(b);
    };
    for (const l of edit.layers) walk(generated(byId.get(l.id), l), l, l.id, []);
    for (const l of built.layers) if (!ids.has(l.id)) out.push({layer: l.id, path: [], b: l, e: undefined});
    const order = ls => ls.map(l => l.id).filter(id => byId.has(id) && ids.has(id)).join('\n');
    if (order(built.layers) !== order(edit.layers)) out.push({layer: null, path: ['layers'], order: true});
    return out;
}
const where = d => d.order ? 'the order of the layers' : `${d.layer === null ? '' : `layer "${d.layer}"`}${d.path.length ? ` ${d.path.join('.')}` : d.e === undefined ? ' (removed)' : ' (new)'}`.trim();
const key = d => JSON.stringify([d.layer, d.path, d.order]);

/** Sets the value at `path` of `o`, and makes the objects on the way. False when the path does not fit `o`. */
function put(o, path, v) {
    for (const k of path.slice(0, -1)) {
        if (o[k] === undefined && typeof k === 'string') o[k] = {};
        o = o[k];
        if (!o || typeof o !== 'object') return false;
    }
    if (v === undefined) Array.isArray(o) ? o.splice(path.at(-1), 1) : delete o[path.at(-1)];
    else o[path.at(-1)] = structuredClone(v);
    return true;
}
const at = (o, path) => path.reduce((x, k) => x?.[k], o);

/** The changes that can give the edit of one difference: each is `{source, pairs, note}`. */
function* candidates(d, s, source, pairs, edit) {
    const src = structuredClone(source), P = {...pairs};
    const layer = d.layer === null ? src : src.layers.find(l => l.id === d.layer);
    if (d.order) {
        const rank = new Map(edit.layers.map((l, i) => [l.id, i])), placed = src.layers.filter(l => rank.has(l.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
        let i = 0;
        src.layers = src.layers.map(l => rank.has(l.id) ? placed[i++] : l);
        return yield {source: src, pairs: P, note: s.source};
    }
    if (d.layer !== null && !d.path.length) {
        if (d.e === undefined) { if (layer) src.layers.splice(src.layers.indexOf(layer), 1); else return; }
        else {
            // (A new layer goes after the layer before it in the saved style.)
            const before = edit.layers.slice(0, edit.layers.findIndex(l => l.id === d.layer)).reverse().find(l => src.layers.some(x => x.id === l.id));
            src.layers.splice(before ? src.layers.findIndex(x => x.id === before.id) + 1 : 0, 0, structuredClone(d.e));
        }
        return yield {source: src, pairs: P, note: s.source};
    }
    if (!layer) return;
    const parent = at(layer, d.path.slice(0, -1)), i = d.path.at(-1);
    const isCase = Array.isArray(parent) && parent.length === 4 && parent[0] === 'case' && same(parent[1], DARK) && [parent[2], parent[3]].every(v => typeof v !== 'object');
    // The dark value of a `case` on `color-scheme`: its pair in the palette of the module.
    if (pairs && isCase && i === 2) yield {source: src, pairs: {...P, [`${parent[2]}|${parent[3]}`]: d.e}, note: `PAIRS in ${s.module}`};
    // The light value of such a `case`: the pair keeps its dark value under the new light value.
    const pair = `${parent?.[2]}|${parent?.[3]}`;
    if (pairs && isCase && i === 3 && pair in P && typeof d.e === 'string') {
        const x = structuredClone(source);
        put(x.layers.find(l => l.id === d.layer), d.path, d.e);
        yield {source: x, pairs: {...P, [`${parent[2]}|${d.e}`]: P[pair]}, note: `${s.source} and PAIRS in ${s.module}`};
    }
    if (put(layer, d.path, d.e)) yield {source: src, pairs: P, note: s.source};
}

/**
 * Builds the style from `source`, with the palette `pairs` in place of the module's, or gives null when the build
 * fails. A pair that no layer has any more is removed from `pairs`, as `retune` does not accept it.
 */
function run(s, source, pairs) {
    const keep = s.pairs && {...s.pairs}, use = p => { for (const k in s.pairs) delete s.pairs[k]; Object.assign(s.pairs, p); };
    for (let again = true; again;) {
        again = false;
        if (pairs) use(pairs);
        try { const style = structuredClone(source); s.build(style, icons); return style; }
        catch (e) {
            const unused = pairs && /^palette: the style has no color pair (.*)$/.exec(e.message)?.[1].split('; ');
            if (unused) { unused.forEach(k => delete pairs[k]); again = true; }
        }
        finally { if (keep) use(keep); }
    }
    return null;
}

const ids = st => new Set(st.layers.map(l => l.id));
const name = wanted ?? basename(file).replace(/(\.min)?\.json$/, '');
let s = all.find(x => x.name === name);
if (wanted && !s) { console.error(`There is no style "${wanted}". The styles: ${all.map(x => x.name).join(', ')}.`); process.exit(1); }
if (!s) {
    // (By the layers, when the file name is not the name of a style.)
    const shared = x => { const a = ids(run(x, JSON.parse(readFileSync(x.source, 'utf8')))), n = [...ids(saved)].filter(id => a.has(id)).length; return n / (a.size + saved.layers.length - n); };
    s = all.map(x => [x, shared(x)]).sort((a, b) => b[1] - a[1])[0][0];
}
const text = readFileSync(s.source, 'utf8');
let source = JSON.parse(text), pairs = s.pairs && {...s.pairs};
if (JSON.stringify(source, null, 2) + '\n' !== text) { console.error(`${s.source} is not in the form that this command writes (JSON with two spaces), so it does not edit it.`); process.exit(1); }
console.log(`Style: ${s.name} (${s.source}, ${s.module})`);

let diffs = differences(run(s, source, pairs), saved);
const before = diffs.length, applied = [];
search: for (;;) {
    // (A light value before a dark one, so that the dark one finds the pair under its new light value.)
    for (const d of diffs.toSorted((a, b) => (a.path.at(-1) === 2) - (b.path.at(-1) === 2))) for (const c of candidates(d, s, source, pairs, saved)) {
        const built = run(s, c.source, c.pairs);
        if (!built) continue;
        const now = differences(built, saved), old = new Set(diffs.map(key));
        if (now.length < diffs.length && now.every(x => old.has(key(x)))) {
            applied.push(`${where(d)}: ${c.note}`);
            ({source, pairs} = c); diffs = now;
            continue search;
        }
    }
    break;
}
console.log(`${before} differences; ${applied.length} changes to the sources.`);
for (const a of applied) console.log(`  applied  ${a}`);
for (const d of diffs) console.log(`  not mapped  ${where(d)}: ${JSON.stringify(d.b) ?? 'none'} in the build, ${JSON.stringify(d.e) ?? 'none'} in the saved style`);

/** The module text with the palette `PAIRS` changed from `old` to `now`. */
function editPairs(code, old, now) {
    const q = v => `'${v}'`, esc = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const k of Object.keys(old)) if (!(k in now)) {
        const entry = `${esc(q(k))}\\s*:\\s*${esc(q(old[k]))},?`, line = new RegExp(`\\n[ \\t]*${entry}[ \\t]*(?=\\n)`);
        code = line.test(code) ? code.replace(line, '') : code.replace(new RegExp(`${entry}[ \\t]*`), '');
    }
    for (const [k, v] of Object.entries(now)) {
        if (old[k] === v) continue;
        if ([k, v].some(x => typeof x !== 'string' || x.includes("'"))) throw new Error(`PAIRS: cannot write ${JSON.stringify(k)}: ${JSON.stringify(v)}.`);
        if (k in old) code = code.replace(new RegExp(`(${esc(q(k))}\\s*:\\s*)${esc(q(old[k]))}`), `$1${q(v)}`);
        else { const end = code.indexOf('\n};', code.indexOf('PAIRS = {')); code = `${code.slice(0, end)}\n    ${q(k)}:${q(v)},${code.slice(end)}`; }
    }
    return code;
}

if (applied.length) {
    writeFileSync(s.source, JSON.stringify(source, null, 2) + '\n');
    if (s.pairs && !same(pairs, s.pairs)) writeFileSync(s.module, editPairs(readFileSync(s.module, 'utf8'), s.pairs, pairs));
    console.log(`Wrote ${s.source}${s.pairs && !same(pairs, s.pairs) ? ` and ${s.module}` : ''}. Run "npm run build" to write dist/.`);
}
// The check: the files as written, built again.
const mod = await load(s.module, true), again = (mod.styles?.find(x => x.name === s.name) ?? mod).build;
const style = JSON.parse(readFileSync(s.source, 'utf8'));
again(style, icons);
const left = differences(style, saved);
console.log(left.length ? `The build differs from the saved style in ${left.length} ${left.length === 1 ? 'place' : 'places'}:` : 'The build gives the saved style.');
for (const d of left) console.log(`  differs  ${where(d)}`);
process.exitCode = left.length ? 1 : 0;
