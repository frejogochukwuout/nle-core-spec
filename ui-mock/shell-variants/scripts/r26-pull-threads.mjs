#!/usr/bin/env node
// R26: pull all annotakit threads with full payloads, analyze resolution state vs comment activity
const fs = await import('fs').then(m => m.default);

async function main() {
  const ids = fs.readFileSync('/tmp/thread-ids.txt', 'utf8').trim().split('\n');
  const threads = [];
  for (const id of ids) {
    try {
      const r = await fetch(`http://localhost:3000/annotakit/api/threads/${id}`);
      if (r.ok) threads.push(await r.json());
    } catch (e) { console.error('fail', id, e.message); }
  }
  fs.writeFileSync('/tmp/all-threads-full.json', JSON.stringify(threads, null, 1));

  // Analysis 1: threads with reviewer comments AFTER the last resolve/cooldown activity
  // thread shape: {id, number, storyId, status, createdAt, updatedAt, resolvedAt?, resolvedBy?, comments[]}
  const report = [];
  for (const t of threads) {
    const comments = (t.comments || []).map(c => ({
      author: c.author,
      at: c.createdAt,
      body: (c.body || '').slice(0, 160).replace(/\n/g, ' '),
      ghId: c.ghId
    }));
    const resolvedAt = t.resolvedAt || null;
    const reviewerComments = comments.filter(c => c.author === 'reviewer');
    const lastReviewer = reviewerComments.length ? reviewerComments[reviewerComments.length - 1] : null;
    // post-resolution reviewer comment = reopened suspicion
    let postResolve = null;
    if (resolvedAt && lastReviewer && new Date(lastReviewer.at) > new Date(resolvedAt)) postResolve = lastReviewer;
    report.push({
      number: t.number, gh: t.gh?.issue, id: t.id, status: t.status,
      story: t.story?.name, storyId: t.storyId,
      resolvedAt, lastUpdate: t.updatedAt,
      lastReviewerAt: lastReviewer ? lastReviewer.at : null,
      postResolveComment: postResolve ? postResolve.body : null,
      nComments: comments.length,
      lastComment: comments.length ? comments[comments.length - 1].body : null,
      lastCommentAt: comments.length ? comments[comments.length - 1].at : null,
      lastCommentAuthor: comments.length ? comments[comments.length - 1].author : null
    });
  }
  fs.writeFileSync('/tmp/thread-audit.json', JSON.stringify(report, null, 1));

  // Summary
  const open = report.filter(r => r.status !== 'resolved');
  const reopened = report.filter(r => r.postResolveComment);
  const reviewerLast = report.filter(r => r.lastCommentAuthor === 'reviewer');
  console.log('=== TOTAL:', report.length, '| open:', open.length, '| reviewer-last-word:', reviewerLast.length, '|| post-resolve reviewer comment:', reopened.length, '===');
  console.log('\n--- OPEN THREADS ---');
  for (const r of open) console.log(`#${r.number} [${r.story}] last:${r.lastCommentAt} "${(r.lastComment||'').slice(0,100)}"`);
  console.log('\n--- POST-RESOLVE REVIEWER COMMENTS (the "not fixed" class) ---');
  for (const r of reopened) console.log(`#${r.number} [${r.story}] resolved:${r.resolvedAt} | recomment:${r.lastReviewerAt} "${(r.postResolveComment||'').slice(0,120)}"`);
  console.log('\n--- REVIEWER HAS LAST WORD (unanswered) ---');
  for (const r of reviewerLast.filter(r => r.status === 'resolved')) console.log(`#${r.number} [${r.story}] "${(r.lastComment||'').slice(0,100)}" at ${r.lastCommentAt}`);
}
main().catch(e => { console.error(e); process.exit(1); });
