#!/usr/bin/env node
// R26: dump the FULL issue corpus digest for orchestrator reading + group classification
const fs = await import('fs').then(m => m.default);
const threads = JSON.parse(fs.readFileSync('/tmp/all-threads-full.json', 'utf8'));
const ghIssues = JSON.parse(fs.readFileSync('/tmp/gh-all-issues.json', 'utf8'));
// map thread number -> GH number via title
const ghByThread = {};
for (const g of ghIssues) {
  const m = g.title.match(/— #(\d+) /);
  if (m) ghByThread[parseInt(m[1])] = g.number;
}

const lines = [];
for (const t of threads.sort((a, b) => a.number - b.number)) {
  const comments = (t.comments || []);
  const asks = comments.filter(c => c.author === 'reviewer').map(c => c.body.replace(/\s+/g, ' ').trim());
  const ours = comments.filter(c => c.author !== 'reviewer').map(c => (c.author || '?') + ': ' + c.body.replace(/\s+/g, ' ').trim().slice(0, 220));
  lines.push(`### T#${t.number} (GH #${ghByThread[t.number] || '?'}) [${t.status}] story="${t.story?.name || t.storyId}" comp=${t.component?.source?.file?.replace('src/components/', '') || '?'}:${t.component?.source?.line || '?'}`);
  asks.forEach((a, i) => lines.push(`  ASK${i + 1}: ${a.slice(0, 500)}`));
  if (!ours.length) lines.push(`  (no agent replies on record)`);
  ours.forEach(o => lines.push(`  EVID: ${o}`));
}
fs.writeFileSync('/tmp/r26-corpus-digest.md', lines.join('\n'));
console.log('digest written:', lines.length, 'lines,', threads.length, 'threads');
// also dump the story->component distribution for grouping
const comps = {};
for (const t of threads) {
  const f = (t.component?.source?.file || '?').replace('src/components/', '').replace('src/', '');
  comps[f] = (comps[f] || 0) + 1;
}
Object.entries(comps).sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log(String(n).padStart(3), f));
