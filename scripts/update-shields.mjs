// Writes shields/networks.json from the shield definitions of OSM Americana (https://americanamap.org/shields.json, CC0).
//   node scripts/update-shields.mjs [file]     (a local copy of shields.json in place of the download)
//
// Kept: the networks of a country or of a state or province (a name with at most two parts, as "US:I" or "FR:A-road"),
// which have the major highways. County and city networks (three parts and more) are left out to keep the styles small.
import {readFileSync, writeFileSync} from 'node:fs';

const URL_ = 'https://americanamap.org/shields.json';
const defs = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : await (await fetch(URL_)).json();
const NAMED = {white: '#ffffff', black: '#000000'};
const hex = c => NAMED[c] ?? c;
// The shapes Americana draws, as the templates of this repository. A shape with no template of its own gets the plate.
const SHAPE = {roundedRectangle: 'rect', pill: 'pill', ellipse: 'pill', hexagonHorizontal: 'hex'};
const looks = new Map();
let skipped = 0;
for (const [network, def] of Object.entries(defs.networks)) {
    if (network === 'default' || network.split(':').length > 2 || def.notext) continue;
    let look;
    if (def.shapeBlank) {
        const p = def.shapeBlank.params ?? {};
        look = {shape: SHAPE[def.shapeBlank.drawFunc] ?? 'rect', background: hex(p.fillColor), border: hex(p.strokeColor), text: hex(def.textColor ?? 'black')};
    } else if (def.spriteBlank) { skipped++; continue; }   // artwork of its own: see MANUAL in shields.mjs
    else continue;
    if (look.background && !/^#[0-9a-f]{6}$/i.test(look.background + '') ) { skipped++; continue; }
    const key = JSON.stringify(look);
    looks.set(key, [...(looks.get(key) ?? []), network]);
}
const out = [...looks].map(([key, networks]) => ({...JSON.parse(key), networks: networks.sort()})).sort((a, b) => b.networks.length - a.networks.length);
writeFileSync(new URL('../shields/networks.json', import.meta.url), '[\n' + out.map(o => '  ' + JSON.stringify(o)).join(',\n') + '\n]\n');
console.log(`${out.reduce((n, o) => n + o.networks.length, 0)} networks in ${out.length} looks; ${skipped} with artwork of their own left to the plate`);
