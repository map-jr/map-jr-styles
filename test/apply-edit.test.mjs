// Tests of `npm run apply-edit`: each test edits the built style as Maputnik would, runs the command in a copy of the
// repository, builds, and compares dist/ with the saved style.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, cpSync, symlinkSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const built = JSON.parse(readFileSync(join(root, 'dist/styles/elevation-color.json'), 'utf8'));
const layer = (style, id) => style.layers.find(l => l.id === id);

/** Runs the command on the edited style in a fresh copy, then the build. Returns the output and the files. */
function apply(edit) {
    const dir = mkdtempSync(join(tmpdir(), 'apply-edit-'));
    for (const f of ['build.mjs', 'package.json', 'lib', 'styles', 'icons', 'shields', 'scripts']) cpSync(join(root, f), join(dir, f), {recursive: true});
    symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
    const saved = structuredClone(built);
    edit(saved);
    writeFileSync(join(dir, 'saved.json'), JSON.stringify({...saved, id: 'abc123'}));
    const run = spawnSync('node', ['scripts/apply-edit.mjs', 'saved.json', 'elevation-color'], {cwd: dir, encoding: 'utf8'});
    assert.equal(spawnSync('node', ['build.mjs'], {cwd: dir}).status, 0);
    const read = f => readFileSync(join(dir, f), 'utf8');
    return {saved, run, out: run.stdout, dist: JSON.parse(read('dist/styles/elevation-color.json')), source: JSON.parse(read('styles/src/elevation-color.json')), module: read('styles/elevation-color.mjs')};
}

test('a light color goes to the source, and its dark pair moves with it', () => {
    const r = apply(s => { layer(s, 'background').paint['background-color'][3] = '#fffaf0'; });
    assert.equal(r.run.status, 0, r.out);
    assert.deepEqual(r.dist, r.saved);
    assert.equal(layer(r.source, 'background').paint['background-color'][3], '#fffaf0');
    assert.match(r.module, /'#18252d\|#fffaf0':'#3b5247'/);
});

test('a dark color goes to the palette of the module', () => {
    const r = apply(s => { layer(s, 'park_outline').paint['line-color'][2] = '#123456'; });
    assert.equal(r.run.status, 0, r.out);
    assert.deepEqual(r.dist, r.saved);
    assert.match(r.module, /'#203b35\|rgba\(227, 239, 210, 1\)':'#123456'/);
});

test('a filter goes to the source', () => {
    const r = apply(s => { layer(s, 'landuse_cemetery').filter = ['in', 'class', 'cemetery', 'grave_yard']; });
    assert.equal(r.run.status, 0, r.out);
    assert.deepEqual(r.dist, r.saved);
});

test('a new layer goes to the source, after the layer before it', () => {
    const r = apply(s => s.layers.splice(s.layers.findIndex(l => l.id === 'water') + 1, 0, {id: 'water_edge', type: 'line', source: 'openmaptiles', 'source-layer': 'water', paint: {'line-color': '#4a80b0', 'line-width': 0.5}}));
    assert.equal(r.run.status, 0, r.out);
    // (The build gives the new layer its changes for the server render.)
    layer(r.saved, 'water_edge').metadata = {'map-jr:ssr': {hidden: true}};
    assert.deepEqual(r.dist, r.saved);
    const ids = r.source.layers.map(l => l.id);
    assert.equal(ids[ids.indexOf('water') + 1], 'water_edge');
});

test('a value that the module makes is listed, and nothing is written for it', () => {
    const r = apply(s => {
        layer(s, 'terrain-rgb-terrarium').paint['hillshade-highlight-color'][3] = '#EEEEEE';
        layer(s, 'water').paint['fill-color'][3] = '#88bbee';
    });
    assert.equal(r.run.status, 1);
    assert.match(r.out, /not mapped {2}layer "terrain-rgb-terrarium" paint\.hillshade-highlight-color\.3/);
    assert.match(r.out, /differs {2}layer "terrain-rgb-terrarium" paint\.hillshade-highlight-color\.3/);
    assert.equal(layer(r.dist, 'water').paint['fill-color'][3], '#88bbee');
    assert.equal(layer(r.source, 'terrain-rgb-terrarium').paint?.['hillshade-highlight-color'], undefined);
});
