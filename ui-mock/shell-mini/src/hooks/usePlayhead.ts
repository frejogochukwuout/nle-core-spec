/* Playback loop (D3.3): rAF-driven playhead advance; wrap-to-0-and-continue
   at contentEnd; stops nothing by itself (wrap law); empty doc is guarded
   in togglePlay before playing can ever engage. */

import { useEffect, useRef } from 'react';
import { useMini } from '../state/useMini';

export function usePlayhead() {
  const playing = useMini((s) => s.playing);
  const tick = useMini((s) => s.tick);
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last.current) / 1000, 0.1); // clamp huge gaps
      last.current = now;
      tick(dt);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, tick]);
}
