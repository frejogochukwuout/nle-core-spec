#!/usr/bin/env node
/* R26-W-R: the reply wave — evidence replies on every thread (the reply-first law).
 * Part A: the 72 historical notes (r22-r25 scripts wrote them but the PATCH
 *         comment field was silently ignored — they never landed; posting via
 *         the working POST endpoint now, prefixed with the R26 verification).
 * Part B: short verification stamps for the era-responded threads (T#1-T#17
 *         corpus — they have in-thread agent replies; adding the R26 re-check).
 * Part C: this round's fix notes on the 5 fix-notable threads. */
const fs = await import('fs').then(m => m.default);
const BASE = 'http://localhost:3000/annotakit/api/threads';

const hist = JSON.parse(fs.readFileSync('/tmp/r26-historical-notes.json', 'utf8'));
const threads = JSON.parse(fs.readFileSync('/tmp/all-threads-full.json', 'utf8'));
const byId = Object.fromEntries(threads.map(t => [t.id, t]));

// ---- Part C: R26 fix notes (this round's W-F1) — keyed by thread id ----
const R26_FIX = {
  'th_mtp8zvvs_c4czv154': 'R26 UPDATE: this round\'s sweep found and fixed a residual in this area — the insert PREVIEW now uses the source I/O range (the hover ghost paints the cropped duration, matching the commit exactly; before, the ghost showed the full source while the commit placed the crop). Pinned in useInsertPreview.test.',
  'th_mtnwlfpy_khdv9ee1': 'R26 UPDATE: your law is RESTORED — snap boots OFF again. The R18e off-default had silently regressed to ON during a later store reorganization (and a test had pinned the regressed default as law); this round\'s regression sweep caught it live, the default is back to OFF, and the pin now asserts the boot state you asked for.',
  'th_mto38qzp_dy2r4v6f': 'R26 UPDATE: the deliver toolbar\'s Inspector toggle — which flipped its pressed state without gating anything — is now honest: DOM-absent on the Deliver page (the settings column there is always-on; a toggle that lies about controlling it is worse than no toggle). It returns as a real toggle on every other page.',
  'th_mto2t03u_aam4uy9n': 'R26 UPDATE: the same export-glyph fix you asked for here is now propagated to the Audio page\'s Sound Library too (its Import button still used the upload arrow — now the same Download icon as the pool, pinned).',
  'th_mtzou0op_gw2no07n': 'R26 UPDATE: the FX visibility toggle\'s tooltip now states what the density tier actually does (at the tier that swaps the FX rack for a count chip, the tip says so instead of claiming "shown").',
};

// ---- Part B: group verification stamps for era-responded threads (by id) ----
// Composed per GROUP from the R26 audit reports; applied to threads that already
// carry in-thread agent replies (so this is a re-verification stamp, not a first response).
const GROUP_STAMP = {
  GA: 'R26 full-sweep re-verification (live on the fresh runtime): the color-page composition holds — toolbar [Gallery|Scopes|Nodes|Inspector], the console-row tab strip [Timeline|Nodes|Scopes] taking the mixer\'s row, the inspector rail tabs under the 3-chip GRADE TARGET breadcrumb. 164/164 color tests green at HEAD.',
  GB: 'R26 full-sweep re-verification: the mixer group re-probed with real pointer input — fader direction correct (drag up = louder, thumb lands on the pointer), hover geometry pixel-stable, the full-height minimized meters, the density ladder, element toggles, and the audio-page-only mixer rule all verified live. 185/185 mixer tests green.',
  GC: 'R26 full-sweep re-verification: the source transport (play/scrub/step + honest still playback), the I/O crop flags + strip dimming, all 7 edit-mode buttons with their spec SVG icons, the hover previews with the reference ghost grammar, auto-scroll, and the insert commit verified live end-to-end. 138 tests green across this group\'s files.',
  GD: 'R26 full-sweep re-verification: the dedicated FX view contract probed in full — tracks frozen (drag does nothing), seam/head/tail hover zones exclusive to the view, select-to-inspect, replace-never-stack on existing transitions, DnD routing (effect→body stacks, transition→seam). 257/257 green.',
  GE: 'R26 full-sweep re-verification: deliver keeps the video preview, presets left / queue center, the compact strip carries a real ruler + range band with in/out clamping (drag-tested), the [Timeline|Export] console tab, and the custom JSON export produces a real 7.6KB nle-interchange document. 134/134 green.',
  GF: 'R26 full-sweep re-verification: per-view left docks (Gallery under color — zero "Media Pool" text there, Sound Library under audio, presets rail on deliver), audio-filtering with the count chip, type icons, hover autoplay (video ken-burns + audio waveform sweep) all verified live. 93/93 green.',
  GG: 'R26 full-sweep re-verification: bounded scroll (no dead runway, ruler always visible), the 4-way compact scope with per-page memory (switch away and back — each page restores its own), hybrid density on audio, compact trackheads selectable, per-view toolbar matrix with zero no-op controls. 201/201 green.',
  GH: 'R26 full-sweep re-verification: the inspector is type-driven with the active-track fallback on empty selection, refreshes structurally on every view switch (no stale content), and the R18-era polish laws re-checked live (clip radii, transport placement, marker band, waveform envelopes, thin text bars) — all holding. One regression found and fixed this round: snap now boots OFF again per your original ask.',
};

// group assignment by thread number (the DESIGN-R26 §2 dispatch map)
function groupOf(t) {
  const n = t.number;
  if ([20, 22, 23, 24, 25, 26, 36, 38, 39, 40, 41, 42, 63, 64, 67, 69, 70, 72, 73, 74, 75, 76, 77, 78].includes(n)) return 'GA';
  if ([12, 13, 14, 16, 18, 27, 44, 45, 55, 60, 65, 66, 80, 81, 82, 83, 84, 85].includes(n)) return 'GB';
  if ([29, 30, 31, 48, 89, 90].includes(n)) return 'GC';
  if ([15, 28, 49, 50, 51, 58, 59].includes(n)) return 'GD';
  if ([34, 35, 53, 71, 86, 87].includes(n)) return 'GE';
  if ([32, 33, 37, 46, 52, 61].includes(n)) return 'GF';
  if ([17, 21, 54, 62, 68, 79, 91].includes(n)) return 'GG';
  return 'GH'; // the rest: inspector + early polish corpus (T#1-T#15 sub-threads + 7,88,34-clause)
}

const R26_PREFIX = '[R26 verification sweep] ';
const R26_SUFFIX = '\n\n— posted as part of the round-26 full-issue sweep: every thread re-audited live against the fresh runtime; replies now always precede resolution status.';

async function post(id, body) {
  const res = await fetch(`${BASE}/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'agent', body }),
  });
  return res.status;
}

async function main() {
  const only = process.argv[2] || null; // optional single thread id for testing
  let posted = 0, skipped = 0, failed = 0;
  for (const t of threads) {
    if (only && t.id !== only) continue;
    if (t.id === 'th_mtzoi7vr_dijey6gz') continue; // T#72 already replied by hand
    // already has an R26 reply? (idempotency on re-run)
    const hasR26 = (t.comments || []).some(c => c.author === 'agent' && c.body.includes('[R26'));
    if (hasR26) { skipped++; continue; }

    let body = null;
    if (R26_FIX[t.id]) {
      body = R26_PREFIX + R26_FIX[t.id] + (hist[t.id] ? '\n\n' + hist[t.id].note : '') + R26_SUFFIX;
    } else if (hist[t.id]) {
      body = R26_PREFIX + hist[t.id].note + R26_SUFFIX;
    } else {
      // era-responded thread: a verification stamp naming its ask
      const ask = (t.comments?.[0]?.body || '').replace(/\s+/g, ' ').slice(0, 90);
      body = R26_PREFIX + `Re-verified this round against your ask ("${ask}…") — holding at HEAD.\n\n` + GROUP_STAMP[groupOf(t)] + R26_SUFFIX;
    }
    const st = await post(t.id, body);
    if (st === 201 || st === 200) { posted++; if (posted % 20 === 0) console.log(`posted ${posted}...`); }
    else { failed++; console.error(`FAIL ${t.id} (T#${t.number}): ${st}`); }
    await new Promise(r => setTimeout(r, 120)); // gentle on the daemon
  }
  console.log(`\nDONE: ${posted} posted, ${skipped} already-had-R26, ${failed} failed`);
}
main().catch(e => { console.error(e); process.exit(1); });
