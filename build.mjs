// Builds dist/: the icons as JSON (minified, templates, current colors) and the styles.
//   node build.mjs           write dist/
//   node build.mjs --check   fail when dist/ is not what the sources give (for CI)
import {buildIcons} from './lib/icons.mjs';
import {readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync} from 'node:fs';

const check = process.argv.includes('--check'), out = {};
const icons = buildIcons(['icons/upstream', 'icons/extra'], JSON.parse(readFileSync('icons/extra.json', 'utf8')));
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
    }
}

let stale = 0;
for (const [path, text] of Object.entries(out)) {
    const file = `dist/${path}`;
    if (check) { if (!existsSync(file) || readFileSync(file, 'utf8') !== text) { console.error(`stale: ${file}`); stale++; } continue; }
    mkdirSync(file.slice(0, file.lastIndexOf('/')), {recursive: true});
    writeFileSync(file, text);
    console.log(`${file}  ${text.length.toLocaleString('en')} bytes`);
}
if (stale) { console.error('dist/ is out of date: run "npm run build" and commit the result.'); process.exit(1); }
