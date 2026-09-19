#!/usr/bin/env node
// R26-W-R part 1: the T#72 reply (the reviewer's live "NOT fixed / never responded" complaint)
const BASE = 'http://localhost:3000/annotakit/api/threads';

const T72 = 'th_mtzoi7vr_dijey6gz';
const REPLY = `You were right to call this out, and you deserve straight answers on both counts.

**Why it looked not-fixed:** a serving bug on our side. The hosted Storybook had silently fallen back to a build from two rounds back — the tab strip you were asking about shipped AFTER that build, so the page you were looking at genuinely did not have it. That serving bug is now fixed (the review URL was re-synced and verified against the repo HEAD today), and we've hardened the boot chain so a stale serve like that can't happen silently again.

**Why you never got a response:** that one is on us, full stop. The fixes were landing and the threads were being marked resolved, but the evidence replies were never posted back to the threads — you were seeing silent closures. That process is fixed as of this round: every resolution now carries its evidence here first.

**The fix itself — this landed in the last round and is live now:**
- The panel next to the timeline (the same row the Mixer console occupies on the Audio page) is now a thin tab strip: **[ Timeline | Nodes | Scopes ]** on the Color page.
- The toolbar **Scopes** button you pinned doesn't just toggle a pane anymore — it ACTIVATES the Scopes tab in that strip ("takes the same space, just a thin tab showing up to toggle both" is exactly the law that shipped).
- It works both ways: click the toolbar button → the tab activates and the panel takes the row; click a tab in the strip → the toolbar button's pressed state follows. One state, no desync. Clicking the active one again returns the row to Timeline.
- The viewer is never blocked — the graph/scopes take the console row only.

**10-second verification:** open the Color page → click **Scopes** in the toolbar → the row next to the timeline flips to the Scopes panel (waveform/parade/vector/histogram tabs inside it). Click **Timeline** in the strip to go back.

This round we also ran a full verification sweep of every issue filed so far — including re-auditing this one live — plus a fix wave (source I/O-range now drives the insert previews so the ghost matches the commit, snap-off-by-default restored, the deliver inspector toggle made honest, and more). Evidence replies are going out on all the other threads as well. Thank you for the patience and the blunt feedback — both were warranted.`;

async function main() {
  const res = await fetch(`${BASE}/${T72}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'agent', body: REPLY }),
  });
  console.log('T#72 reply POST:', res.status);
  const t = await (await fetch(`${BASE}/${T72}`)).json();
  console.log('comments now:', t.comments.length, '| last author:', t.comments[t.comments.length - 1].author);
}
main().catch(e => { console.error(e); process.exit(1); });
