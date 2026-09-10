#!/usr/bin/env node
/* R24 — resolves the 14 review threads (#58–#71, GH mirror #112–#125) with
 * fix evidence from the R24 reconstruction round. */

const BASE = 'http://localhost:3000/annotakit/api/threads';

const NOTES = [
  ['th_mtu0kssn_s0buhv84', '#58 (transitions at an occupied seam)', 'RESEARCHED (FCP/Premiere/Resolve unanimous) + FIXED: ONE transition per seam, DRAG-TO-REPLACE — dropping a transition row on an occupied seam swaps the presentation while DURATION + ALIGNMENT are retained; an identical presentation short-circuits with an "Already Cross Dissolve" toast + selects the object (no history mint, belt-and-braces store guard). Click on an occupied seam = select-to-edit (never a dialog). The box widens to a 24px drop target with a ⇄ glyph while the drag hovers.'],
  ['th_mtu0mq6g_dwi4upg8', '#59 (Resolve-style DnD routing)', 'DONE — the routing table: transition row → the seam (empty: mint / occupied: replace / clip body: the clip\'s OUTgoing seam with the adjacency guard "no clip after this one — transitions need a cut"); effect row → the clip body effect STACK (duplicates legal, honest ×2 toast); fade row → the fade; empty-lane drop = pure no-op. Drag-over visuals on the seam zones (24px, +, ⇄) and the dbl-click apply route (single selected clip; honest "Select one clip" toast otherwise). One shared parser, three doors.'],
  ['th_mtu0p4re_wkwhbe0v', '#60 (the mixer floor dialog)', 'REMOVED — you were right: the floor toast/dialog + its warning flag are DELETED from the store (deletion-pinned). The <280px case is now pure responsive design: the dock wrapper measures itself and renders the meter columns only; full strips return when height grows. No store write, no toast, no mode — the silent CSS-grade fallback.'],
  ['th_mtu0ppto_x5u4r2fo', '#61 (the bad dock icon)', 'FIXED: Edit page = Clapperboard (19px) — the reference page dock pairs Cut with the scissors, Edit takes the clapperboard; zero ScissorsLineDashed left in the app (pinned).'],
  ['th_mtu0qfo1_adt122x3', '#62 (the full icon audit)', 'DONE — every TimelineToolbar control audited with a verdict (the table rides the W1 commit): tools radio ×8 / snapping / link / lock / markers / marker-color / master mute / master volume / DIM / zoom cluster all WORKING; the view-options hamburger FIXED (was a dev-jargon no-op toast — now a real menu); the density button REMOVED (re-homed into the menu); the mixer button FIXED (binary audio-only, the Inspector-collision glyph dead); sync-bin/auto-sync/dyntrim were already removed (reference §8.10/§8.9). The honest-no-op class is empty now.'],
  ['th_mtu0s6jo_2dpqtybp', '#63 (Media Pool under color)', 'FIXED + PINNED FOREVER: the color left dock is the GALLERY (label + icon; a table-driven pin now forbids "Media Pool" on every page except Edit — the class of naming drift cannot silently return). Also #70: per-card delete/export buttons are gone (context menu instead).'],
  ['th_mtu0t7a8_pbw5iwuh', '#64 (can\'t toggle the timeline view back)', 'FIXED: the view-options hamburger is a REAL menu now — Compact tracks (checkbox, the density resolver + your per-session override), Clip style Filmstrip|Block (radio pair), Audio waveforms (checkbox, honestly disabled while compact with the reason). The toggle-back path is the checkbox itself; the menu follows the APG keyboard grammar (arrows, Escape, focus return).'],
  ['th_mtu0to7i_g1oez5jk', '#65 (mixer can turn on but not off)', 'FIXED: the 3-state cycle (collapsed → meters → full) is DEAD — the toggle is BINARY with memory: open returns to your last visual (meters or full), close collapses. Deletion-pinned at the store level so the cycle grammar cannot return.'],
  ['th_mtu0u476_t7n581yt', '#66 (mixer shouldn\'t be here on non-audio)', 'AGREED + FIXED: the Toolbar2 mixer toggle renders on the AUDIO page ONLY (DOM-absent elsewhere; entering a non-audio page collapses any open mixer — the exit law). Resolve\'s Edit page hides its mixer behind Workspace; your ruling wins. README deviation row re-registered.'],
  ['th_mtu0vchi_nn8pau5f', '#67 (node graph blocking the preview)', 'FIXED — your exact words were the ruling: the graph is a CONSOLE-ROW panel beside the timeline (F6 slot [6]) with its own 26px header (target chip + ×), 38px toolbar and the 706×268 scrollable workspace. The viewer NEVER leaves region [2] — you watch the graded preview while tweaking nodes; the stale-frame hint died with the swap (there is nothing to confess anymore).'],
  ['th_mtu0vkgp_254etaw9', '#68 (scopes toggle no-op)', 'FIXED: the Scopes toggle now mounts the scopes as a ~160px PANE UNDER THE VIEWER (inside the viewer region\'s column — immediately visible, exactly the "near the viewer" placement you expected). Tabs carry the reference\'s exact names (Parade / Waveform / Vectorscope / Histogram); the toggle adds no F6 stop; the 2×2 four-up is an honest reference-only toast.'],
  ['th_mtu0w1pw_8riiikoj', '#69 (curves can\'t be right vs the reference)', 'ANSWERED + REBUILT: there IS no curves DOM in the reference canon (grep-verified across all five mock HTMLs) — the panel is rebuilt from Resolve research instead: Y/R/G/B channel curves (the Y curve composes over all three channels), a live histogram BEHIND the grid, the solid white reference diagonal, quarter grid + crosshair, 10px handles with rings, single-click insert with the near-band snap, Delete/right-click removes interior points. The composition order (y∘r) is pinned at the pixel level.'],
  ['th_mtu0x03u_ga5u9fm0', '#70 (the color grade view full audit)', 'DONE — the full re-audit ran (5 fresh-context family auditors, every color file read in full + live probes): the composition (gallery left / viewer + scopes pane / nodes console row / wheels+curves center-bottom / compact strip below) matches Resolve\'s simultaneity law; Stills apply is now REPLACE-not-merge (a curves-free still resets a curved target — one undo entry); the per-card buttons are gone (context menu: Apply/Delete/Export PowerGrade); the wheels/qualifier pointer-capture guards + the parade shared-scale + the qualifier slider resets all landed in the fix waves.'],
  ['th_mtu0y8kl_41rwqwlp', '#71 (deliver: no ruler, no range clamp)', 'FIXED — the BIGGEST one: the deliver strip now stacks the 22px READ-ONLY RULER (ticks + TC + in/out bracket flags) above the 32px RANGE BAND (54px total). The band: solid accent fill with a live TC readout, dark mask outside in→out, 12px bracket handles (drag + keyboard ±1 frame, ⇧×10, Home/End), and an HONEST preview — dragging IN past OUT pins at the live out edge and the release commits exactly the preview (the inverted-readout defect is dead). The export summary readout follows the band; the queue survives page switches (store-owned).'],
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
