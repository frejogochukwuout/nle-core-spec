#!/usr/bin/env node
// R26-W-R part 2: extract historical notes (r22-r25) + thread inventory → build the reply map skeleton
const fs = await import('fs').then(m => m.default);
const path = '/home/z/nle-core-spec/ui-mock/shell-variants/scripts/';

// thread id -> note, from each script's NOTES array
const notes = {};
for (const f of ['r22', 'r23', 'r24', 'r25']) {
  const src = fs.readFileSync(path + f + '-resolve-threads.mjs', 'utf8');
  // NOTES entries look like: ['th_xxx_yyy', '#n (title)', 'note text...'],
  const re = /\[\s*'(th_[a-z0-9_]+)'\s*,\s*'([^']*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    notes[m[1]] = { title: m[2], note: m[3].replace(/\\'/g, "'").replace(/\\n/g, ' ') };
  }
}
console.log('historical notes extracted:', Object.keys(notes).length);

const threads = JSON.parse(fs.readFileSync('/tmp/all-threads-full.json', 'utf8'));
const withNotes = threads.filter(t => notes[t.id]);
const without = threads.filter(t => !notes[t.id]);
console.log('threads with historical notes:', withNotes.length, '| without:', without.length);
console.log('\n--- WITHOUT notes (need fresh R26 replies) ---');
for (const t of without.sort((a, b) => a.number - b.number)) {
  console.log(`T#${t.number} ${t.id} [${t.story?.name}] ${(t.comments?.[0]?.body || '').replace(/\s+/g, ' ').slice(0, 70)}`);
}
fs.writeFileSync('/tmp/r26-historical-notes.json', JSON.stringify(notes, null, 1));
