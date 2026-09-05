/* Convenience hooks bridging the variant context into leaf components
   (keeps Clip/TrackHeader free of provider imports). */

import { useVariant } from '../components/debug/VariantProvider';
import { trackHeights } from './useUiStore';
import type { TrackJSON } from '../lib/mockData';

export function useVariantClipStyle() {
  return useVariant().variant.clipStyle;
}

export function useLaneHeight(kind: TrackJSON['kind']): number {
  const clipStyle = useVariant().variant.clipStyle;
  return trackHeights(kind, clipStyle);
}

export function useHeaderStyle() {
  return useVariant().variant.headerStyle;
}
