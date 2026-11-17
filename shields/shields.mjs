// Road shields: a few SVG templates that stretch around the route number (`icon-text-fit`), and the look of each network.
//
// `route_1_network` of the OpenMapTiles layer `transportation_name` names the network of the first route of a road.
// A network that is not listed here gets the plain plate.

/** How each shape stretches: the columns and rows that grow, and the box the text sits in (CSS pixels of the viewBox). */
export const SHAPES = {
    rect: {stretchX: [[5, 15]], stretchY: [[5, 11]], content: [4, 2, 16, 14]},
    pill: {stretchX: [[9, 13]], stretchY: [[7.5, 8.5]], content: [5.5, 2, 16.5, 14]},
    hex: {stretchX: [[8, 16]], stretchY: [[7.5, 8.5]], content: [6, 2, 18, 14]},
    // (The stretch columns stay clear of the point at the top and bottom centre.)
    us_interstate: {stretchX: [[5, 8], [14, 17]], stretchY: [[11, 14]], content: [5.6, 8.6, 16.4, 18.2]},
    us_highway: {stretchX: [[9.2, 10.4], [11.6, 12.8]], stretchY: [[7, 12]], content: [5.5, 3, 16.5, 15]},
};

import {readFileSync} from 'node:fs';

const US_STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ').map(s => 'US:' + s);
// The sign colours of OSM Americana.
const BLUE = '#003f87', RED = '#bf2033', GREEN = '#006747';

/**
 * Networks whose look is set by hand: shields that Americana draws from artwork, and networks of the OpenFreeMap
 * tiles that its definitions do not have. They win over shields/networks.json.
 * `color` is a second colour of the shape (the crown of an Interstate shield).
 */
const MANUAL = [
    {shape: 'us_interstate', background: BLUE, color: RED, border: '#ffffff', text: '#ffffff', networks: ['US:I']},
    {shape: 'us_highway', plate: true, networks: ['US:US']},
    // (Most states have a shield of their own in Americana. Here each gets the pill, as the source styles did.)
    {shape: 'pill', plate: true, networks: US_STATES},
    {shape: 'hex', background: BLUE, border: '#ffffff', text: '#ffffff', networks: ['BAB']},
    {shape: 'hex', background: GREEN, border: '#ffffff', text: '#ffffff', networks: ['IT:A-road']},
    {shape: 'rect', background: RED, border: '#ffffff', text: '#ffffff', networks: ['CH:motorway', 'ch:motorway', 'NZ:SH']},
    {shape: 'rect', background: GREEN, border: '#ffffff', text: '#ffffff', networks: ['CA:transcanada', 'CN:expressway', 'RO:A', 'RS:motorway']},
    {shape: 'rect', background: '#1d2f7a', border: '#ffffff', text: '#ffffff', networks: ['AsianHighway', 'AH']},
];

/**
 * The look of each network: MANUAL, then shields/networks.json (made by scripts/update-shields.mjs from Americana).
 * `plate: true` is the neutral plate, which follows the colour scheme of the map: a black-on-white sign gets it.
 * The others keep the colours of the real signs in both schemes.
 */
const taken = new Set(MANUAL.flatMap(n => n.networks));
export const NETWORKS = [...MANUAL, ...JSON.parse(readFileSync(new URL('./networks.json', import.meta.url), 'utf8'))
    .map(n => ({...n, networks: n.networks.filter(x => !taken.has(x))})).filter(n => n.networks.length)
    .map(n => n.background === '#ffffff' && n.border === '#000000' && n.text === '#000000' ? {shape: n.shape, plate: true, networks: n.networks} : n)];
