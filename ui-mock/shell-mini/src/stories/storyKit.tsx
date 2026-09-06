/* Shared story plumbing (R18k storybook restructure — the user's ask:
   "use control for state variations, group elements meaningfully from
   micro to macro"). Storybook args are the REVIEW surface; the store is
   the app's truth. StoreArgs re-applies the whole args→patch mapping
   whenever ANY control changes — controls describe state, so a control
   change must win over ephemeral in-story interaction (a clip dragged in
   the story resets when the reviewer next touches a control; that is the
   honest contract of a state story). */

import { useLayoutEffect } from 'react';
import { useMini } from '../state/useMini';
import { seedDoc, multiTrackDoc, type Doc } from '../lib/mockData';

export type Patch = Partial<ReturnType<typeof useMini.getState>>;

/** Applies a store patch before first paint AND on every args change
 *  (mount-only patches would freeze the controls after the first paint). */
export function StoreArgs({ patch }: { patch: Patch }) {
  // JSON round-trip: the patch is plain data (doc + primitives), and the
  // serialized form is a stable dependency key — a new object identity
  // per render would loop the effect on every parent render.
  const key = JSON.stringify(patch);
  useLayoutEffect(() => {
    useMini.setState(JSON.parse(key) as Patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-apply exactly when the args change
  }, [key]);
  return null;
}

/** The `project` control's doc variants:
 *  - seed: the basic V1+A1 project (default)
 *  - multi: V1/V2/A1/A2 — the track-binding demo world (thread #3)
 *  - empty: seed tracks, no clips (the empty-lanes review surface) */
export function docFor(project: 'seed' | 'multi' | 'empty'): Doc {
  if (project === 'multi') return multiTrackDoc();
  if (project === 'empty') {
    const d = seedDoc();
    return { tracks: d.tracks, media: d.media, clips: [] };
  }
  return seedDoc();
}

/** Selection mapping for the radio controls ('none' → null). */
export function selectionFor(id: string): string | null {
  return id === 'none' ? null : id;
}
