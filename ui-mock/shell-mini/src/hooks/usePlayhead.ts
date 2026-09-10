/* Playback loop (D3.3): rAF-driven playhead advance; wrap-to-0-and-continue
   at contentEnd; stops nothing by itself (wrap law); empty doc is guarded
   in togglePlay before playing can ever engage.

   PR69 C3: the loop is now a MOUNT-SAFE SINGLETON — exactly one rAF loop
   per document no matter how many surfaces mount the hook (Viewer AND
   Timeline both mount it in the full shell; two loops would double-tick
   the playhead). The mount count + the latest `playing` value drive one
   shared loop, so ANY solo story surface (viewer panel, timeline panel,
   full app) plays for real — the old App-only mount left every solo
   story's Play button flipping the icon over a frozen timecode. */

import { useEffect } from 'react';
import { useMini } from '../state/useMini';

let mounts = 0; // how many mounted surfaces currently own the loop
let wantPlaying = false; // the latest `playing` value any mount observed
let raf = 0;
let last = 0;

function ensureLoop(): void {
  const shouldRun = mounts > 0 && wantPlaying;
  if (shouldRun && raf === 0) {
    last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1); // clamp huge gaps
      last = now;
      useMini.getState().tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  } else if (!shouldRun && raf !== 0) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

export function usePlayhead() {
  const playing = useMini((s) => s.playing);
  useEffect(() => {
    mounts += 1;
    wantPlaying = playing; // every mount observes the same store value
    ensureLoop();
    return () => {
      mounts -= 1;
      ensureLoop(); // the last unmount (or a stop) parks the loop
    };
  }, [playing]);
}
