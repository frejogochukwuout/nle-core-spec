#!/usr/bin/env node
/**
 * vlm-review.mjs — R23 visual test harness, step 2 of 2.
 *
 * Reads ../r23-analysis/manifest.json (written by vlm-capture.mjs), feeds
 * each shot PNG to the vision LLM (z-ai-web-dev-sdk — backend node code only,
 * never client code) with a per-story rubric prompt, and writes structured
 * findings to ../r23-analysis/vlm-findings.json:
 *   [{ story, layer, shot, findings: [{severity:'P1'|'P2'|'P3', element, description}] }]
 * Entries are upserted per story (append-style, atomic write after each story)
 * so a killed run leaves a consistent file and a re-run refreshes only what
 * it re-reviews. Review order = layer order primitive -> panel -> shell
 * (index.json order preserved within a layer).
 *
 * Usage:
 *   node scripts/vlm-review.mjs
 *   node scripts/vlm-review.mjs --filter primitives,shell-appshell--edit
 *   node scripts/vlm-review.mjs --layer shell --limit 3
 *
 * Flags:
 *   --filter <subs>  comma-separated substrings vs story id/title/name (as in capture)
 *   --layer <l>      only review one layer: primitive | panel | shell
 *   --limit N        cap number of stories reviewed
 *   --model-rate <ms> delay between VLM calls, default 300
 *
 * VLM failures: 2 retries (with backoff) per story, then the story gets a
 * findings entry of [{error: '<reason>'}] — the batch never crashes.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ANALYSIS = join(HERE, '..', 'r23-analysis');
const MANIFEST = join(ANALYSIS, 'manifest.json');
const FINDINGS = join(ANALYSIS, 'vlm-findings.json');

const LAYER_ORDER = { primitive: 0, panel: 1, shell: 2 };

// ---------------------------------------------------------------- arg parsing
function parseArgs(argv) {
  const args = { filter: '', layer: '', limit: 0, modelRate: 300 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--filter': args.filter = argv[++i] ?? ''; break;
      case '--layer': args.layer = (argv[++i] ?? '').toLowerCase(); break;
      case '--limit': args.limit = parseInt(argv[++i] ?? '0', 10) || 0; break;
      case '--model-rate': args.modelRate = Math.max(0, parseInt(argv[++i] ?? '300', 10) || 300); break;
      case '--help': case '-h': args.help = true; break;
      default: console.error(`[vlm-review] unknown flag ignored: ${a}`); break;
    }
  }
  if (args.layer && !(args.layer in LAYER_ORDER)) {
    console.error(`[vlm-review] bad --layer "${args.layer}" (primitive|panel|shell)`);
    process.exit(1);
  }
  return args;
}
const ARGS = parseArgs(process.argv.slice(2));
if (ARGS.help) {
  console.log('usage: node scripts/vlm-review.mjs [--filter subs] [--layer primitive|panel|shell] [--limit N] [--model-rate ms]');
  process.exit(0);
}

// ------------------------------------------------------------- SDK resolution
function loadZAI() {
  // z-ai-web-dev-sdk lives in the bun global tree in this container; the
  // local/NODE_PATH candidates come first so the script stays portable.
  const candidates = [
    'z-ai-web-dev-sdk',
    '/home/z/.bun/install/global/node_modules/z-ai-web-dev-sdk',
    '/home/z/.npm-global/lib/node_modules/z-ai-web-dev-sdk',
  ];
  for (const c of candidates) {
    try {
      const mod = require(c);
      return mod.default ?? mod;
    } catch { /* try next */ }
  }
  throw new Error('z-ai-web-dev-sdk not resolvable (tried local, bun global, npm global). See vlm-rubric.md.');
}

// -------------------------------------------------------------------- rubric
function rubricFor(story) {
  const title = `${story.title} / ${story.name}`;
  return (
    `You are reviewing a screenshot of an NLE editor UI story named '${title}' (layer ${story.layer}). ` +
    'The registered layout floor is 1280x800. ' +
    'Spot issues: (1) text clipped/overflowing its container, (2) overlapping elements, ' +
    '(3) controls that look dead/unwired (placeholder-looking), (4) misaligned rows/columns, ' +
    '(5) illegible contrast, (6) elements that read as broken visualization (empty canvases, ' +
    'zero-size boxes, stray scrollbars suggesting overflow illusions). ' +
    "Reply ONLY with a JSON array: [{severity:'P1'|'P2'|'P3', element:'what you see', description:'the issue'}] " +
    '— empty array [] if the story looks clean. Be strict but do not invent issues.'
  );
}

// ------------------------------------------------------------- VLM + parsing
const VLM_TIMEOUT_MS = 150000;

async function vlmCallOnce(zai, b64, rubric) {
  const call = zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: rubric },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
      ],
    }],
    thinking: { type: 'disabled' },
  });
  const completion = await Promise.race([
    call,
    new Promise((_, rej) => setTimeout(() => rej(new Error('VLM call timed out after ' + VLM_TIMEOUT_MS + 'ms')), VLM_TIMEOUT_MS)),
  ]);
  let content = completion?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) content = content.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('');
  if (typeof content !== 'string' || !content.trim()) throw new Error('VLM returned empty content');
  return content;
}

/** Extract the JSON array from a possibly fenced / chatty VLM reply. */
function parseFindingsArray(raw) {
  let s = String(raw).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  const body = s.slice(start, end + 1);
  try { return JSON.parse(body); } catch { return null; }
}

/** Coerce a raw finding object into the strict schema; drop garbage. */
function normalizeFinding(item, idx) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const sevRaw = String(item.severity ?? '').trim().toUpperCase();
  const digits = sevRaw.replace(/[^0-9]/g, '');
  const severity = digits >= '1' && digits <= '3' && digits.length === 1 ? 'P' + digits : 'P3';
  const element = String(item.element ?? item.area ?? 'element ' + (idx + 1)).trim().slice(0, 200);
  const description = String(item.description ?? item.issue ?? '').trim().slice(0, 800);
  if (!element && !description) return null;
  return { severity, element, description };
}

async function vlmReviewStory(zai, shotAbs, story) {
  const b64 = readFileSync(shotAbs).toString('base64');
  const rubric = rubricFor(story);
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) { // 1 try + 2 retries
    try {
      const raw = await vlmCallOnce(zai, b64, rubric);
      const parsed = parseFindingsArray(raw);
      if (parsed === null || !Array.isArray(parsed)) throw new Error('unparseable VLM reply: ' + raw.slice(0, 160));
      const findings = parsed.map(normalizeFinding).filter(Boolean);
      return { findings };
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
  }
  return { findings: [{ error: ('VLM call failed after 2 retries: ' + String(lastErr && lastErr.message ? lastErr.message : lastErr)).slice(0, 400) }] };
}

// ------------------------------------------------------------------- output
function loadFindings() {
  try { return JSON.parse(readFileSync(FINDINGS, 'utf8')); } catch { return []; }
}
function saveFindings(list) {
  const tmp = FINDINGS + '.tmp';
  writeFileSync(tmp, JSON.stringify(list, null, 2) + '\n');
  renameSync(tmp, FINDINGS);
}

function printSummary(list) {
  const counts = { P1: 0, P2: 0, P3: 0, ERR: 0 };
  const rows = [];
  for (const f of list) {
    const c = { P1: 0, P2: 0, P3: 0, ERR: 0 };
    for (const item of f.findings || []) {
      if (item && item.error) c.ERR++;
      else if (item) c[item.severity]++;
    }
    for (const k of Object.keys(c)) counts[k] += c[k];
    rows.push({ story: f.story, layer: f.layer, ...c });
  }
  console.log('\n=== VLM FINDINGS SUMMARY ===');
  console.log(['STORY'.padEnd(52), 'LAYER'.padEnd(10), 'P1', 'P2', 'P3', 'ERR'].join(' '));
  for (const r of rows) {
    console.log([r.story.slice(0, 51).padEnd(52), r.layer.padEnd(10), String(r.P1).padStart(2), String(r.P2).padStart(2), String(r.P3).padStart(2), String(r.ERR).padStart(3)].join(' '));
  }
  console.log('—'.repeat(76));
  console.log(`TOTAL stories=${rows.length}  P1=${counts.P1}  P2=${counts.P2}  P3=${counts.P3}  ERR=${counts.ERR}`);
  return counts;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------- main
async function main() {
  if (!existsSync(MANIFEST)) {
    console.error(`[vlm-review] no manifest at ${MANIFEST} — run vlm-capture.mjs first`);
    process.exit(1);
  }
  let entries = JSON.parse(readFileSync(MANIFEST, 'utf8'));

  if (ARGS.filter) {
    const subs = ARGS.filter.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    entries = entries.filter((e) => {
      const hay = `${e.id} ${e.title} ${e.name}`.toLowerCase();
      return subs.some((sub) => hay.includes(sub));
    });
  }
  if (ARGS.layer) entries = entries.filter((e) => e.layer === ARGS.layer);

  // review order: primitive -> panel -> shell, manifest order within layer
  entries = [...entries].sort((a, b) => (LAYER_ORDER[a.layer] ?? 9) - (LAYER_ORDER[b.layer] ?? 9));
  if (ARGS.limit > 0) entries = entries.slice(0, ARGS.limit);

  const shootable = entries.filter((e) => e.shot && !e.error);
  const skipped = entries.length - shootable.length;
  if (skipped > 0) console.error(`[vlm-review] skipping ${skipped} manifest entr(ies) with no shot (failed captures)`);
  if (shootable.length === 0) {
    console.error('[vlm-review] nothing to review.');
    process.exit(1);
  }
  console.log(`[vlm-review] reviewing ${shootable.length} story(ies); rate=${ARGS.modelRate}ms; findings=${FINDINGS}`);

  const ZAI = loadZAI();
  const zai = await ZAI.create();

  const findingsList = loadFindings(); // append-style upsert by story id
  const byId = new Map(findingsList.map((f) => [f.story, f]));

  for (let i = 0; i < shootable.length; i++) {
    const e = shootable[i];
    const label = `[${i + 1}/${shootable.length}]`;
    const shotAbs = join(HERE, '..', e.shot);
    if (!existsSync(shotAbs)) {
      console.error(`${label} ${e.id}: shot missing (${shotAbs}) — skipping`);
      continue;
    }
    const { findings } = await vlmReviewStory(zai, shotAbs, e);
    const entry = {
      story: e.id, title: e.title, layer: e.layer, shot: e.shot,
      findings, reviewedAt: new Date().toISOString(),
    };
    const prev = byId.get(e.id);
    if (prev) Object.assign(prev, entry);
    else { findingsList.push(entry); byId.set(e.id, entry); }
    saveFindings(findingsList); // kill-safe: consistent after every story

    const tally = { P1: 0, P2: 0, P3: 0, ERR: 0 };
    for (const f of findings) { if (f.error) tally.ERR++; else tally[f.severity]++; }
    console.log(`${label} ${e.id} [${e.layer}] -> P1:${tally.P1} P2:${tally.P2} P3:${tally.P3} ERR:${tally.ERR}`);

    if (i < shootable.length - 1) await sleep(ARGS.modelRate);
  }

  // keep the file in canonical layer order for the final sweep
  findingsList.sort((a, b) => (LAYER_ORDER[a.layer] ?? 9) - (LAYER_ORDER[b.layer] ?? 9));
  saveFindings(findingsList);
  printSummary(findingsList);
}

main().catch((e) => { console.error('[vlm-review] FATAL:', e); process.exit(1); });
