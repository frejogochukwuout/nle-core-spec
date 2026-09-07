/**
 * R20-W0 regression test — the app.css cascade-layer discipline.
 *
 * WHY THIS EXISTS (threads th_mtp5r6yl / th_mtp5rda8 — "markers free
 * floating; the code is extremely wrong"): jsdom/vitest runs with
 * `css: false`, so NO test can see the CSS cascade. The unlayered
 * `[data-tip] { position: relative } }` rule outranked Tailwind v4's
 * `@layer utilities` `.absolute` (unlayered author CSS beats layered CSS
 * regardless of specificity), so every data-tip element that also carried
 * Tailwind `.absolute` (ruler marker pins, range-marker caps, clip
 * markers, the debug FAB) computed position:relative — they stacked in
 * normal flow and cascaded diagonally out of the marker band.
 *
 * The fix moved the rule into `@layer base`. This test pins BOTH laws at
 * the source-text level (readFileSync — `?raw` imports are ALSO stubbed
 * by vitest's css:false, so file reads are the only reliable channel):
 *   1. the [data-tip] position rule is inside an @layer base block
 *   2. NO unlayered `[data-tip] { position: … }` declaration remains
 *   3. same law for the button control reset (the R2 cascade bug class)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// import.meta.url is an http URL under vitest/jsdom — resolve from cwd
// (vitest runs with cwd = the shell-variants project root)
const css = readFileSync(resolve(process.cwd(), 'src/styles/app.css'), 'utf8');

/** strip @layer NAME { … } blocks from the text (non-nested, flat blocks) */
function withoutLayerBlocks(text: string): string {
  return text.replace(/@layer\s+[a-z]+\s*\{[\s\S]*?\n\}/g, '');
}

describe('app.css cascade-layer discipline (R20-W0)', () => {
  it('[data-tip] position:relative lives INSIDE @layer base', () => {
    const layered = /@layer\s+base\s*\{[\s\S]*?\[data-tip\]\s*\{[^}]*position:\s*relative[^}]*\}/;
    expect(layered.test(css)).toBe(true);
  });

  it('no UNLAYERED [data-tip] position declaration remains (the free-floating-marker bug)', () => {
    const unlayered = withoutLayerBlocks(css);
    // any `[data-tip] { … position … }` outside @layer blocks = regression
    expect(/\[data-tip\]\s*\{[^}]*position\s*:/.test(unlayered)).toBe(false);
  });

  it('button control reset stays inside @layer base (the R2 cascade bug class)', () => {
    const layered = /@layer\s+base\s*\{[\s\S]*?button\s*\{[^}]*background:\s*none[^}]*\}/;
    expect(layered.test(css)).toBe(true);
    const unlayered = withoutLayerBlocks(css);
    expect(/(^|\})\s*button\s*\{[^}]*background\s*:\s*none/.test(unlayered)).toBe(false);
  });
});

/* ---------- R23-FIX (review-sweep R-d + item 12): the z-ladder bumps + the
   --danger contrast pairs. jsdom runs css:false, so these laws pin at the
   source-text level (this file's own precedent — file reads are the only
   reliable channel into the cascade). ---------- */
const tokens = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

describe('R23-FIX R-d + item 12 + the wrap-round #57: the z-ladder + the danger contrast pairs', () => {
  it('R-d + th_mtr0rlq7 (#57): .confirm-backdrop 106 > .menu-pop 105 > the window-too-small overlay (95) > toasts — the modal order holds over the root-level timeline band', () => {
    expect(/\.confirm-backdrop\s*\{[^}]*z-index:\s*106\s*;/.test(css)).toBe(true);
    expect(/\.menu-pop\s*\{[^}]*z-index:\s*105\s*;/.test(css)).toBe(true);
    expect(/z-index:\s*94\s*;/.test(css)).toBe(false); // the old rung is gone everywhere
    expect(/z-index:\s*93\s*;/.test(css)).toBe(false); // the menu's old rung is gone too
  });

  it('R-d: the toast-close button reaches the 24px hit floor (was 18px; the glyph is unchanged)', () => {
    expect(/\.toast-close\s*\{[^}]*height:\s*24px\s*;/.test(css)).toBe(true);
    expect(/\.toast-close\s*\{[^}]*width:\s*24px\s*;/.test(css)).toBe(true);
    expect(/\.toast-close\s*\{[^}]*height:\s*18px\s*;/.test(css)).toBe(false);
  });

  it('item 12 (R1-P2-3): the --danger-text tint (#ec5d62) exists beside the base --danger token', () => {
    expect(/--danger:\s*#e5484d\s*;/.test(tokens)).toBe(true); // the base token stays the semantic source
    expect(/--danger-text:\s*#ec5d62\s*;/.test(tokens)).toBe(true); // the lighter AA text fork
  });

  it('item 12 (R1-P2-4): .confirm-btn.danger darkens to #cf2f37 — ~5:1 with its white 12px label', () => {
    expect(/\.confirm-btn\.danger\s*\{[^}]*background:\s*#cf2f37\s*;/.test(css)).toBe(true);
  });
});
