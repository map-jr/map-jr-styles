// Tests of the MapLibre styles (lib/maplibre.mjs): valid for MapLibre GL JS, with nothing of map-jr-gl, and each image
// that a layer can ask for in the sprite, in its colors for the light and the dark branch.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {maplibre, sheet} from '../lib/maplibre.mjs';

const dir = new URL('../dist/', import.meta.url).pathname, read = f => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const names = readdirSync(join(dir, 'maplibre')).filter(f => f.endsWith('.min.json') && !f.startsWith('sprite')).map(f => f.slice(0, -'.min.json'.length));
const sprite = read('maplibre/sprite.json'), sprite2x = read('maplibre/sprite@2x.json');
// The image names in an expression: the strings that are not a property, an operator or a label of a match.
const ids = v => typeof v === 'string' ? [v] : !Array.isArray(v) ? [] : v[0] === 'match' ? [...v.slice(3).filter((_, i) => i % 2 === 0), v.at(-1)].flatMap(ids)
    : v[0] === 'case' ? v.slice(2).flatMap(ids) : v[0] === 'step' ? v.slice(2).filter((_, i) => i % 2 === 0).flatMap(ids) : [];

test('each style with a light and a dark branch has a MapLibre style', () => {
    assert.deepEqual(names.sort(), ['elevation', 'elevation-radar', 'elevation-zero']);
});

test('a MapLibre style is valid, and has nothing of map-jr-gl', () => {
    for (const n of names) {
        const style = read(`maplibre/${n}.min.json`), text = JSON.stringify(style);
        assert.deepEqual(validateStyleMin(style), [], n);
        assert.equal(style.sprite, 'https://styles.map-jr.org/1/maplibre/sprite', n);
        assert.match(style.glyphs, /^https:\/\/tiles\.openfreemap\.org\/fonts\//, n);
        assert.doesNotMatch(text, /map-jr:|"params"|system-ui/, n);
        // (The rest is the style of map-jr-gl: the same layers, sources and state.)
        const own = read(`styles/${n}.min.json`);
        assert.deepEqual(style.layers.map(l => l.id), own.layers.map(l => l.id), n);
        assert.deepEqual(style.state, own.state, n);
        assert.deepEqual(style.sources, own.sources, n);
    }
});

test('each image that a layer can ask for is in the sprite, at 1x and 2x', () => {
    let used = 0;
    for (const n of names) for (const l of read(`maplibre/${n}.min.json`).layers) {
        for (const v of [l.layout?.['icon-image'], l.paint?.['fill-pattern']].filter(v => v !== undefined)) for (const id of ids(v)) {
            if (id === '') continue;
            used++;
            assert.ok(sprite[id], `${n} ${l.id}: ${id} is not in the sprite`);
            assert.deepEqual(sprite2x[id] && [sprite2x[id].width, sprite2x[id].pixelRatio], [sprite[id].width * 2, 2], id);
        }
    }
    assert.ok(used > 100);
});

test('an image has one name for each set of colors, and a dark one for the dark branch', () => {
    const style = read('maplibre/elevation.min.json'), image = id => style.layers.find(l => l.id === id).layout['icon-image'];
    const arrow = image('road_one_way_arrow');
    assert.deepEqual(arrow.slice(0, 2), ['case', ['==', ['global-state', 'color-scheme'], 'dark']]);
    assert.notEqual(arrow[2], arrow[3]);
    assert.match(arrow[2], /^arrow-[0-9a-f]{6}$/);
    // (A shield keeps the box where its text goes, at the ratio of the sheet.)
    const shield = Object.keys(sprite).find(k => k.startsWith('shield_rect-'));
    assert.ok(sprite[shield].content && sprite[shield].stretchX);
    assert.deepEqual(sprite2x[shield].content, sprite[shield].content.map(v => v * 2));
});

test('maplibre turns params into names, reads the filter, and keeps a step on the zoom', () => {
    const images = {dot: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><circle r="2" cx="2" cy="2" fill="{{color}}"/></svg>'};
    for (const c of ['a', 'b', 'c']) images[`${c}_11`] = images.dot;
    const dark = (d, l) => ['case', ['==', ['global-state', 'color-scheme'], 'dark'], d, l];
    const style = {version: 8, state: {'color-scheme': {default: 'light'}}, metadata: {'map-jr:images': images}, sources: {s: {type: 'vector', url: 'https://example.com/t.json'}}, layers: [
        {id: 'p', type: 'symbol', source: 's', 'source-layer': 'poi', filter: ['in', 'class', 'a', 'b'], metadata: {'map-jr:ssr': {hidden: true}},
            layout: {'icon-image': ['image', ['concat', ['get', 'class'], '_11'], {params: {color: dark('#fff', ['match', ['get', 'class'], 'a', '#f00', '#00f'])}}]}},
        {id: 'd', type: 'symbol', source: 's', 'source-layer': 'place', layout: {'icon-image': ['step', ['zoom'], ['image', 'dot', {params: {color: '#000'}}], 8, '']}},
    ]};
    const entries = new Map(), out = maplibre(style, 'https://example.com/sprite', entries);
    const [p, d] = out.layers;
    // (Only the classes of the filter: c is not drawn.)
    assert.equal(p.layout['icon-image'][0], 'case');
    const light = p.layout['icon-image'][3];
    assert.deepEqual(light.slice(0, 2), ['match', ['get', 'class']]);
    assert.deepEqual(light.filter(x => typeof x === 'string' && /^[abc]$/.test(x)), ['a', 'b']);
    assert.equal(light.at(-1), '');
    assert.equal(p.metadata, undefined);
    assert.deepEqual(d.layout['icon-image'].slice(0, 2), ['step', ['zoom']]);
    assert.match(d.layout['icon-image'][2], /^dot-[0-9a-f]{6}$/);
    assert.equal(out.metadata, undefined);
    // (a and b in each branch, and the dot.)
    assert.equal(entries.size, 5);
    for (const {svg} of entries.values()) assert.doesNotMatch(svg, /\{\{/);
    const files = sheet(entries);
    assert.deepEqual(Object.keys(files).sort(), ['.json', '.png', '@2x.json', '@2x.png']);
    assert.equal(Object.keys(JSON.parse(files['.json'])).length, 5);
});
