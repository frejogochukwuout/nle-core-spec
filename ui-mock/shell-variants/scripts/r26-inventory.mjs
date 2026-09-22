#!/usr/bin/env node
// R26: build the FULL issue inventory — GH review issues joined with annotakit threads,
// grouped by UX feature area for the audit dispatch plan
const PAT = process.env.ANNOTAKIT_GH_TOKEN || (() => { throw new Error('ANNOTAKIT_GH_TOKEN env required — never hardcode (the secret scanner law)'); })();
const OWNER = 'aivs-tech', REPO = 'nle-core-spec';
const fs = await import('fs').then(m => m.default);

async function gh(path) {
  const r = await fetch(`https://api.github.com${path}`, { headers: { Authorization: `token ${PAT}` } });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

async function main() {
  const pages = [];
  for (let p = 1; p <= 3; p++) pages.push(...await gh(`/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${p}`));
  const review = pages.filter(x => !x.pull_request && x.title.includes('[review]'));
  // thread number is in the title after "— #N"
  const threads = JSON.parse(fs.readFileSync('/tmp/all-threads-full.json', 'utf8'));
  const byThreadNum = {};
  for (const t of threads) byThreadNum[t.number] = t;

  const closed = review.filter(x => x.state === 'closed');
  console.log('=== THE 14 CLOSED REVIEW ISSUES ===');
  for (const c of closed) console.log(`GH #${c.number} closed:${c.closed_at} :: ${c.title.slice(0, 100)}`);

  const inventory = review.map(x => {
    const m = x.title.match(/— #(\d+) /);
    const tn = m ? parseInt(m[1]) : null;
    const t = tn ? byThreadNum[tn] : null;
    return {
      gh: x.number, ghState: x.state, thread: tn,
      threadStatus: t ? t.status : null,
      title: x.title.replace(/^\[review\] .*? — #\d+ /, '').slice(0, 120),
      story: t ? (t.story?.name || t.storyId) : (x.title.match(/— (.*?) —/)?.[1] || '?'),
      createdAt: x.created_at, closedAt: x.closed_at,
      resolvedAt: t ? t.resolvedAt : null
    };
  });
  fs.writeFileSync('/tmp/r26-inventory.json', JSON.stringify(inventory, null, 1));

  // state-consistency matrix
  const mismatch = inventory.filter(i => i.ghState === 'open' && i.threadStatus === 'resolved');
  const bothOpen = inventory.filter(i => i.ghState === 'open' && (!i.threadStatus || i.threadStatus === 'open'));
  const closedResolved = inventory.filter(i => i.ghState === 'closed' && i.threadStatus === 'resolved');
  const closedThreadOpen = inventory.filter(i => i.ghState === 'closed' && i.threadStatus && i.threadStatus !== 'resolved');
  console.log(`\n=== STATE MATRIX ===`);
  console.log(`GH open + thread resolved (mirror-closure missed): ${mismatch.length}`);
  console.log(`GH open + thread open/missing: ${bothOpen.length}`);
  console.log(`GH closed + thread resolved (clean): ${closedResolved.length}`);
  console.log(`GH closed + thread NOT resolved (!!): ${closedThreadOpen.length}`);
  for (const c of closedThreadOpen) console.log(`  !! GH #${c.gh} thread#${c.thread} [${c.threadStatus}] ${c.title.slice(0, 80)}`);

  // group by story (feature area)
  const groups = {};
  for (const i of inventory) {
    const g = (i.story || '?').replace(/ —.*$/, '');
    (groups[g] = groups[g] || []).push(i);
  }
  console.log(`\n=== FEATURE-GROUP SIZES (by story) ===`);
  Object.entries(groups).sort((a, b) => b[1].length - a[1].length).forEach(([g, items]) => {
    console.log(`${g}: ${items.length} issues (GH ${items[0].gh}-${items[items.length - 1].gh})`);
  });
}
main().catch(e => { console.error(e); process.exit(1); });
