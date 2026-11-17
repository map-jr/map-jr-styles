// Draws the icons of icons/extra.json ("maki") into icons/extra/, in the look of the POI discs of the sprite:
// a white disc with a grey ring and the Maki glyph in the colour of its category.
//   node scripts/update-icons.mjs <folder with the Maki icons>     (https://github.com/mapbox/maki, icons/, CC0)
import {readFileSync, writeFileSync} from 'node:fs';

const maki = process.argv[2];
if (!maki) { console.error('Give the folder with the Maki icons: node scripts/update-icons.mjs ../maki/icons'); process.exit(1); }
const {maki: list} = JSON.parse(readFileSync(new URL('../icons/extra.json', import.meta.url), 'utf8'));
const disc = (size, body) => {
    const d = size - 2, r = d / 2, at = `x="1" y="1" width="${d}" height="${d}" rx="${r}" ry="${r}"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" height="${size}" width="${size}"><rect ${at} fill="#bbb" stroke="#bbb" stroke-width="2" style="stroke-linejoin:round;stroke-miterlimit:4"/><rect ${at} fill="#fff"/>${body}</svg>\n`;
};
for (const [name, {glyph, color}] of Object.entries(list)) {
    const svg = readFileSync(`${maki}/${glyph}.svg`, 'utf8'), inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)[1].trim();
    if (/fill=|style=|<(?!path\b|\/path)/.test(inner)) throw new Error(`${glyph}: more than plain paths, which this script does not handle.`);
    const paths = inner.replace(/<path /g, `<path fill="${color}" `);
    // (A Maki glyph is 15 px. The 21 px disc has it as it is, the 17 px disc at 11 px.)
    writeFileSync(new URL(`../icons/extra/${name}.svg`, import.meta.url), disc(21, `<g transform="translate(3 3)">${paths}</g>`));
    writeFileSync(new URL(`../icons/extra/${name}_11.svg`, import.meta.url), disc(17, `<g transform="translate(3 3) scale(${11 / 15})">${paths}</g>`));
}
console.log(`${Object.keys(list).length * 2} icons in icons/extra/`);
