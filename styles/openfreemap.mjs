// The styles of OpenFreeMap (https://github.com/hyperknot/openfreemap-styles), as they are, with the images of the
// sprite inside the style. They have no dark branch and no road shields of this repository.
import {inlineSprite} from '../lib/style.mjs';

const HOST = 'tiles.openfreemap.org';

export const styles = ['bright', 'dark', 'fiord', 'liberty', 'positron'].map(name => ({
    name: `openfreemap-${name}`,
    source: `styles/src/openfreemap/${name}.json`,
    build(style, icons) {
        // (The source has a placeholder for the host of the tiles and the fonts.)
        const host = o => { for (const k in o) { if (typeof o[k] === 'string') o[k] = o[k].replaceAll('__TILEJSON_DOMAIN__', HOST); else if (o[k] && typeof o[k] === 'object') host(o[k]); } };
        host(style);
        const missing = inlineSprite(style, icons);
        const n = Object.keys(style.metadata['map-jr:images']).length;
        console.log(`openfreemap-${name}: ${n} images${missing.length ? `; not in the sprite either: ${missing.join(', ')}` : ''}`);
    },
}));
