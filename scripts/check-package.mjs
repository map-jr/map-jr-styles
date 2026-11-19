// Checks the tarball that npm would publish: publint, and an application that installs it and imports each style by
// the paths of the README (`@map-jr/styles/<name>.json`, `@map-jr/styles/maplibre/<name>.json`). CI and the workflow `Release` run it (`pnpm run test:package`).
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts});
const {name} = JSON.parse(readFileSync('package.json', 'utf8'));
const names = d => readdirSync(d).filter(f => f.endsWith('.min.json')).map(f => f.replace(/\.min\.json$/, '')).sort();
const styles = names('dist/styles'), maplibre = names('dist/maplibre');

run('pnpm', ['exec', 'publint', '--strict'], {stdio: 'inherit'});

const dir = mkdtempSync(join(tmpdir(), 'map-jr-styles-package-'));
try {
    const [{filename, files}] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', dir]));
    const paths = files.map(f => f.path);
    // Only the styles without white space, and no source or build file.
    const extra = paths.filter(p => p.startsWith('dist/') && !/^dist\/(?:styles|maplibre)\/[^/]+\.min\.json$/.test(p));
    if (extra.length) throw new Error(`The tarball has files that it should not: ${extra.join(', ')}`);
    for (const s of styles) if (!paths.includes(`dist/styles/${s}.min.json`)) throw new Error(`The tarball has no dist/styles/${s}.min.json.`);
    for (const s of maplibre) if (!paths.includes(`dist/maplibre/${s}.min.json`)) throw new Error(`The tarball has no dist/maplibre/${s}.min.json.`);

    // An application that installs the tarball, as npm would.
    const app = join(dir, 'app'), pkg = join(app, 'node_modules', ...name.split('/'));
    mkdirSync(pkg, {recursive: true});
    run('tar', ['-xzf', join(dir, filename), '-C', pkg, '--strip-components=1']);
    writeFileSync(join(app, 'package.json'), JSON.stringify({type: 'module', private: true}));
    writeFileSync(join(app, 'check.mjs'), [
        `const styles = ${JSON.stringify(styles)};`,
        `for (const s of styles) {`,
        `    const {default: style} = await import('${name}/' + s + '.json', {with: {type: 'json'}});`,
        `    if (style.version !== 8 || !style.layers?.length || !style.metadata?.['map-jr:images']) throw new Error(s + ': not a style with its images.');`,
        `}`,
        `for (const s of ${JSON.stringify(maplibre)}) {`,
        `    const {default: style} = await import('${name}/maplibre/' + s + '.json', {with: {type: 'json'}});`,
        `    if (style.version !== 8 || !style.layers?.length || !/^https:\\/\\//.test(style.sprite) || !style.glyphs) throw new Error('maplibre/' + s + ': not a style with a sprite and glyphs.');`,
        `}`,
        `const {default: pkg} = await import('${name}/package.json', {with: {type: 'json'}});`,
        `let missing = false;`,
        `try { await import('${name}/no-such-style.json', {with: {type: 'json'}}); } catch { missing = true; }`,
        `if (!missing) throw new Error('A style that does not exist was imported.');`,
        `console.log(pkg.name + ' ' + pkg.version + ': ' + styles.length + ' styles and ' + ${maplibre.length} + ' MapLibre styles import by their names.');`,
    ].join('\n'));
    process.stdout.write(run('node', ['check.mjs'], {cwd: app}));
} finally {
    rmSync(dir, {recursive: true, force: true});
}
