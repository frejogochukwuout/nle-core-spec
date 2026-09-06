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
