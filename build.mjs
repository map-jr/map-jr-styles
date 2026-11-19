// Builds dist/: the icons as JSON (minified, templates, current colors) and the styles.
//   node build.mjs           write dist/
//   node build.mjs --check   fail when dist/ is not what the sources give (for CI)
import {buildIcons} from './lib/icons.mjs';
import {maplibre, sheet} from './lib/maplibre.mjs';
import {readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync} from 'node:fs';

const check = process.argv.includes('--check'), out = {};
// The MapLibre styles take their sprite from the folder of the major version (scripts/publish.mjs changes it for /@main/).
// One sprite for them all, as they share most images.
const SPRITE = `https://styles.map-jr.org/${JSON.parse(readFileSync('package.json', 'utf8')).version.split('.')[0]}/maplibre/sprite`, sprite = new Map();
const icons = buildIcons(['icons/upstream', 'icons/extra', 'icons/custom'], JSON.parse(readFileSync('icons/extra.json', 'utf8')));
out['icons/icons.min.json'] = JSON.stringify(icons.min);
out['icons/icons.template.json'] = JSON.stringify(icons.template);
out['icons/icons.defaults.json'] = JSON.stringify(icons.defaults);

for (const file of readdirSync('styles').filter(f => f.endsWith('.mjs') && f !== 'shared.mjs').sort()) {
    const mod = await import(`./styles/${file}`);
    // (A module is one style, or a list of them in `styles`.)
    for (const {name, source, build} of mod.styles ?? [{name: file.slice(0, -4), source: mod.source, build: mod.build}]) {
        const style = JSON.parse(readFileSync(source, 'utf8'));
        build(style, icons);
        const images = Object.entries(style.metadata?.['map-jr:images'] ?? {});
        // (The limits map-jr-gl sets for the images of a style.)
        if (images.length > 200) throw new Error(`${name}: ${images.length} images, and a style can carry 200.`);
        for (const [image, v] of images) if ((v.image ?? v).length > 200_000) throw new Error(`${name}: the image "${image}" is longer than 200,000 characters.`);
        out[`styles/${name}.json`] = JSON.stringify(style, null, 2) + '\n';
        out[`styles/${name}.min.json`] = JSON.stringify(style);
        // A style with a light and a dark branch has a MapLibre version too, with a sprite sheet. (The OpenFreeMap
        // styles are the ones of OpenFreeMap, which MapLibre reads already.)
        if (style.state?.['color-scheme'] === undefined) continue;
        const m = maplibre(style, SPRITE, sprite);
        out[`maplibre/${name}.json`] = JSON.stringify(m, null, 2) + '\n';
        out[`maplibre/${name}.min.json`] = JSON.stringify(m);
    }
}

for (const [suffix, data] of Object.entries(sheet(sprite))) out[`maplibre/sprite${suffix}`] = data;

let stale = 0;
for (const [path, text] of Object.entries(out)) {
    const file = `dist/${path}`;
    if (check) { if (!existsSync(file) || !readFileSync(file).equals(Buffer.from(text))) { console.error(`stale: ${file}`); stale++; } continue; }
    mkdirSync(file.slice(0, file.lastIndexOf('/')), {recursive: true});
    writeFileSync(file, text);
    console.log(`${file}  ${Buffer.byteLength(text).toLocaleString('en')} bytes`);
}
if (stale) { console.error('dist/ is out of date: run "npm run build" and commit the result.'); process.exit(1); }
