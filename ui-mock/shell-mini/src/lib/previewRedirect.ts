/* Preview-plumbing redirect shim (platform layer, NOT app behavior —
   deliberately outside the design contract's interaction laws).
   Law: Caddy's ?XTransformPort query matcher is CASE-SENSITIVE, and even a
   correctly-cased request can never render the Storybook dev manager
   (sub-resource URLs don't carry the query → they fall to :3000 → 404 →
   JS never executes — SKILL.md "preview-URL serving" Law 3).
   Users who type ?xtransformport=6007 in any casing therefore land on the
   app with nothing happening — the most confusing possible outcome. This
   shim catches that exact case at the app's entry and bounces it to the
   working public Storybook surface: the static mount at /stories/. */

/** Minimal structural type for window.location (keeps the shim testable). */
export interface LocationLike {
  search: string;
  replace(url: string): void;
}

export const STORYBOOK_PORT = '6007';
export const STORIES_PATH = '/stories/index.html';

/** Returns the redirect target if this location looks like a mis-cased
 *  XTransformPort attempt to reach the storybook; null otherwise. */
export function previewRedirectTarget(search: string): string | null {
  const params = new URLSearchParams(search);
  // URLSearchParams keys are case-sensitive on read; probe both the exact
  // platform casing and any lower/upper variant users actually type.
  for (const key of [
    'xtransformport',
    'XTransformPort',
    'XTransformport',
    'XTRANSFORMPORT',
  ]) {
    if (params.get(key) === STORYBOOK_PORT) return STORIES_PATH;
  }
  return null;
}

/** Called once at app entry (main.tsx), before React mounts. */
export function applyPreviewRedirect(loc: LocationLike): boolean {
  const target = previewRedirectTarget(loc.search);
  if (!target) return false;
  loc.replace(target);
  return true;
}
