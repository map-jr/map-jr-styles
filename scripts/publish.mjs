// Uploads the styles to the R2 bucket behind https://styles.map-jr.org:
//   node scripts/publish.mjs           a release: /<major>/, for the version of package.json (major.minor.0)
//   node scripts/publish.mjs --main    the main branch: /@main/
//   add --dry-run to list the files without uploading them
// Each folder has, from dist/:
//   <name>.json      the style without white space (dist/styles/<name>.min.json), with its images inside it
//   version.json     {version, commit} of what the folder has
// A major version moves with each release of it. A new major version is a breaking change: a layer id renamed or
// removed, a global state property changed, or a newer map-jr-gl needed. Every other change is a new minor version.
// Styles have no patch version. A release that is not newer than the one in its folder stops the script.
// Needs the AWS CLI, CLOUDFLARE_ACCOUNT_ID, R2_BUCKET, and R2_API_TOKEN: an R2 API token with Object Read & Write on the
// bucket. The S3 keys of R2 come from the token: the key ID is the id of the token, and the secret is the SHA-256 of its
// value.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const HOST = 'https://styles.map-jr.org';
const dry = process.argv.includes('--dry-run'), main = process.argv.includes('--main');
const {version} = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const m = /^(\d+)\.(\d+)\.0$/.exec(version);
if (!m || m[1] === '0') throw new Error(`package.json: the version "${version}" is not major.minor.0 with a major version of 1 or more.`);
const folder = main ? '@main' : m[1], release = `${m[1]}.${m[2]}`;
const commit = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();

// A major version: a day in the browser, then up to a week more while the browser fetches it again in the
// background; 5 minutes at the edge (s-maxage), which then also fetches it again in the background. So a release
// reaches the edge in minutes with no purge, and a reader never waits on R2 for a cached file. A style holds its
// images, so an old copy of one file is the previous release and still works.
// The main branch: a minute, so that a change can be seen at once.
const CACHE = main ? 'public, max-age=60, s-maxage=60' : 'public, max-age=86400, stale-while-revalidate=604800, s-maxage=300';

const need = ['CLOUDFLARE_ACCOUNT_ID', 'R2_BUCKET', 'R2_API_TOKEN'].filter(k => !process.env[k]);
if (!dry && need.length) throw new Error(`Set ${need.join(', ')}.`);
const {CLOUDFLARE_ACCOUNT_ID: account = '<account>', R2_BUCKET: bucket = '<bucket>', R2_API_TOKEN: token} = process.env;
const endpoint = `https://${account}.r2.cloudflarestorage.com`;

// The id of the token: an account token is verified on the account, a user token on the user.
let keyId = '<token id>';
if (!dry) {
    const verify = path => fetch(`https://api.cloudflare.com/client/v4${path}`, {headers: {authorization: `Bearer ${token}`}}).then(r => r.json());
    const verified = [await verify(`/accounts/${account}/tokens/verify`), await verify('/user/tokens/verify')].find(r => r.success);
    if (!verified) throw new Error('R2_API_TOKEN: Cloudflare does not accept the token.');
    keyId = verified.result.id;
}
// (R2 does not take the checksums that recent versions of the AWS CLI send by default.)
const env = {...process.env, AWS_REGION: 'auto', AWS_REQUEST_CHECKSUM_CALCULATION: 'when_required', AWS_RESPONSE_CHECKSUM_VALIDATION: 'when_required',
    AWS_ACCESS_KEY_ID: keyId, AWS_SECRET_ACCESS_KEY: token ? createHash('sha256').update(token).digest('hex') : ''};
const aws = (args, opts = {}) => execFileSync('aws', [...args, '--endpoint-url', endpoint], {env, ...opts});

// A release replaces only an older release of its major version. The same release from the same commit is there
// already (a run of the workflow that stopped after the upload): nothing is uploaded again.
if (!dry && !main) {
    let had = {};
    try { had = JSON.parse(aws(['s3', 'cp', `s3://${bucket}/${folder}/version.json`, '-'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']})); } catch {}
    const [, hadMinor] = String(had.version ?? '').split('.').map(Number);
    if (had.version === release && had.commit === commit) {
        console.log(`/${folder}/ has ${release} from ${commit.slice(0, 7)} already: nothing to upload.`);
        process.exit(0);
    }
    if (had.version !== undefined && !(+m[2] > hadMinor)) throw new Error(`/${folder}/ has ${had.version} (${String(had.commit).slice(0, 7)}) already: raise the version in package.json above it.`);
}

// The folder as it is served, made in a temporary directory.
const out = mkdtempSync(join(tmpdir(), 'map-jr-styles-'));
for (const f of readdirSync('dist/styles').filter(f => f.endsWith('.min.json'))) copyFileSync(join('dist/styles', f), join(out, f.replace(/\.min\.json$/, '.json')));
writeFileSync(join(out, 'version.json'), JSON.stringify({version: main ? 'main' : release, commit}));
const files = readdirSync(out, {recursive: true}).filter(f => f.endsWith('.json')).sort();
for (const f of files) console.log(`${HOST}/${folder}/${f}`);

const args = ['s3', 'cp', out, `s3://${bucket}/${folder}/`, '--recursive', '--content-type', 'application/json', '--cache-control', CACHE];
console.log(`\naws ${args.join(' ')}`);
if (!dry) aws(args, {stdio: 'inherit'});
rmSync(out, {recursive: true});

// The style is served, as JSON, from the domain. (At the edge, a major version can still be the previous release for
// a few minutes.)
if (!dry) {
    const url = `${HOST}/${folder}/elevation-color.json`, res = await fetch(url);
    const ok = res.ok && res.headers.get('content-type')?.startsWith('application/json') && (await res.json()).metadata?.['map-jr:images'];
    if (!ok) throw new Error(`${url}: ${res.status} ${res.headers.get('content-type')}`);
    console.log(`${url}: ${res.status}, cf-cache-status ${res.headers.get('cf-cache-status')}`);
}
console.log(dry ? '(dry run: nothing uploaded)' : `/${folder}/ is ${main ? `main at ${commit.slice(0, 7)}` : release}.`);
