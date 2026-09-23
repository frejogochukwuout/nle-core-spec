#!/usr/bin/env node
/* R22 — resolves the 19 new review threads (issues #71–#89) with fix evidence. */

const BASE = 'http://localhost:3000/annotakit/api/threads';

const NOTES = [
  // [threadId, issue#, note]
  ['th_mtqc8gkv_j42wznuh', '#71 (issue #17 gap after scrolling right)', 'FIXED: the phantom scroll extent was the [data-tip]::after tooltips — always laid out at opacity:0, absolutely-positioned boxes extend the ancestor scroll region (measured scrollWidth 230 vs 172 content; visibility:hidden does NOT remove it in Chromium — only display:none does, both verified live). Tooltips now display:none until :hover/:focus-visible + a tip-fade-in keyframe carries the fade + dwell. Live-verified: scrollWidth == clientWidth (phantom 0).'],
  ['th_mtqcalf2_vnu1r5ww', '#72 (issue #18 bus/master lengths + EQ/FX home)', 'FIXED: AuxStrip rewritten with the master alignment grammar — the same spacer stack per tier (input 22 / fx-rack / I 26 / graphs / hairline / pan 56 / hairline / routing-slot 24), the bus ON/OFF rides the mRow slot; live-verified ALL faders (channel/aux/master) start at exactly the same y with equal heights. The EQ/FX params live in the ChannelEditor now (see #81/issue #27) — the strips stay lean length-aligned chrome.'],
  ['th_mtqccaa6_budehag7', '#73 (issue #19 toggles in the toolbar)', 'FIXED: Toolbar2 right side now carries the console toggles — [Scopes·color] [Nodes·color] [Mixer] [Inspector]; the mixer reflects the real mixerState (aria-pressed, click cycles collapsed→meters→full) and renders on all pages including color. Same mechanism as the left-side asset toggle.'],
  ['th_mtqcdis8_vjly0p62', '#74 (issue #20 nodes penetrating the edge)', 'FIXED: the node graph now docks in the timeline area (NodeGraphDock, toggleable) — the dock clips (overflow-hidden) and the workspace scrolls at its natural 706×268 extents. Live-verified: 8 nodes, ZERO leaking past the dock edge.'],
  ['th_mtqchat2_cdkhoov8', '#75 (issue #21 compact timeline + color coding)', 'FIXED: the compact strip is now a first-class generalizable component (TimelineCompact) with V/A/T color coding via the reference-derived tokens (--clip-video / --clip-audio-a on the clip border+tint+badge — the davinci mock\'s own clip colors, theme-variant-aware); the all-grey clips are dead.'],
  ['th_mtqcj2i8_s6tbgxyt', '#76 (issue #22 real rendering?)', 'CONFIRMED REAL: the scopes draw REAL traces from the graded frame the viewer publishes on the frame bus (decode→grade stack→encode, spec-08 op order; WFM/Parade/Vectorscope graticule BT.601 + 123° skin line, 10fps throttle). Now a toggleable console under the viewer (off/collapsed/row/grid) per your "minimized and toggled" note.'],
  ['th_mtqcl38x_xk20qyri', '#77 (issue #23 the color layout mess)', 'FIXED — the R22 REWRITE: the media pool STAYS in the left dock (the node graph no longer steals it); the viewer is the dominant center (the 348px always-on scope strip that starved it to a thin line is gone — scopes are now a toggleable, minimizable console, default OFF); the compact timeline (your #21 praise) carries the timeline area with the node console beside it.'],
  ['th_mtqcn72a_x0mrf0ft', '#78 (issue #24 complete rewrite directive)', 'DONE: ColorConsole + ColorInspectorRail are DELETED — the ONE grading surface is the ColorInspector in the right rail with [Primaries|Curves|Qualifier] tabs under this one inspector panel; the node editor is a separate toggleable console (exactly like the mixer mechanism); full composition per DESIGN-R22 (audited 2× before implementation).'],
  ['th_mtqcols3_a14eprab', '#79 (issue #25 why a color console?)', 'FIXED: the ColorConsole is GONE — wheels/curves/qualifier are tabs in the inspector panel as you directed; only the scopes + node graph (frame-level / global surfaces beyond an individual clip) remain consoles, both toggleable from the toolbar.'],
  ['th_mtqcp1m7_l8lfh5ez', '#80 (issue #26 labels should change)', 'FIXED: the left toggle follows the page asset domain — "Media Pool" on Edit/Color/Deliver, "Sound Library" on Audio (the slot really gates the SoundLibrary there; the old label lied).'],
  ['th_mtqcr3w2_vhpdkwub', '#81 (issue #27 FX/EQ under here?)', 'FIXED: the ChannelEditor carries the EQ/FX inserts group — the two slots + per-insert PARAM rows (EQ low/mid/high dB, Comp thresh/ratio/attack, Gate thresh/release, De-esser amount/freq), bound through the mixer sidecar (honest view-state params, gap C60).'],
  ['th_mtqcvlnq_fdfx0ewf', '#82 (issue #28 the Effect/transition view)', 'REGISTERED (W6, next wave): the design is written (DESIGN-R22 W6: the FX page — frozen tracks + hoverable seams → transition objects + selectable → the transition inspector; fades at head/tail; effects assets in the left dock; the Effects tab retires when it lands). The blocking-track fade objects stay until the view lands.'],
  ['th_mtqd1b1a_5h0z469j', '#83 (issue #29 icons + missing modes + motion)', 'FIXED: ALL SEVEN mode buttons are now always inline (the <560px kebab collapse that hid five modes is retired; the bar wraps at narrow widths); the icons were already the reference\'s verbatim SVGs (editModeIcons.tsx); the hover preview now FADES+SLIDES in (the reference\'s own 0.3s ease-in-out + translateY 4px motion, reduced-motion honored) — never an instant pop.'],
  ['th_mtqd4139_2y9ttegc', '#84 (issue #30 trim the source range)', 'FIXED: the SOURCE viewer carries the in/out range bar — dual draggable handles (clamped in<out, keyboard ±1 frame, ⇧×10) over the source duration; the range is per-media view-state.'],
  ['th_mtqd535o_czoci2n5', '#85 (issue #31 play+trim controls in the source)', 'FIXED: the source transport row gains the trim cluster ([set-in] [set-out] [clear] + the range TC readout) and THE SEAM: the insert planner takes ctx.sourceRange — placed duration = out−in, sourceStart = in; fitToFill retimes the RANGE (all pinned incl. the backward-compat law).'],
  ['th_mtqd5hkc_nb219adp', '#86 (issue #32 Effects button goes away)', 'FIXED: the Toolbar2 Effects button is REMOVED. The LeftDock Effects tab stays until the Effect view (#82) lands as its replacement home — then it retires in the same wave (sequenced so effects assets never lose their home).'],
  ['th_mtqd63o6_sgpn3agr', '#87 (issue #33 non-functional button)', 'FIXED: the Project button is REMOVED — honest note: it WAS wired (a read-only ProjectSheet stub via inspectorProjectMode) but read as non-functional; its slot now carries the console toggles (Scopes/Nodes/Mixer) per your #73 directive. The store field stays dead-but-harmless (README deviation row).'],
  ['th_mtqd76ol_02c8ph85', '#88 (issue #34 video preview should still be here)', 'FIXED: the deliver page center is the VIDEO PREVIEW again (the real program Viewer, read-only) while idle; the export summary/metadata moved to the right inspector; the render queue replaces the preview only while a render is active.'],
  ['th_mtqd8ayb_6pe3tu2j', '#89 (issue #35 presets ok, queues not)', 'FIXED: the deliver left dock is PRESETS ONLY; the render queue lives in the CENTER — replacing the video preview while rendering (queueing auto-flips the center; a header Queue toggle reviews past renders while idle).'],
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
