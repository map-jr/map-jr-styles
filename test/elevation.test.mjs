// Tests of the variants of the elevation styles: Elevation · zero has no relief, no peaks and no elevation tiles, and
// the relief and the peaks of Elevation · radar follow the global state `relief`.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => JSON.parse(readFileSync(new URL(`../dist/styles/${name}.min.json`, import.meta.url), 'utf8'));
const elevation = read('elevation'), zero = read('elevation-zero'), radar = read('elevation-radar');

test('Elevation · zero is Elevation without the relief, the shaded relief, the 3D terrain and the peaks', () => {
    assert.ok(elevation.terrain && elevation.sources.terrarium && elevation.sources.natural_earth_shaded_relief);
    assert.equal(zero.terrain, undefined);
    assert.deepEqual(Object.keys(zero.sources), ['openmaptiles']);
    assert.ok(!zero.layers.some(l => /^raster/.test(l.type) || l.type === 'hillshade' || l.id.startsWith('poi_peak_')));
    assert.ok(!JSON.stringify(zero).includes('elevation-unit'));
    // (The other layers are those of Elevation, in the same order.)
    const kept = elevation.layers.filter(l => l.source !== 'terrarium' && l.source !== 'natural_earth_shaded_relief' && !l.id.startsWith('poi_peak_'));
    assert.ok(kept.length < elevation.layers.length - 2);
    assert.deepEqual(zero.layers, kept);
});

test('the relief and the peaks of Elevation · radar follow the global state relief', () => {
    assert.deepEqual(radar.state.relief, {default: true});
    assert.equal(radar.state.peaks, undefined);
    const switched = radar.layers.filter(l => Array.isArray(l.layout?.visibility)).map(l => l.id).sort();
    assert.deepEqual(switched, ['poi_peak_1', 'poi_peak_2', 'poi_peak_3', 'terrain-rgb-terrarium']);
    for (const id of switched) assert.deepEqual(radar.layers.find(l => l.id === id).layout.visibility, ['case', ['global-state', 'relief'], 'visible', 'none']);
    // (The relief is the only layer of the elevation tiles: with it off, no layer uses them.)
    assert.deepEqual(radar.layers.filter(l => l.source === 'terrarium').map(l => l.id), ['terrain-rgb-terrarium']);
});
