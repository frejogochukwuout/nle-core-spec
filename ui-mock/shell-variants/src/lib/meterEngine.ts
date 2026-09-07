/* meterEngine — the shared stereo metering engine (R15 design A2, v2 FINAL).

   ONE module-level engine feeds every meter surface (channel strips, the
   bridge rail, the aux returns, the master strip and the toolbar micro-meter)
   so the same program never renders three disagreeing meters. The old
   per-component rAF loops are gone; their lifecycle discipline survives here:

   - rAF loop stops when IDLE + SETTLED (paused, every key at the display
     floor, no clip / peak-hold timers pending) — NOT subscriber-count-only:
     R13 pinned "meter mounted while idle schedules exactly ONE settle frame
     then stops", and that intent is preserved (subscribeKey arms one frame,
     which stops itself if everything is already at floor).
   - re-arms from the store's playing edge (the R13 re-arm rule).
   - faders/ducking/solo/mute/master values are read from the store via
     useUi.getState() + a module-level subscription — the UI NEVER pushes
     meter data through zustand, it only subscribes to the engine
     (useMeter → useSyncExternalStore, per-key cached snapshots, notify-only-
     on-change so settled meters re-render zero times).

   Key registry (C2): trackIds of the ACTIVE scene + 'auxA'/'auxB' + ONE
   'master' key — the old 'master' / 'master-bridge' / 'toolbar-master'
   split is unified here. Unknown keys (stories, isolated tests) fall back to
   a "generic" kind whose fader/duck come from the registering component's
   props — that keeps StripMeter's db/duckAmount props meaningful without
   giving store-backed keys a second source of truth.

   Sources (mock sim — no audio path exists):
   - programDb: seeded random walk ∈ [−30, −4] dB per key per channel
     (L/R independent seeds), stepped every 50 ms while playing.
     −4 (not −6) + fader +6 → max +2 dB → the clip zone stays reachable (C2).
   - track signal = programDb + fader − duckAmount·12 dB (v2.2 §5 ducking
     gain-reduction viz; the amount reads mockMixer.ducking — constant while
     playing, source-activity gating is a v2.2 refinement we do not model).
   - effectiveMuted = muted || (anySolo && !solo) → silent + muted state.
   - aux return: program walk + returnGain, silent when the bus is OFF.
   - master: min(1, Σ active-track channel levels / √active) + master fader
     (aggregated over ALL scene audio tracks — they are auto-registered by the
     world scan, so the toolbar micro-meter moves even with the dock closed).

   Ballistics (dB domain, C2): attack instant; decay −0.67 dB/frame at 30 fps
   (implemented time-based at 20.1 dB/s so jsdom's ~16 ms frames and 120 Hz
   displays decay at the specced rate); peak hold 1 s → −12 dB/s; clip at
   db ≥ 0 → full + red, 2 s hold.

   Test/debug hooks: __reset() (setup.ts afterEach — module state survives
   tests) and __setLevel(key, db, channel?) — a deterministic override for
   stories + vitest that bypasses the program sim (still respects
   effectiveMuted) and applies its attack synchronously.
*/

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useUi } from '../state/useUiStore';

/* ---------- public contract ---------- */

export interface MeterChannelState {
  /** display fraction, dB-linear: clamp((db + 60) / 60, 0, 1) — db ≥ 0 → 1 (full) */
  level: number;
  /** post-ballistics display dB (−Infinity = silent) */
  db: number;
  /** held peak dB (−Infinity = never hit) */
  peakDb: number;
  /** clip latch: signal db ≥ 0, held CLIP_HOLD_MS */
  clipped: boolean;
}

export interface MeterSnapshot {
  l: MeterChannelState;
  r: MeterChannelState;
  /** effectiveMuted (track: muted || anySolo && !solo · master: masterMuted · aux: bus off) */
  muted: boolean;
}

/* ---------- constants (design A2, C2-corrected) ---------- */

const FLOOR_DB = -60;        // display floor — (db+60)/60 → level 0
const CLIP_DB = 0;           // db ≥ 0 → full + red, 2s hold
const PROGRAM_MIN = -30;     // seeded program range (C2: −4 keeps clip reachable)
const PROGRAM_MAX = -4;
const DECAY_DB_PER_S = 20.1; // −0.67 dB/frame @ 30fps, expressed in time
const PEAK_HOLD_MS = 1000;
const PEAK_DECAY_DB_PER_S = 12;
const CLIP_HOLD_MS = 2000;
const SIM_STEP_MS = 50;
const DUCK_MAX_DB = 12;      // duckAmount 1 → −12 dB gain-reduction viz

const levelOf = (db: number) =>
  db === -Infinity ? 0 : Math.min(1, Math.max(0, (db + 60) / 60));

/* ---------- internal state ---------- */

interface ChanState {
  programDb: number;        // seeded walk source (master aggregates instead)
  displayDb: number;        // post-ballistics
  peakDb: number;
  peakHoldUntil: number;    // ms timestamp
  clipUntil: number;        // ms timestamp
  clipped: boolean;
  rng: () => number;        // per key + channel → L/R independent seeds
}

type KeyKind = 'track' | 'auxA' | 'auxB' | 'master' | 'generic';

interface KeyState {
  kind: KeyKind;
  l: ChanState;
  r: ChanState;
  faderDb: number;          // store-derived for track/aux/master; prop for generic
  duckAmount: number;       // store ducking for tracks; prop for generic
  muted: boolean;
  /** __setLevel debug override (undefined = follow the sim) */
  overrideL: number | undefined;
  overrideR: number | undefined;
}

const keys = new Map<string, KeyState>();
const listeners = new Map<string, Set<() => void>>();
const snapshots = new Map<string, MeterSnapshot>();

let running = false;
let rafId = 0;
let lastFrameMs = 0;
let lastSimMs = 0;

/* ---------- deterministic PRNG (seeded per key#channel) ---------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const newChan = (seedKey: string): ChanState => {
  const rng = mulberry32(hashStr(seedKey));
  return {
    programDb: PROGRAM_MIN + rng() * (PROGRAM_MAX - PROGRAM_MIN),
    displayDb: -Infinity,
    peakDb: -Infinity,
    peakHoldUntil: 0,
    clipUntil: 0,
    clipped: false,
    rng,
  };
};

/* ---------- world model: the G-slice projection the engine meters ---------- */

function ensureKey(key: string): KeyState {
  let k = keys.get(key);
  if (k) return k;
  const kind: KeyKind =
    key === 'master' ? 'master' : key === 'auxA' ? 'auxA' : key === 'auxB' ? 'auxB' : 'generic';
  k = {
    kind,
    l: newChan(`${key}#l`),
    r: newChan(`${key}#r`),
    faderDb: -6,
    duckAmount: 0,
    muted: false,
    overrideL: undefined,
    overrideR: undefined,
  };
  keys.set(key, k);
  return k;
}

/** Sync ONE key from the store. Store-backed keys (track/aux/master) read the
 *  G-slice directly — single source of truth; generic keys keep the fader/
 *  duck their registering component provided. Pure read + mutate, no notify. */
function applyWorldForKey(key: string, k: KeyState): void {
  const st = useUi.getState();
  if (key === 'master') {
    k.kind = 'master';
    k.faderDb = st.masterMuted ? -Infinity : st.masterVolume * 66 - 60;
    k.duckAmount = 0;
    k.muted = st.masterMuted;
    return;
  }
  if (key === 'auxA' || key === 'auxB') {
    const bus = key === 'auxA' ? 'a1' : 'a2';
    k.kind = key;
    k.faderDb = st.mixer.buses[bus].returnGain;
    k.duckAmount = 0;
    k.muted = !st.mixer.buses[bus].on; // honest: bus OFF → silent return
    return;
  }
  const scene = st.scenes.find((x) => x.id === st.activeSceneId);
  const t = scene?.tracks.find((tt) => tt.id === key && tt.kind === 'audio');
  if (t && scene) {
    k.kind = 'track';
    k.faderDb = st.mixer.tracks[key]?.fader ?? -6; // ChannelStrip's DEFAULT_STRIP fader
    k.duckAmount = st.mixer.ducking[key]?.amount ?? 0;
    const anySolo = scene.tracks.some((tt) => tt.kind === 'audio' && tt.solo);
    k.muted = t.muted || (anySolo && !t.solo); // solo-in-place (C2)
  }
  // else: generic — keep the component-provided source
}

/** Full world scan: prune scene-stale track keys (scene switch), auto-register
 *  every scene audio track + both aux buses + master (so the master aggregate
 *  works even with the mixer dock closed), and refresh all key sources. */
function refreshWorld(): void {
  const st = useUi.getState();
  const scene = st.scenes.find((x) => x.id === st.activeSceneId);
  const audio = scene ? scene.tracks.filter((t) => t.kind === 'audio') : [];
  const live = new Set(audio.map((t) => t.id));

  for (const [id, k] of keys) {
    if (k.kind === 'track' && !live.has(id) && (listeners.get(id)?.size ?? 0) === 0) {
      keys.delete(id);
      snapshots.delete(id);
    }
  }
  for (const t of audio) ensureKey(t.id);
  ensureKey('auxA');
  ensureKey('auxB');
  ensureKey('master');
  for (const [id, k] of keys) applyWorldForKey(id, k);
}

/* ---------- signal + ballistics (dB domain) ---------- */

function signalFor(k: KeyState, ch: 'l' | 'r', playing: boolean, masterAggDb?: number): number {
  if (k.muted) return -Infinity;
  const ovr = ch === 'l' ? k.overrideL : k.overrideR;
  if (ovr !== undefined) return ovr <= FLOOR_DB ? -Infinity : ovr; // __setLevel (bypasses sim + playing gate)
  if (!playing) return -Infinity;
  if (k.faderDb <= -59.5) return -Infinity; // −∞ fader (dbLabel convention)
  const raw =
    k.kind === 'master'
      ? (masterAggDb ?? -Infinity) + k.faderDb
      : k[ch].programDb + k.faderDb - k.duckAmount * DUCK_MAX_DB;
  return raw <= FLOOR_DB ? -Infinity : raw;
}

function ballistic(c: ChanState, signal: number, now: number, dt: number): void {
  // attack instant / decay −0.67 dB/frame @30fps (time-based, see header)
  if (signal >= c.displayDb) {
    c.displayDb = signal;
  } else {
    c.displayDb = Math.max(signal, c.displayDb - DECAY_DB_PER_S * dt);
    if (c.displayDb <= FLOOR_DB) c.displayDb = -Infinity;
  }
  // peak hold 1s → −12 dB/s
  if (signal !== -Infinity && signal >= c.peakDb) {
    c.peakDb = signal;
    c.peakHoldUntil = now + PEAK_HOLD_MS;
  } else if (c.peakDb !== -Infinity && now >= c.peakHoldUntil) {
    c.peakDb -= PEAK_DECAY_DB_PER_S * dt;
    if (c.peakDb <= FLOOR_DB) c.peakDb = -Infinity;
  }
  // clip: db ≥ 0 → full + red, 2s hold
  if (signal >= CLIP_DB) c.clipUntil = now + CLIP_HOLD_MS;
  c.clipped = now < c.clipUntil;
  if (c.clipped) c.displayDb = Math.max(c.displayDb, 0);
}

function processKey(k: KeyState, playing: boolean, now: number, dt: number): void {
  if (k.kind === 'master') return; // aggregated after the tracks
  ballistic(k.l, signalFor(k, 'l', playing), now, dt);
  ballistic(k.r, signalFor(k, 'r', playing), now, dt);
}

/** master = min(1, Σ active-track channel levels / √active) + master fader. */
function processMaster(playing: boolean, now: number, dt: number): void {
  const k = keys.get('master');
  if (!k) return;
  for (const ch of ['l', 'r'] as const) {
    let sum = 0;
    let active = 0;
    for (const tk of keys.values()) {
      if (tk.kind !== 'track' || tk.muted) continue;
      sum += Math.pow(10, tk[ch].displayDb / 20);
      active++;
    }
    const agg = active > 0 ? Math.min(1, sum / Math.sqrt(active)) : 0;
    const aggDb = 20 * Math.log10(agg); // agg 0 → −Infinity
    ballistic(k[ch], signalFor(k, ch, playing, aggDb), now, dt);
  }
}

/** Seeded program walk (50 ms steps while playing). */
function simWalk(): void {
  for (const k of keys.values()) {
    if (k.kind === 'master') continue;
    for (const c of [k.l, k.r]) {
      c.programDb = Math.min(PROGRAM_MAX, Math.max(PROGRAM_MIN, c.programDb + (c.rng() - 0.5) * 1.8));
    }
  }
}

/* ---------- snapshot cache (identity discipline: notify only on change) ---------- */

function buildSnapshot(k: KeyState): MeterSnapshot {
  const chan = (c: ChanState): MeterChannelState => ({
    level: levelOf(c.displayDb),
    db: c.displayDb,
    peakDb: c.peakDb,
    clipped: c.clipped,
  });
  return { l: chan(k.l), r: chan(k.r), muted: k.muted };
}

function snapshotEqual(a: MeterSnapshot, b: MeterSnapshot): boolean {
  const close = (x: number, y: number) =>
    x === y || (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 0.02);
  return (
    close(a.l.level, b.l.level) &&
    close(a.r.level, b.r.level) &&
    close(a.l.peakDb, b.l.peakDb) &&
    close(a.r.peakDb, b.r.peakDb) &&
    a.l.clipped === b.l.clipped &&
    a.r.clipped === b.r.clipped &&
    a.muted === b.muted
  );
}

/** Rebuild + cache the snapshot, notify listeners when it actually changed. */
function notifyKey(key: string): void {
  const k = keys.get(key);
  if (!k) return;
  const next = buildSnapshot(k);
  const prev = snapshots.get(key);
  if (!prev || !snapshotEqual(prev, next)) {
    snapshots.set(key, next);
    const set = listeners.get(key);
    if (set) for (const cb of set) cb();
  } else {
    snapshots.set(key, prev); // keep the old identity
  }
}

/** Public getter (also usable outside React). Refreshes the key from the store
 *  first so un-notified renders still see fresh muted/fader values; returns a
 *  cached identity whenever nothing meaningful changed (useSyncExternalStore
 *  contract — no infinite loops). */
export function meterGetSnapshot(key: string): MeterSnapshot {
  const k = ensureKey(key);
  applyWorldForKey(key, k);
  const next = buildSnapshot(k);
  const prev = snapshots.get(key);
  if (!prev || !snapshotEqual(prev, next)) {
    snapshots.set(key, next);
    return next;
  }
  return prev;
}

/* ---------- the loop (idle + settled stop — the R13 rule, C2-corrected) ---------- */

/** The stop rule polls the SUBSCRIBED keys only (design: "paused, all
 *  subscribed keys at floor, no clip/peak timers pending") — the
 *  auto-registered world keys (master aggregation feed) never gate the loop,
 *  and with zero subscribers the loop stops immediately after cleanup. */
function subscribedSettled(): boolean {
  for (const [key, set] of listeners) {
    if (set.size === 0) continue;
    const k = keys.get(key);
    if (!k) continue;
    for (const c of [k.l, k.r]) {
      if (c.displayDb !== -Infinity || c.peakDb !== -Infinity || c.clipped) return false;
    }
  }
  return true;
}

function step(now: number, dt: number): void {
  const playing = useUi.getState().playing;
  refreshWorld();
  if (playing && now - lastSimMs >= SIM_STEP_MS) {
    lastSimMs = now;
    simWalk();
  }
  for (const k of keys.values()) if (k.kind !== 'master') processKey(k, playing, now, dt);
  processMaster(playing, now, dt);
  for (const key of keys.keys()) notifyKey(key);
}

function frame(now: number): void {
  rafId = 0;
  const dt = lastFrameMs === 0 ? 0 : Math.max(0, Math.min(0.25, (now - lastFrameMs) / 1000));
  lastFrameMs = now;
  step(now, dt);
  // stop when idle AND settled — a mounted-but-idle meter must never spin
  // (R13); while playing the loop always runs. Peak/clip timers keep it alive
  // briefly after pause until they expire, then the loop stops itself.
  if (!useUi.getState().playing && subscribedSettled()) {
    running = false;
    return;
  }
  rafId = requestAnimationFrame(frame);
}

function ensureLoop(): void {
  if (running) return;
  running = true;
  rafId = requestAnimationFrame(frame);
}

/* ---------- subscription (useSyncExternalStore seam) ---------- */

function subscribeKey(key: string, cb: () => void): () => void {
  ensureKey(key);
  refreshWorld(); // auto-registers the world (master aggregation needs the tracks)
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(cb);
  ensureLoop(); // the settle frame — ONE frame on mount, stopped if already at floor
  notifyKey(key); // catch muted-at-mount etc. before the first frame
  return () => {
    const s = listeners.get(key);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) {
      listeners.delete(key);
      const k = keys.get(key);
      // generic keys (stories/tests) die with their last subscriber; the
      // world-backed keys stay for the master aggregate / store subscription
      if (k && k.kind === 'generic') {
        keys.delete(key);
        snapshots.delete(key);
      }
    }
  };
}

/** Keeps a GENERIC key's fader/duck source fresh (store-backed keys ignore it). */
function setSource(key: string, source?: { db: number; duckAmount?: number }): void {
  const k = ensureKey(key);
  if (k.kind === 'generic') {
    k.faderDb = source?.db ?? -6;
    k.duckAmount = source?.duckAmount ?? 0;
  }
}

/** useMeter(key) — subscribe one meter surface to one engine key. */
export function useMeter(key: string, source?: { db: number; duckAmount?: number }): MeterSnapshot {
  useEffect(() => {
    setSource(key, source);
  }, [key, source?.db, source?.duckAmount]);
  const subscribe = useMemo(() => (cb: () => void) => subscribeKey(key, cb), [key]);
  const getSnap = useMemo(() => () => meterGetSnapshot(key), [key]);
  return useSyncExternalStore(subscribe, getSnap, getSnap);
}

/* ---------- store bridge: re-arm on the playing edge + source refresh ---------- */

useUi.subscribe((s, prev) => {
  if (s.playing !== prev.playing) ensureLoop(); // re-arm (R13 rule)
  refreshWorld();
  for (const key of [...keys.keys()]) notifyKey(key);
});

/* ---------- debug / test hooks ---------- */

/** Deterministic level injection for stories + vitest: overrides the program
 *  sim (bypasses the playing gate and the fader/duck math, still respects
 *  effectiveMuted) and applies SYNCHRONOUSLY — the display attaches to the
 *  override in BOTH directions (no rAF wait, no decay lag) so assertions are
 *  deterministic. Persists until __reset (or another __setLevel). */
export function __setLevel(key: string, db: number, channel: 'l' | 'r' | 'both' = 'both'): void {
  const k = ensureKey(key);
  applyWorldForKey(key, k);
  if (channel === 'l' || channel === 'both') k.overrideL = db;
  if (channel === 'r' || channel === 'both') k.overrideR = db;
  const now = performance.now();
  const playing = useUi.getState().playing;
  const chans: ('l' | 'r')[] = channel === 'both' ? ['l', 'r'] : [channel];
  for (const ch of chans) {
    const signal = signalFor(k, ch, playing); // override branch → db itself
    const c = k[ch];
    c.displayDb = signal;
    if (signal !== -Infinity && signal >= c.peakDb) {
      c.peakDb = signal;
      c.peakHoldUntil = now + PEAK_HOLD_MS;
    }
    if (signal >= CLIP_DB) c.clipUntil = now + CLIP_HOLD_MS;
    c.clipped = now < c.clipUntil;
  }
  notifyKey(key);
  ensureLoop(); // ballistics continue from here (decay / peak hold / clip hold)
}

/** Test containment (setup.ts afterEach): module state survives tests, so the
 *  engine resets to a silent, stopped, key-less state. Mounted components keep
 *  their subscriptions and repaint silent on the notify. */
export function __reset(): void {
  if (rafId !== 0) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  running = false;
  lastFrameMs = 0;
  lastSimMs = 0;
  keys.clear();
  snapshots.clear();
  for (const set of listeners.values()) for (const cb of set) cb();
}

/** Loop state for lifecycle assertions (idle-stop / re-arm tests). */
export function __isRunning(): boolean {
  return running;
}
