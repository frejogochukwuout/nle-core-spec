/* Variant dimension model — the debug overlay (ctrl+`) toggles these.
   Preset A is the spec-18 canon; B and C are exploratory directions. */

export type Theme = 'resolve' | 'studio' | 'light';
export type Density = 'pro' | 'comfortable';
export type ClipStyle = 'filmstrip' | 'blocks';
export type Accent = 'gold' | 'ember' | 'violet';
export type HeaderStyle = 'readout' | 'slim';

export interface Variant {
  theme: Theme;
  density: Density;
  clipStyle: ClipStyle;
  accent: Accent;
  headerStyle: HeaderStyle;
}

export const DEFAULT_VARIANT: Variant = {
  theme: 'resolve',
  density: 'pro',
  clipStyle: 'filmstrip',
  accent: 'gold',
  headerStyle: 'readout',
};

export interface Preset {
  id: 'A' | 'B' | 'C';
  name: string;
  tagline: string;
  variant: Variant;
  specNote: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'A',
    name: 'Resolve Classic',
    tagline: 'spec 18 §9 canon — DaVinci muscle memory, maximal density',
    variant: { theme: 'resolve', density: 'pro', clipStyle: 'filmstrip', accent: 'gold', headerStyle: 'readout' },
    specNote: 'Spec-canonical: exact token values from 18 §9 + track heights from 05 §12.2. The safe direction.',
  },
  {
    id: 'B',
    name: 'Modern Studio',
    tagline: 'elevated dark, visible hairlines, roomier controls, violet accent',
    variant: { theme: 'studio', density: 'comfortable', clipStyle: 'filmstrip', accent: 'violet', headerStyle: 'slim' },
    specNote: 'Deviations: radius 8px, floating elevated panels, 40px bars, 112px slim headers (OpenCut teacher value from 05 §10 note), accent-token swap. Tone: pro-web (Linear/Figma register) instead of desktop NLE.',
  },
  {
    id: 'C',
    name: 'Editorial Light',
    tagline: 'web-first light surface — approachable, editorial, review-friendly',
    variant: { theme: 'light', density: 'comfortable', clipStyle: 'filmstrip', accent: 'gold', headerStyle: 'slim' },
    specNote: 'Deviates from spec 18 §8.14 (light theme rejected for v1) and §9 (single dark theme). Exists so the rejection can be reacted to with eyes on it — grey-lifted chrome, near-black monitor surround, banded lanes.',
  },
];

/* ---------- persistence + share links ---------- */

const LS_KEY = 'nle-shell-variants:v1';

export function serializeVariant(v: Variant): string {
  return [
    `theme:${v.theme}`,
    `density:${v.density}`,
    `clip:${v.clipStyle}`,
    `accent:${v.accent}`,
    `header:${v.headerStyle}`,
  ].join(',');
}

export function parseVariant(s: string | null | undefined): Variant | null {
  if (!s) return null;
  const out: Record<string, string> = {};
  for (const part of s.split(',')) {
    const [k, v] = part.split(':');
    if (k && v) out[k.trim()] = v.trim();
  }
  const theme = out['theme'] as Theme | undefined;
  if (theme !== 'resolve' && theme !== 'studio' && theme !== 'light') return null;
  const density = (out['density'] as Density) === 'comfortable' ? 'comfortable' : 'pro';
  const clipStyle = (out['clip'] as ClipStyle) === 'blocks' ? 'blocks' : 'filmstrip';
  const accent = ['gold', 'ember', 'violet'].includes(out['accent']) ? (out['accent'] as Accent) : 'gold';
  const headerStyle = (out['header'] as HeaderStyle) === 'slim' ? 'slim' : 'readout';
  return { theme, density, clipStyle, accent, headerStyle };
}

export function loadVariant(): Variant {
  // URL hash wins (shareable), then localStorage, then default
  const fromHash = parseVariant(new URLSearchParams(location.hash.replace(/^#/, '')).get('v'));
  if (fromHash) return fromHash;
  try {
    const fromLS = parseVariant(localStorage.getItem(LS_KEY));
    if (fromLS) return fromLS;
  } catch { /* private mode etc. */ }
  return DEFAULT_VARIANT;
}

export function saveVariant(v: Variant) {
  try { localStorage.setItem(LS_KEY, serializeVariant(v)); } catch { /* ignore */ }
  const q = new URLSearchParams(location.hash.replace(/^#/, ''));
  q.set('v', serializeVariant(v));
  history.replaceState(null, '', `#${q.toString()}`);
}

export function matchesPreset(v: Variant, p: Preset): boolean {
  return serializeVariant(v) === serializeVariant(p.variant);
}
