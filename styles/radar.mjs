// "Radar": a quiet neutral base for an overlay (a county or zip code choropleth, snowfall), with relief and peaks
// for context. No hue except the peaks, and labels that survive a tint on top.
import {useIcons, retune, scheme, peaksWithoutZero, layer} from '../lib/style.mjs';
import {ICON_DARK, PLATE} from './shared.mjs';

export const source = 'styles/src/radar.json';

const PAIRS = {
    
    '#18252d|rgba(255, 255, 255, 1)':'#1b1f24',
    '#0b2638|rgb(217, 218, 221)':'#30373f','#0b2638|hsl(205, 56%, 73%)':'#30373f',
    '#203b35|rgb(237, 237, 237)':'#535b63','#203b35|rgb(244, 244, 244)':'#474f57',
    '#223039|rgb(240, 240, 240)':'#414850','#223039|rgb(255, 255, 255)':'#1b1f24',
    '#3c4a54|rgba(212, 204, 176, 1)':'#42454a',
    '#494338|rgb(188, 188, 188)':'#727980','#617c87|rgb(243, 243, 243)':'#2c3238',
    '#536570|rgba(255, 255, 255, 1)':'#434a52',
    '#657783|#eee':'#454c54','#657783|#fff':'#454c54','#657783|hsl(0, 0%, 92%)':'#373d44','#657783|hsl(0, 0%, 97%)':'#30363c',
    '#c6a377|hsl(0, 0%, 92%)':'#50575f',
    '#657783|hsl(47, 26%, 88%)':'#3b4147','#657783|rgb(250, 250, 250)':'#30363c',
    '#657783|hsl(34, 12%, 66%)':'#63676e','#82919c|hsl(34, 12%, 66%)':'#63676e',
    '#82929c|rgb(194, 201, 209)':'#6b747d','#82929c|rgba(184, 192, 201, 0.5)':'rgba(107, 116, 125, 0.7)',
    '#c0cdd0|rgb(107, 115, 124)':'#a4adb5','#c0cdd0|rgb(215, 217, 220)':'#858f98',
    '#e4e9e9|rgb(141, 148, 156)':'#858f98',
    '#17232c|rgba(255, 255, 255, 0.75)':'rgba(27, 31, 36, 0.8)','#17232c|rgba(255, 255, 255, 0.25)':'rgba(27, 31, 36, 0.8)','#17232c|#ffffff':'#1b1f24',
    '#070f19|hsl(39, 21%, 33%)':'#050608',
    '#dfbe92|#666':'#a4adb5','#dfbe92|rgba(165, 71, 8, 1)':'#eaa76b',
    '#dfbe92|#725a50':'#c9ad94','#22303a|#fff':'#1b1f24','#5b6b76|#bbb':'#50575f',
};

export function build(style, icons) {
    useIcons(style, icons, ICON_DARK, PLATE.dark);
    peaksWithoutZero(style);
    retune(style, PAIRS);
    Object.assign(layer(style, 'terrain-rgb-terrarium').paint, {
        'hillshade-highlight-color': scheme('#7b858e', '#FFFFFF'), 'hillshade-accent-color': scheme('#000000', '#000000'),
        'hillshade-exaggeration': ['interpolate', ['linear'], ['zoom'], 10, scheme(0.45, 0.2), 16, scheme(0.3, 0.1)],
    });
    // Light: the airport label was a near-white grey on white.
    const airport = layer(style, 'label_airport').paint;
    airport['text-color'][3] = 'rgb(141, 148, 156)'; airport['text-halo-color'][3] = 'rgba(255, 255, 255, 0.75)';
}
