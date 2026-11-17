// Draws each style in light and dark, side by side, at the views of test/views.json, into test/shots/.
//   node test/preview.mjs [style] [view]
// Needs Playwright with Chromium, and a build of map-jr-gl that reads metadata["map-jr:images"] in test/lib/
// (the dist/ folder of the library). The script reports each error of the map.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {extname, join, normalize} from 'node:path';

// (require, not import: it also finds a Playwright that is installed globally, through NODE_PATH.)
const {chromium} = createRequire(import.meta.url)('playwright');
const root = new URL('..', import.meta.url).pathname;
if (!existsSync(join(root, 'test/lib/map-jr-gl.dev.js'))) { console.error('Put the dist/ folder of a map-jr-gl build in test/lib/ first.'); process.exit(1); }
const types = {'.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json'};
const server = createServer(async (req, res) => {
    const path = normalize(join(root, decodeURIComponent(req.url.split('?')[0])));
    try { if (!path.startsWith(root)) throw 0; const body = await readFile(path); res.writeHead(200, {'content-type': types[extname(path)] ?? 'application/octet-stream'}); res.end(body); }
    catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port, [onlyStyle, onlyView] = process.argv.slice(2);
const views = JSON.parse(readFileSync(join(root, 'test/views.json'), 'utf8'));
const jobs = Object.entries(views).filter(([s]) => !onlyStyle || s === onlyStyle).flatMap(([s, list]) => list.filter(v => !onlyView || v[0] === onlyView).map(v => [s, ...v]));
mkdirSync(join(root, 'test/shots'), {recursive: true});
const proxy = process.env.HTTPS_PROXY;
const browser = await chromium.launch({proxy: proxy ? {server: proxy, bypass: 'localhost,127.0.0.1'} : undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
let next = 0, failed = 0;
await Promise.all([0, 1, 2].map(async () => {
    while (next < jobs.length) {
        const [style, view, lng, lat, z] = jobs[next++], page = await browser.newPage({viewport: {width: 1400, height: 520}});
        await page.goto(`http://localhost:${port}/test/preview.html?s=/dist/styles/${style}.json&lng=${lng}&lat=${lat}&z=${z}${process.env.STATE ? `&g=${encodeURIComponent(process.env.STATE)}` : ""}`);
        await page.waitForTimeout(+(process.env.WAIT ?? 14000));
        await page.screenshot({path: join(root, `test/shots/${style}-${view}.png`)});
        const errors = await page.evaluate(() => window.errors);
        if (errors.length) { failed++; console.error(`${style} ${view}:`, errors); }
        await page.close();
    }
}));
await browser.close(); server.close();
console.log(`${jobs.length} views in test/shots/${failed ? `, ${failed} with errors` : ''}`);
process.exit(failed ? 1 : 0);
