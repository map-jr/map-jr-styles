// Tests of `metadata["map-jr:ssr"]` in the built styles (`ssr` in lib/style.mjs): only keys that map-jr-gl reads, and a
// placeholder that keeps the land, the water, the main roads, the borders and the names of places.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {ssr, reaches} from '../lib/style.mjs';

const dir = new URL('../dist/styles/', import.meta.url).pathname;
const styles = readdirSync(dir).filter(f => f.endsWith('.min.json')).map(f => [f, JSON.parse(readFileSync(join(dir, f), 'utf8'))]);
const KEYS = new Set(['hidden', 'filter', 'minzoom', 'maxzoom', 'paint', 'layout', 'simplify', 'minSize']);
const of = l => l.metadata?.['map-jr:ssr'];

test('each style has map-jr:ssr, with only the keys of map-jr-gl', () => {
    for (const [f, style] of styles) {
        const tagged = style.layers.filter(of);
        assert.ok(tagged.length, `${f}: no layer has map-jr:ssr`);
        for (const l of tagged) for (const k of Object.keys(of(l))) assert.ok(KEYS.has(k), `${f} ${l.id}: unknown key ${k}`);
    }
});

test('the server render keeps the background, water, areas, main roads, borders and the names of places', () => {
    for (const [f, style] of styles) {
        const shown = l => !of(l)?.hidden;
        for (const l of style.layers) {
            const o = of(l);
            if (o?.simplify !== undefined) assert.ok(o.simplify <= 8 && (o.minSize ?? 0) <= 48, `${f}: ${l.id} drops too much`);
            // (A server minzoom only above the layer's own.)
            if (o?.minzoom !== undefined) assert.ok(o.minzoom > (l.minzoom ?? 0), `${f}: ${l.id}`);
            if (['background', 'raster', 'hillshade'].includes(l.type)) assert.ok(shown(l), `${f}: ${l.id} is hidden`);
            if (l['source-layer'] === 'building') assert.ok(!shown(l), `${f}: ${l.id} is drawn`);
            if (l.type === 'symbol' && shown(l)) assert.equal(l['source-layer'], 'place', `${f}: ${l.id} is drawn`);
        }
        const kept = sl => style.layers.some(l => l['source-layer'] === sl && shown(l));
        for (const sl of ['water', 'boundary', 'place']) assert.ok(kept(sl), `${f}: no ${sl}`);
        assert.ok(style.layers.some(l => l['source-layer'] === 'transportation' && shown(l) && /motorway/.test(JSON.stringify(l.filter)) && (of(l)?.minzoom ?? 0) < 7), `${f}: no motorway at low zoom`);
    }
});

test('a road layer starts on the server at the zoom of its class, or where it can be seen', () => {
    const liberty = styles.find(([f]) => f === 'openfreemap-liberty.min.json')[1], l = id => liberty.layers.find(x => x.id === id);
    assert.equal(of(l('road_secondary_tertiary')).minzoom, 14);
    assert.equal(of(l('road_minor')).minzoom, 15);
    // (Service roads from 15, but their width is 0 up to 15.5, and reaches 0.1 pixel just after.)
    assert.equal(of(l('road_service_track')).minzoom, 15.53);
    assert.equal(of(l('road_major_rail')).hidden, true);
    assert.equal(of(l('water')).minzoom, undefined);
});

test('reaches reads the zoom curves of the style specification', () => {
    assert.equal(reaches(3, 0.1), 0);
    assert.equal(reaches(0, 0.1), Infinity);
    assert.equal(reaches(['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, 1], 0.05), 12.025);
    assert.equal(reaches({stops: [[12, 0], [14, 1]]}, 0.05), 12.1);
    assert.equal(reaches(['step', ['zoom'], 0, 15, 1], 0.05), 15);
    assert.ok(Math.abs(reaches(['interpolate', ['exponential', 2], ['zoom'], 10, 0, 11, 1], 0.5) - 10.585) < 0.001);
    // The lower of the two branches of the color scheme.
    assert.equal(reaches(['case', ['==', ['global-state', 'color-scheme'], 'dark'], ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 1], 1], 0.05), 0);
    // Not known: a value of the data, and a curve that falls again.
    assert.equal(reaches(['get', 'width'], 0.1), undefined);
    assert.equal(reaches(['interpolate', ['linear'], ['zoom'], 10, 0, 12, 1, 14, 0], 0.05), undefined);
});

test('ssr hides a layer that never draws, and keeps map-jr:ssr of the source', () => {
    const own = {minSize: 4};
    const style = {layers: [
        {id: 'b', type: 'fill', 'source-layer': 'building', metadata: {'map-jr:ssr': own}},
        {id: 'w', type: 'fill', 'source-layer': 'water', paint: {'fill-opacity': 0}},
        {id: 'r', type: 'line', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'primary'], paint: {'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 1]}},
    ]};
    ssr(style);
    assert.equal(style.layers[0].metadata['map-jr:ssr'], own);
    assert.deepEqual(style.layers[1].metadata['map-jr:ssr'], {hidden: true});
    const {filter, ...rest} = style.layers[2].metadata['map-jr:ssr'];
    assert.deepEqual(rest, {simplify: 8, minSize: 1, minzoom: 10.1});
    // (Each class of road from its zoom: the filter of a layer of many classes.)
    assert.deepEqual(filter.slice(0, 2), ['any', ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false]]);
    assert.deepEqual(filter[2], ['all', ['>=', ['zoom'], 14], ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false]]);
});
