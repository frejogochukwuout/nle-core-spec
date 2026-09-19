#!/usr/bin/env node
// R26: scan ALL GH review issues for reviewer comments AFTER closure (the "not resolved yet closed" class)
const PAT = process.env.ANNOTAKIT_GH_TOKEN || (() => { throw new Error('ANNOTAKIT_GH_TOKEN env required — never hardcode (the secret scanner law)'); })();
const OWNER = 'frejogochukwuout', REPO = 'nle-core-spec';
const fs = await import('fs').then(m => m.default);

async function gh(path) {
  const r = await fetch(`https://api.github.com${path}`, { headers: { Authorization: `token ${PAT}` } });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

async function main() {
  // all review issues (SB-filed have "[review]" in title)
  const pages = [];
  for (let p = 1; p <= 3; p++) pages.push(...await gh(`/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${p}`));
  const review = pages.filter(x => !x.pull_request && x.title.includes('[review]'));
  console.log('review issues:', review.length, '| open:', review.filter(x => x.state === 'open').map(x => x.number).join(','));

  const findings = [];
  for (const iss of review) {
    // pull comments for issues that have any
    if (!iss.comments) continue;
    let comments = [];
    try { comments = await gh(`/repos/${OWNER}/${REPO}/issues/${iss.number}/comments?per_page=100`); } catch (e) { continue; }
    const closedAt = iss.closed_at;
    const postClosure = comments.filter(c => closedAt && new Date(c.created_at) > new Date(closedAt));
    const lastBody = comments.length ? comments[comments.length - 1].body : '';
    const lastAt = comments.length ? comments[comments.length - 1].created_at : null;
    if (postClosure.length || iss.state === 'open') {
      findings.push({
        number: iss.number, state: iss.state, title: iss.title.slice(0, 90),
        closedAt, lastCommentAt: lastAt,
        lastComment: lastBody.slice(0, 300),
        postClosureCount: postClosure.length,
        postClosureBodies: postClosure.map(c => c.body.slice(0, 300))
      });
    }
  }
  fs.writeFileSync('/tmp/gh-postclosure.json', JSON.stringify(findings, null, 1));
  console.log('\n=== ISSUES WITH POST-CLOSURE COMMENTS OR STILL OPEN:', findings.length, '===');
  for (const f of findings) {
    console.log(`\nGH #${f.number} [${f.state}] closed:${f.closedAt}`);
    console.log(`  title: ${f.title}`);
    if (f.postClosureBodies.length) console.log(`  POST-CLOSURE (${f.postClosureCount}): ${f.postClosureBodies.join(' || ').slice(0, 400)}`);
    else if (f.state === 'open') console.log(`  last comment @${f.lastCommentAt}: ${f.lastComment.slice(0, 200)}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
