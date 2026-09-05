import { useState } from 'react';
import { Topbar } from './shell/Topbar';
import { MediaPool } from './shell/MediaPool';
import { Viewer } from './shell/Viewer';
import { Inspector } from './shell/Inspector';
import { ToastRegion } from './shell/ToastRegion';
import { Splitter } from './shell/Splitter';
import { Timeline } from './timeline/Timeline';
import { usePlayhead } from './hooks/usePlayhead';

/* Layout metrics (R18d splitters — feedback #13): the pool/inspector widths
   and the timeline height are drag-resizable with sane rails; defaults are
   the old fixed sizes so the default frame is pixel-identical. R18f: min
   raised to 184 — the panel's natural content height (tools 42 + ruler 34
   + padding 16 + lanes 2×36 + gap 8 + stage margin 12 + border 2) — below
   that the audio lane clipped with no scroll (review P1-1). */
const POOL_W = { initial: 260, min: 180, max: 420 };
const INSP_W = { initial: 240, min: 180, max: 400 };
const TL_H = { initial: 190, min: 186, max: 440 }; // R18f wave-2: 186 = natural content height + slack so the playhead line reaches the last lane bottom

export default function App() {
  usePlayhead(); // useKeys lives in Timeline (R18f review P1-4 — solo
  // Timeline stories need the advertised shortcuts too)
  const [poolW, setPoolW] = useState(POOL_W.initial);
  const [inspW, setInspW] = useState(INSP_W.initial);
  const [tlH, setTlH] = useState(TL_H.initial);

  return (
    <div className="mini-root" data-testid="mini-root">
      <Topbar />
      <div className="mini-main">
        <div style={{ width: poolW, flexShrink: 0, display: 'flex', minWidth: 0 }}>
          <MediaPool />
        </div>
        <Splitter
          orientation="vertical"
          value={poolW}
          min={POOL_W.min}
          max={POOL_W.max}
          initial={POOL_W.initial}
          onChange={setPoolW}
          label="Media pool width"
        />
        <Viewer />
        <Splitter
          orientation="vertical"
          value={inspW}
          min={INSP_W.min}
          max={INSP_W.max}
          initial={INSP_W.initial}
          onChange={setInspW}
          label="Inspector width"
        />
        <div style={{ width: inspW, flexShrink: 0, display: 'flex', minWidth: 0 }}>
          <Inspector />
        </div>
      </div>
      <Splitter
        orientation="horizontal"
        value={tlH}
        min={TL_H.min}
        max={TL_H.max}
        initial={TL_H.initial}
        onChange={setTlH}
        label="Timeline height"
      />
      <Timeline style={{ height: tlH }} />
      <ToastRegion />
    </div>
  );
}
