#!/usr/bin/env node
/* R25 — resolves the 19 post-R24 review threads (the reviewer's second pass
 * over the R24 state) with fix evidence from the R25 waves. */

const BASE = 'http://localhost:3000/annotakit/api/threads';

const NOTES = [
  ['th_mtzoi7vr_dijey6gz', '#1 (console multi-tab)', 'DONE — the console row next to the timeline is now a thin TAB STRIP: [Timeline | Nodes | Scopes] on the color page ([Timeline | Export] on deliver). Clicking the Scopes button you pinned ACTIVATES the scopes tab — "takes the same space, a thin tab to toggle" is exactly the law that landed. The under-viewer pane is retired (superseded by your ruling).'],
  ['th_mtzokuem_k3qgaee4', '#2 (scopes: panel or under inspector?)', 'ANSWERED by your own heuristic — scopes react to the PLAYHEAD FRAME (always-on signal analysis, the mixer-console class), NOT to clip selection → PANEL, and specifically the console-row TAB beside the node graph (Resolve\'s own bottom-right switchable slot). The inspector stays selection-reactive only. Node editor separate: kept as its own tab.'],
  ['th_mtzolu4o_cxdf6ud4', '#3 (wheels not working correctly)', 'RESEARCHED + REBUILT to Resolve\'s real grammar (manual-verified): drags are RELATIVE/ACCUMULATING (trackball-style — grab anywhere, the vector accumulates across strokes, clamped at the rim), LIVE YRGB readouts during the drag, center = neutral with continuous complementary crossing, the master luma is a horizontal DIAL below each wheel (left darker/right lighter) + Ctrl/Cmd+drag inside the disc adjusts the master, Shift+drag = absolute jump, dbl-click disc = color-only reset, per-wheel corner button = color+master. One undo entry per gesture.'],
  ['th_mtzom4xu_uuggebjx', '#4 (what does this mean and do?)', 'REBUILT — the confusing target row is now the self-explaining GRADE TARGET breadcrumb: [Clip name · track] ▸ [Clip grade | Timeline grade] ▸ [Node n · label]. Every chip says what it is; the node chip clicks through to focus that node in the graph.'],
  ['th_mtzomdge_qh4k25ie', '#5 (repeat again here too)', 'DONE — the same clarity grammar covers the Timeline-grade badge: the exact copy is "Timeline grade — applies to every clip in this timeline, after clip grades" (Resolve has no track-level grade; the tooltip says so).'],
  ['th_mtzonhlu_f35ocwt4', '#6 (inspector reacts to clip OR node — need clarity)', 'DONE — the 3-chip breadcrumb makes the target model unambiguous: the SCOPE (which clip / timeline), the LEVEL (clip grade vs timeline grade), the NODE (which node the wheels edit). One accent color across the breadcrumb, the graph header, and the selected node. Clicking a clip on the color page now also MOVES THE PLAYHEAD so the viewer/scopes show what you are grading (the divergence trap is dead).'],
  ['th_mtzoo09d_hrcfvqvc', '#7 (timeline target: one track? all?)', 'ANSWERED — the Timeline grade applies to EVERY clip in the timeline, applied AFTER clip grades (the whole-timeline output stage). The tip says exactly this; "one track" is never implied (Resolve has no track grade).'],
  ['th_mtzors21_5b0xnzcq', '#8 (audio tracks not compacted under audio view)', 'DONE — compact is now a 4-way scope: off / compact-video / compact-audio / compact-all. The AUDIO page boots compact-video (audio tracks FULL with their waveform room). Each page remembers its own scope + clip style + waveforms (per-view memory).'],
  ['th_mtzou0op_gw2no07n', '#9 (mini toggles for console elements + [I])', 'DONE — the dock header carries mini visibility toggles: FX sends grid / pan / input row (the [I] thing) / EQ graphs. Per-block view-state, honest at every density.'],
  ['th_mtzovsvz_k6ligae4', '#10 (hover causes the dialer area to jump)', 'FIXED — the RSM row\'s hover state is layout-invariant now (color-only class changes; the pan dial\'s flow cannot shift). Live-verified bit-identical geometry through hover.'],
  ['th_mtzoxrhb_rxhzc339', '#11 (wrong icon)', 'FIXED — the dock-header glyphs were audited against their functions; the master-bus meters-only toggle\'s speedometer glyph replaced with the semantically honest one, the collapse glyph checked against its vertical semantics.'],
  ['th_mtzoy9f9_k9hh9l35', '#12 (redundant mixer button)', 'REMOVED — the timeline-toolbar mixer toggle is gone (deletion-pinned). The top toolbar\'s Mixer button is the ONE toggle.'],
  ['th_mtzozdvo_9vllsxv9', '#13 (responsive design, not mini-style switch)', 'DONE — the hard floor became a progressive ladder: full (T0/T1/T2 tiers) → lean (optional blocks hide) → core (meters+fader) → mini (the pure MetersDock, only when even meters+fader cannot fit). The dock measures itself; nothing jumps straight to mini.'],
  ['th_mtzp4arw_cczbcc4s', '#14 (export summary → separate panel)', 'DONE — the export summary moved to the console row as the Export tab ([Timeline | Export], the same family as the mixer console). The right column keeps only inspection-family content; the split is documented.'],
  ['th_mtzp4xeb_wy9g6uco', '#15 (custom JSON format)', 'DONE — the Custom JSON preset (4th tile) with a REAL export: the active scene\'s tracks/elements/metadata serialized through a pure builder (nle-interchange/1 schema, deterministic key order) and downloaded as a real .json file. Pinned.'],
  ['th_mtzp5tvg_2qxnjvdn', '#16 (inspector refresh after view/editor mode change)', 'DONE — the stale-entity audit across ALL mode transitions (page switches, fxMode, audio-focus, viewer flip): every out-of-scope domain clears at the store level; the surviving domains (clip selection across pages — Resolve semantics) pinned as correct.'],
  ['th_mtzp83mp_slpmljyq', '#17 (no play control, in/out crop not functional)', 'DONE — the source viewer has the FULL transport now (play/pause + step + go-to-start/end + a source playhead that scrubs the poster — Resolve treats stills as normal clips with real playback of the frozen frame). The I/O crop: bracket handles + out-of-range DIMMING on the strip + the range drives every insert; the duration readout follows the range.'],
  ['th_mtzp8e02_i964h24i', '#18 (insert mode previews broken?)', 'ROOT-CAUSED + FIXED — the edit bar was flex-STARVED to 0px below ~1000px canvas (the transport row\'s fixed-width siblings ate it; at review-canvas widths the buttons were invisible, so the previews were unreachable). The row is now a responsive priority ladder: all 7 buttons visible at every usable width (labels → icons → tooltips), the readouts degrade first. Plus the full wave: previews verified live for all 7 modes + the commit + the auto-scroll.'],
  ['th_mtzp94ms_fx38y5p0', '#19 (timeline style remembered per view mode)', 'DONE — per-page view memory: compact scope / clip style / waveforms are remembered per page; switching pages restores each page\'s own settings automatically.'],
];

(async () => {
  let ok = 0, fail = 0;
  for (const [id, issue, note] of NOTES) {
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved', comment: `${issue} — ${note}` }),
      });
      if (res.ok) { ok++; console.log(`RESOLVED ${id} (${issue})`); }
      else { fail++; console.error(`FAIL ${id}: ${res.status} ${await res.text()}`); }
    } catch (e) {
      fail++;
      console.error(`ERR ${id}: ${e.message}`);
    }
  }
  console.log(`\n${ok} resolved, ${fail} failed`);
})();
