/* Filmstrip / thumbnail mock generators — CSS-only mock of RH's decoded
   frame strips (extraction §3: repeat-x background-image, size auto 100%).
   Each media's strip is an SVG data-URI: hue-tinted frames with a subtle
   per-frame divider so the repeat-x tiling reads as a filmstrip. */

import type { Media } from './mockData';

const FRAME_W = 54; // px per "frame" in the strip tile (reads well at 36px lanes)
const FRAME_H = 36;

function svgForHue(hue: number): string {
  // R18f (VLM): desaturated editorial palette — primary-ish hues strained
  // the eye at 36px lanes; ~30% saturation reads as graded footage chips
  const light = `hsl(${hue} 32% 54%)`;
  const mid = `hsl(${hue} 28% 42%)`;
  const dark = `hsl(${hue} 30% 33%)`;
  const divider = `hsl(${hue} 24% 16%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_W}" height="${FRAME_H}" viewBox="0 0 ${FRAME_W} ${FRAME_H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="0.55" stop-color="${mid}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
  </defs>
  <rect width="${FRAME_W}" height="${FRAME_H}" fill="url(#g)"/>
  <rect x="${FRAME_W - 2}" width="2" height="${FRAME_H}" fill="${divider}" opacity="0.85"/>
  <circle cx="${FRAME_W * 0.3}" cy="${FRAME_H * 0.35}" r="${FRAME_H * 0.1}" fill="rgba(255,255,255,0.28)"/>
  <rect x="${FRAME_W * 0.12}" y="${FRAME_H * 0.72}" width="${FRAME_W * 0.4}" height="${FRAME_H * 0.08}" rx="2" fill="rgba(255,255,255,0.18)"/>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** repeat-x filmstrip tile for a media asset (video/image clips). */
export function filmstripFor(media: Media): string {
  return svgForHue(media.hue);
}

/** media-pool card thumbnail gradient (hue-tinted, larger format). */
export function thumbGradientFor(media: Media): string {
  return `linear-gradient(135deg, hsl(${media.hue} 45% 55%), hsl(${media.hue + 24} 40% 38%))`;
}
