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
    us_interstate: {stretchX: [[5, 8], [14, 17]], stretchY: [[11, 14]], content: [4.5, 8, 17.5, 19]},
    us_highway: {stretchX: [[9.2, 10.4], [11.6, 12.8]], stretchY: [[7, 12]], content: [4.5, 3, 17.5, 15]},
};

const US_STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ').map(s => 'US:' + s);
const AU = 'NSW VIC QLD SA WA TAS NT ACT'.split(' ').map(s => 'AU:' + s);
const BLUE = '#2a5ca8', RED = '#c8372d', GREEN = '#1f7a4d', YELLOW = '#ffd23f', NAVY = '#1d2f7a';

/**
 * The look of each network. `plate: true` is the neutral plate, which follows the colour scheme of the map; the others
 * keep the colours of the real signs in both schemes. `color` is a second colour of the shape (the crown of an Interstate shield).
 */
export const NETWORKS = [
    {id: 'us-interstate', shape: 'us_interstate', background: BLUE, color: RED, border: '#ffffff', text: '#ffffff', networks: ['US:I']},
    {id: 'us-highway', shape: 'us_highway', plate: true, networks: ['US:US']},
    {id: 'us-state', shape: 'pill', plate: true, networks: US_STATES},
    {id: 'autobahn', shape: 'hex', background: BLUE, border: '#ffffff', text: '#ffffff', networks: ['BAB']},
    {id: 'autostrada', shape: 'hex', background: GREEN, border: '#ffffff', text: '#ffffff', networks: ['IT:A-road']},
    {id: 'blue', shape: 'rect', background: BLUE, border: '#ffffff', text: '#ffffff', networks: ['omt-gb-motorway', 'omt-ie-motorway', 'ES:A-road', 'ES:AP-highway', 'ES:R-highway', 'AT:A-road', 'AT:S-road', 'HU:motorway', 'JP:national']},
    {id: 'red', shape: 'rect', background: RED, border: '#ffffff', text: '#ffffff', networks: ['FR:A-road', 'FR:N-road', 'NL:A', 'CH:motorway', 'ch:motorway', 'PL:motorway', 'PL:expressway', 'NZ:SH', 'CN:national']},
    {id: 'green', shape: 'rect', background: GREEN, border: '#ffffff', text: '#ffffff', networks: ['e-road', 'CA:transcanada', 'CN:expressway', 'JP:E', 'RO:A', 'RS:motorway']},
    {id: 'green-yellow', shape: 'rect', background: GREEN, border: YELLOW, text: YELLOW, networks: ['omt-gb-trunk', 'omt-ie-national', ...AU]},
    {id: 'yellow', shape: 'rect', background: YELLOW, border: '#222222', text: '#222222', networks: ['NL:N', 'DE:national', 'IN:NH', 'IN:NE']},
    {id: 'navy', shape: 'rect', background: NAVY, border: '#ffffff', text: '#ffffff', networks: ['AsianHighway', 'AH']},
];
