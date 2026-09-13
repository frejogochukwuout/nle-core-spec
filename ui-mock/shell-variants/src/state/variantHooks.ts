/* Convenience hooks bridging the variant context into leaf components
   (keeps Clip/TrackHeader free of provider imports). */

import { useVariant } from '../components/debug/VariantProvider';
import { resolveTrackClipStyle, trackHeights, useUi } from './useUiStore';
import type { TrackJSON } from '../lib/mockData';
import type { ClipStyle } from '../lib/variants';

export function useVariantClipStyle() {
  return useVariant().variant.clipStyle;
}

/** R25-W6-A/W6-C (th_mtzp94ms + th_mtzors21): the per-track clip-style
 *  resolution — the ACTIVE page's entry (its own memory) compacted per kind
 *  by the compact scope (compacted kinds resolve 'blocks'), else the page's
 *  style, else the live VARIANT default. ONE resolver seam (the store's
 *  resolveTrackClipStyle); the Clip body + the Timeline lane heights can
 *  never disagree. */
export function useTrackClipStyle(kind: TrackJSON['kind']): ClipStyle {
  const variantClipStyle = useVariant().variant.clipStyle;
  return useUi((s) => resolveTrackClipStyle(s, kind, variantClipStyle));
}

export function useLaneHeight(kind: TrackJSON['kind']): number {
  const clipStyle = useVariant().variant.clipStyle;
  return trackHeights(kind, clipStyle);
}

export function useHeaderStyle() {
  return useVariant().variant.headerStyle;
}
