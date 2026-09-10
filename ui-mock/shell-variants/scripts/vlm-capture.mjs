#!/usr/bin/env node
/**
 * vlm-capture.mjs — R23 visual test harness, step 1 of 2.
 *
 * Walks the live Storybook dev server's /index.json, visits every story
 * (http://localhost:3000/?path=/story/<id>), waits for the story to render
 * inside the preview iframe, FORCES the iframe chain to the target viewport
 * (the registered floor 1280x800), and screenshots the story canvas to
 * ../r23-analysis/shots/<group>/<story>.png. Maintains an append-style,
 * kill-safe manifest at ../r23-analysis/manifest.json (upsert per story,
 * atomic tmp+rename write, entry order = index.json order).
 *
 * Usage:
 *   node scripts/vlm-capture.mjs
 *   node scripts/vlm-capture.mjs --filter primitives,shell-appshell--edit
 *   node scripts/vlm-capture.mjs --filter Primitives --viewport 1920x1080 --limit 4
 *
 * Flags:
 *   --filter <subs>   comma-separated substrings; a story matches if any
 *                     substring hits its id, title (kind) or name. Default all.
 *   --viewport WxH    default 1280x800 (the REGISTERED FLOOR — every layout
 *                     claim in this repo is budgeted there).
 *   --limit N         cap number of stories captured.
 *   --base-url <url>  default http://localhost:3000 (live dev server daemon).
 *
 * Browser path (documented in vlm-rubric.md): playwright is resolved via the
 * /home/z/node_modules -> /home/z/.npm-global/lib/node_modules symlink, with
 * chromium binaries in ~/.cache/ms-playwright. No new npm deps.
 *
 * THE IFRAME WIDTH LAW (learned the hard way): the story renders inside
 * #storybook-preview-iframe, whose width can lock at a stale 1920px (observed
 * on a fresh 1280 viewport in SB 10.6). We therefore force the whole chain to
 * the exact target viewport right before shooting — outer iframe (attrs +
 * inline styles !important, pinned position:fixed at (0,0) over the manager
 * chrome), the iframe body (SB 10.6 defaults it to padding:16px), and the
 * inner #storybook-root canvas (exact WxH, no insets) — verify the geometry
 * stuck, and re-force up to 3 times if the manager UI snaps it back. The
 * screenshot is an ELEMENT screenshot of the iframe itself, so the PNG is
 * exactly WxH of story pixels at the floor — no SB sidebar/addon noise, no
 * 16px inset. See vlm-rubric.md for the full law.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ANALYSIS = join(HERE, '..', 'r23-analysis');
const SHOTS = join(ANALYSIS, 'shots');
const MANIFEST = join(ANALYSIS, 'manifest.json');

// ---------------------------------------------------------------- arg parsing
function parseArgs(argv) {
  const args = { filter: '', viewport: '1280x800', limit: 0, baseUrl: 'http://localhost:3000' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--filter': args.filter = argv[++i] ?? ''; break;
      case '--viewport': args.viewport = argv[++i] ?? '1280x800'; break;
      case '--limit': args.limit = parseInt(argv[++i] ?? '0', 10) || 0; break;
      case '--base-url': args.baseUrl = argv[++i] ?? args.baseUrl; break;
      case '--help': case '-h': args.help = true; break;
      default: console.error(`[vlm-capture] unknown flag ignored: ${a}`); break;
    }
  }
  return args;
}
const ARGS = parseArgs(process.argv.slice(2));
if (ARGS.help) {
  console.log('usage: node scripts/vlm-capture.mjs [--filter subs] [--viewport WxH] [--limit N] [--base-url url]');
  process.exit(0);
}
const VM = /^(\d{3,5})x(\d{3,5})$/.exec(ARGS.viewport.trim().toLowerCase());
if (!VM) { console.error(`[vlm-capture] bad --viewport "${ARGS.viewport}" (expected e.g. 1280x800)`); process.exit(1); }
const VIEW_W = parseInt(VM[1], 10), VIEW_H = parseInt(VM[2], 10);
const VIEWPORT = `${VIEW_W}x${VIEW_H}`;

// ------------------------------------------------------------ module loaders
function loadPlaywright() {
  const candidates = [
    'playwright', // resolves via /home/z/node_modules symlink (npm-global)
    '/home/z/.npm-global/lib/node_modules/playwright',
    '/home/z/.bun/install/global/node_modules/playwright',
  ];
  for (const c of candidates) {
    try { return require(c).chromium; } catch { /* try next */ }
  }
  throw new Error(
    'playwright not resolvable. Tried: local node_modules, /home/z/.npm-global/lib/node_modules, /home/z/.bun/install/global/node_modules. ' +
    'Fallback: install playwright globally, or use agent-browser CLI (see vlm-rubric.md).'
  );
}

// ------------------------------------------------------------------- helpers
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const safeFile = (s) => String(s).replace(/[^a-zA-Z0-9._-]+/g, '-');

/** Layer taxonomy (drives review order primitive -> panel -> shell). */
function layerOf(story) {
  const t = story.title || '';
  const n = story.name || '';
  const imp = story.importPath || '';
  if (t === 'Primitives' || /primitives\.stories/i.test(imp)) return 'primitive';
  if (t.startsWith('Shell/AppShell') || t.startsWith('Shell/Variants') || /^full shell/i.test(n)) return 'shell';
  return 'panel'; // Mixer / Color / Pages / Chrome / Overlays / Regions / Timeline / Shell-Components
}

function loadManifest() {
  try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return []; }
}
function saveManifest(entries) {
  const tmp = MANIFEST + '.tmp';
  writeFileSync(tmp, JSON.stringify(entries, null, 2) + '\n');
  renameSync(tmp, MANIFEST); // atomic — a killed run leaves a consistent file
}

async function fetchIndex(baseUrl) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/index.json`);
  if (!res.ok) throw new Error(`GET ${baseUrl}/index.json -> ${res.status}`);
  const json = await res.json();
  return Object.values(json.entries || {}).filter((e) => !e.type || e.type === 'story' || e.subtype === 'story');
}

/** Force the iframe chain (outer #storybook-preview-iframe + inner
 *  #storybook-root canvas) to the EXACT target viewport, zero insets:
 *  1. outer iframe: width/height attrs + inline styles, plus position:fixed
 *     at (0,0) with max z-index — escapes ancestor overflow-clipping AND
 *     paints over the Storybook manager chrome (sidebar / toolbar / addon
 *     panel — otherwise the addon panel bleeds into the bottom of the shot
 *     as "This story has no controls" noise).
 *  2. iframe <html>/<body>: SB 10.6 puts padding:16px on the body (a 16px
 *     canvas inset on every side) — zeroed so the story canvas is the full
 *     viewport.
 *  3. #storybook-root: margin/padding 0, exact WxH, so h-full/w-full story
 *     layouts resolve against the true floor (SB's .sb-main-centered rule
 *     would otherwise add padding and max-height).
 *  Overflow is deliberately NOT hidden: if a story is taller/wider than the
 *  floor, the iframe's own scrollbars show — a real finding, keep the signal.
 *  Returns geometry. */
function forceScript() {
  return ({ W, H }) => {
    const f = document.querySelector('#storybook-preview-iframe');
    if (!f) return { ok: false, reason: 'no-preview-iframe' };
    f.setAttribute('width', String(W));
    f.setAttribute('height', String(H));
    const I = (el, k, v) => el.style.setProperty(k, v, 'important');
    I(f, 'position', 'fixed');
    I(f, 'left', '0');
    I(f, 'top', '0');
    I(f, 'z-index', '2147483647');
    I(f, 'width', W + 'px');
    I(f, 'height', H + 'px');
    I(f, 'min-width', W + 'px');
    I(f, 'min-height', H + 'px');
    I(f, 'max-width', 'none');
    I(f, 'flex', 'none');
    I(f, 'margin', '0');
    let rootW = null;
    try {
      const doc = f.contentDocument;
      if (doc) {
        for (const el of [doc.documentElement, doc.body]) {
          if (!el) continue;
          I(el, 'margin', '0');
          I(el, 'padding', '0');
        }
      }
      const root = doc && doc.querySelector('#storybook-root');
      if (root) {
        I(root, 'margin', '0');
        I(root, 'padding', '0');
        I(root, 'width', W + 'px');
        I(root, 'height', H + 'px');
        I(root, 'min-width', W + 'px');
        I(root, 'max-width', 'none');
        I(root, 'max-height', 'none');
        rootW = Math.round(root.getBoundingClientRect().width);
      }
    } catch { /* cross-origin guard — never happens on localhost SB */ }
    const r = f.getBoundingClientRect();
    return { ok: true, w: Math.round(r.width), h: Math.round(r.height), rootW };
  };
}

// ---------------------------------------------------------------------- main
async function main() {
  console.log(`[vlm-capture] server=${ARGS.baseUrl} viewport=${VIEWPORT} filter="${ARGS.filter || '*'}"`);
  let stories;
  try {
    stories = await fetchIndex(ARGS.baseUrl);
  } catch (e) {
    console.error(`[vlm-capture] FATAL: cannot read /index.json — is the dev server up on ${ARGS.baseUrl}? (${e.message})`);
    process.exit(1);
  }

  // filter (comma-separated OR of substrings against id / title / name)
  if (ARGS.filter) {
    const subs = ARGS.filter.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    stories = stories.filter((s) => {
      const hay = `${s.id} ${s.title} ${s.name}`.toLowerCase();
      return subs.some((sub) => hay.includes(sub));
    });
  }
  if (ARGS.limit > 0) stories = stories.slice(0, ARGS.limit);
  if (stories.length === 0) {
    console.error('[vlm-capture] no stories matched — nothing to do.');
    process.exit(1);
  }
  console.log(`[vlm-capture] ${stories.length} story(ies) to capture (index.json order)`);

  mkdirSync(SHOTS, { recursive: true });
  const manifest = loadManifest(); // append-style: upsert by story id
  const byId = new Map(manifest.map((e) => [e.id, e]));

  const chromium = loadPlaywright();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: VIEW_W, height: VIEW_H }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const RENDER_TIMEOUT = 20000; // first visit per group pays Vite on-demand compile
  const SETTLE_MS = 600;        // fonts / meters / raf after story swap
  let done = 0, failed = 0;

  for (let i = 0; i < stories.length; i++) {
    const s = stories[i];
    const label = `[${i + 1}/${stories.length}]`;
    const group = slug(s.title || 'misc');
    const file = safeFile(s.id) + '.png';
    const relShot = `r23-analysis/shots/${group}/${file}`;
    const absShot = join(SHOTS, group, file);
    let entry = {
      id: s.id, title: s.title, name: s.name, layer: layerOf(s), group,
      shot: relShot, viewport: VIEWPORT, capturedAt: new Date().toISOString(),
    };

    try {
      mkdirSync(join(SHOTS, group), { recursive: true });
      await page.goto(`${ARGS.baseUrl}/?path=/story/${s.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // wait for story render: preview iframe present, #storybook-root present,
      // and non-empty. (Empty root after timeout is legitimate — e.g. the
      // "Mixer — Collapsed (renders nothing)" story — so we shoot anyway.)
      try {
        await page.waitForFunction(() => {
          const f = document.querySelector('#storybook-preview-iframe');
          if (!f) return false;
          let doc; try { doc = f.contentDocument; } catch { return false; }
          if (!doc) return false;
          const root = doc.querySelector('#storybook-root');
          if (!root) return false;
          return root.childElementCount > 0;
        }, { timeout: RENDER_TIMEOUT, polling: 200 });
      } catch {
        console.error(`${label} ${s.id}: render wait timed out — shooting current state`);
      }
      await page.waitForTimeout(SETTLE_MS);

      // THE IFRAME WIDTH LAW — force chain to target viewport, verify, retry.
      const force = forceScript();
      let geo = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        geo = await page.evaluate(force, { W: VIEW_W, H: VIEW_H });
        await page.waitForTimeout(attempt === 1 ? 250 : 400); // let the manager react
        const check = await page.evaluate(() => {
          const f = document.querySelector('#storybook-preview-iframe');
          if (!f) return null;
          const r = f.getBoundingClientRect();
          const root = f.contentDocument?.querySelector('#storybook-root');
          const rr = root?.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height), rootX: rr ? Math.round(rr.x) : null, rootW: rr ? Math.round(rr.width) : null };
        });
        if (check && check.w === VIEW_W && check.h === VIEW_H && (check.rootX === null || check.rootX === 0)) { geo = { ...geo, ...check, stuck: true }; break; }
      }
      if (!geo || !geo.stuck) console.error(`${label} ${s.id}: WARNING iframe/root not at ${VIEWPORT} (got ${geo ? geo.w + 'x' + geo.h + ' rootX=' + geo.rootX : 'none'}) — shooting anyway`);

      // element screenshot of the preview iframe = exact WxH of story pixels
      const iframeEl = page.locator('#storybook-preview-iframe');
      if ((await iframeEl.count()) === 0) throw new Error('preview iframe missing');
      await iframeEl.first().screenshot({ path: absShot });

      entry.iframe = { w: geo?.w ?? null, h: geo?.h ?? null, rootX: geo?.rootX ?? null, rootW: geo?.rootW ?? null, stuck: !!geo?.stuck };
      done++;
      console.log(`${label} ok ${s.id} -> ${relShot} [${geo?.w}x${geo?.h}]`);
    } catch (e) {
      entry.error = String(e && e.message ? e.message : e).slice(0, 300);
      failed++;
      console.error(`${label} FAIL ${s.id}: ${entry.error}`);
    }

    // kill-safe append-style manifest upsert (atomic write per story)
    const prev = byId.get(s.id);
    if (prev) Object.assign(prev, entry, { capturedAt: entry.capturedAt, error: entry.error });
    else { manifest.push(entry); byId.set(s.id, entry); }
    saveManifest(manifest);
  }

  await browser.close();
  console.log(`[vlm-capture] DONE ok=${done} fail=${failed} manifest=${MANIFEST}`);
  process.exit(failed > 0 ? 2 : 0);
}

main().catch((e) => { console.error('[vlm-capture] FATAL:', e); process.exit(1); });
