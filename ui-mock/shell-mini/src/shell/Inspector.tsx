/* Inspector — read-only facts for the selection + the ONE real control:
   Nudge ±0.5s (neighbor-clamped, one history entry per click, D3.7/m10).
   No dead fields (zero-no-op discipline, R14).
   R18j: collapses to a thin right rail (thread #13, “INSPECTOR” 90° —
   the standard collapsed-panel style); images drop “Source length”
   (thread #18 — a still has no source length; its extent on the
   timeline is an edit decision, shown as Duration). */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MousePointerClick, PanelRightClose, PanelRightOpen, Plus, Volume2, VolumeX, X } from 'lucide-react';
import { useMini } from '../state/useMini';
import { fmtTimecode } from '../lib/timecode';
import { neighborBounds, MIN_DUR } from '../lib/geometry';
import { EFFECT_DEFS, TRANSITION_PRESENTATIONS, type EffectDef } from '../lib/mockData';
import { volToDb, dbToVol, DB_MIN, DB_MAX } from '../lib/audioDb';
import { NumberField, ParamRow, Group } from './fields';

export function Inspector() {
  const doc = useMini((s) => s.doc);
  const selectedId = useMini((s) => s.selectedId);
  const nudge = useMini((s) => s.nudge);

  /* R18j (thread #13): collapse rail. Mode-aware like the pool's: with
   *  viewerMax ON the rail means “hidden for max view” and its click
   *  EXITS max mode; otherwise it just expands this panel. */
  const collapsed = useMini((s) => s.inspectorCollapsed || s.viewerMax);
  const viewerMax = useMini((s) => s.viewerMax);
  const toggleInspector = useMini((s) => s.toggleInspector);
  const setInspectorCollapsed = useMini((s) => s.setInspectorCollapsed);
  const toggleViewerMax = useMini((s) => s.toggleViewerMax);

  const clip = selectedId ? doc.clips.find((c) => c.id === selectedId) : undefined;
  const media = clip ? doc.media.find((m) => m.id === clip.mediaId) : undefined;
  const track = clip ? doc.tracks.find((t) => t.id === clip.trackId) : undefined;
  /* R19 (thread #47): the track card — the inspector's SECOND subject.
   * Selected via the lane's empty surface or the head badge (the same
   * law both ways). Fallback order: clip → track → empty. */
  const selectedTrackId = useMini((s) => s.selectedTrackId);
  const selTrack = selectedTrackId ? doc.tracks.find((t) => t.id === selectedTrackId) : undefined;
  /* R20 (thread #29 — wave 8): the track card's named basic control —
   * MUTE. Doc state (one history entry, undoable); the "etc." beyond
   * mute is deferred to the nle-engine audio seam. */
  const toggleTrackMute = useMini((s) => s.toggleTrackMute);
  /* R24-miniplus (D1): the feature gate — the plus groups render ONLY
   *  when ON (additive-by-construction: gate-OFF is the R23 surface —
   *  the facts dl + nudge + track card above are untouched). */
  const miniPlus = useMini((s) => s.miniPlus);
  const canNudge = (delta: number): boolean => {
    if (!clip) return false;
    const { prevEnd, nextStart } = neighborBounds(doc, clip);
    const target = clip.start + delta;
    return target >= prevEnd && target + clip.duration <= nextStart;
  };

  if (collapsed) {
    return (
      <aside
        className="mini-panel mini-inspector is-collapsed"
        data-testid="mini-inspector-collapsed"
        aria-label="Inspector collapsed"
      >
        <button
          type="button"
          className="mini-rail"
          onClick={() => (viewerMax ? toggleViewerMax() : setInspectorCollapsed(false))}
          aria-label="Show inspector"
          title="Show inspector"
          data-testid="mini-btn-inspector-expand"
        >
          <PanelRightOpen size={14} strokeWidth={1.75} aria-hidden="true" />
          <span className="mini-rail__label">Inspector</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="mini-panel mini-inspector" data-testid="mini-inspector" aria-label="Inspector">
      <div className="mini-panel__head mini-inspector__head">
        <span className="mini-inspector__head-label">Inspector</span>
        <button
          type="button"
          className="mini-inspector__collapse"
          aria-label="Collapse inspector"
          title="Collapse inspector"
          onClick={toggleInspector}
          data-testid="mini-btn-inspector-collapse"
        >
          <PanelRightClose size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      {clip && media && track ? (
        <div className="mini-inspector__body">
          <div className="mini-inspector__name" data-testid="mini-inspector-name">
            {media.name}
          </div>
          <dl className="mini-inspector__facts">
            <div>
              <dt>Track</dt>
              <dd className="mini-mono">{track.label}</dd>
            </div>
            <div>
              <dt>Kind</dt>
              <dd>{media.kind}</dd>
            </div>
            <div>
              <dt>Start</dt>
              <dd className="mini-mono" data-testid="mini-inspector-start">
                {fmtTimecode(clip.start)}
              </dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd className="mini-mono">{fmtTimecode(clip.duration)}</dd>
            </div>
            <div>
              <dt>End</dt>
              <dd className="mini-mono">{fmtTimecode(clip.start + clip.duration)}</dd>
            </div>
            {/* R18j (thread #18): stills have no source length — the clip's
                Duration above IS the placement decision; showing a source
                length for an image invented a fact the media never had */}
            {media.kind !== 'image' && (
              <div>
                <dt>Source length</dt>
                <dd className="mini-mono">{fmtTimecode(media.duration)}</dd>
              </div>
            )}
          </dl>
          <div className="mini-inspector__nudge">
            <span className="mini-inspector__nudge-label">Nudge ±0.5s</span>
            <div className="mini-inspector__nudge-btns">
              <button
                type="button"
                className="mini-iconbtn"
                aria-label="Nudge left 0.5 seconds"
                disabled={!canNudge(-0.5)}
                onClick={() => nudge(clip.id, -0.5)}
                data-testid="mini-btn-nudge-left"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                className="mini-iconbtn"
                aria-label="Nudge right 0.5 seconds"
                disabled={!canNudge(0.5)}
                onClick={() => nudge(clip.id, 0.5)}
                data-testid="mini-btn-nudge-right"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          {miniPlus && <PlusSections clipId={clip.id} />}
        </div>
      ) : selTrack ? (
        /* R19 (thread #47): the TRACK card — track-specific facts. R20
         * (thread #29): + the MUTE control — the named "most basic
         * control" (doc state, one entry, undoable; the lane dims + the
         * head carries an M chip — see Timeline). */
        <div className="mini-inspector__body" data-testid="mini-inspector-track">
          <div className="mini-inspector__name">{selTrack.label} lane</div>
          <dl className="mini-inspector__facts">
            <div>
              <dt>Kind</dt>
              <dd>{selTrack.kind}</dd>
            </div>
            <div>
              <dt>Clips</dt>
              <dd className="mini-mono" data-testid="mini-inspector-track-count">
                {doc.clips.filter((c) => c.trackId === selTrack.id).length}
              </dd>
            </div>
            <div>
              <dt>Total content</dt>
              <dd className="mini-mono">
                {fmtTimecode(
                  doc.clips
                    .filter((c) => c.trackId === selTrack.id)
                    .reduce((sum, c) => sum + c.duration, 0),
                )}
              </dd>
            </div>
            <div>
              <dt>Bound role</dt>
              <dd>{selTrack.kind === 'video' ? 'video lane' : 'audio lane'}</dd>
            </div>
          </dl>
          <div className="mini-inspector__track-controls">
            <button
              type="button"
              className={`mini-inspector__mute${selTrack.muted ? ' is-muted' : ''}`}
              onClick={() => toggleTrackMute(selTrack.id)}
              aria-pressed={selTrack.muted ?? false}
              title={
                selTrack.muted
                  ? `Unmute ${selTrack.label} — the lane renders at full presence`
                  : `Mute ${selTrack.label} — the lane dims; an edit decision saved with the project`
              }
              data-testid="mini-track-mute"
            >
              {selTrack.muted ? <VolumeX size={14} strokeWidth={1.75} aria-hidden="true" /> : <Volume2 size={14} strokeWidth={1.75} aria-hidden="true" />}
              <span>{selTrack.muted ? 'Unmute' : 'Mute'}</span>
            </button>
          </div>
          <p className="mini-inspector__track-hint">
            {selTrack.kind === 'audio'
              ? 'Mute is saved with the project (undoable). Audio lane visibility is the toolbar eye toggle.'
              : 'Mute is saved with the project (undoable). Rebind the lane from its track head (multi-track projects).'}
          </p>
        </div>
      ) : (
        <div className="mini-inspector__empty" data-testid="mini-inspector-empty">
          <MousePointerClick className="mini-inspector__empty-icon" size={22} strokeWidth={1.5} aria-hidden="true" />
          <span>Select a clip or a track to see its facts.</span>
          <span className="mini-inspector__empty-hint">Click a clip, a lane, or a track head.</span>
        </div>
      )}
    </aside>
  );
}

/* ---------- R24-miniplus W1 (DESIGN-R24 D3/D4): the plus groups ---------- */

/** The Timing group: Start/Duration NumberFields routed through the REAL
 *  commands (moveClip REJECTS on conflict with a toast — the OT seam law;
 *  trimClip('end') applies the neighbor + source clamps). The field
 *  re-syncs from the doc's truth after every commit attempt (the epoch
 *  key remount: a rejected command honestly reverts the display). */
function TimingGroup({ clipId }: { clipId: string }) {
  const clip = useMini((s) => s.doc.clips.find((c) => c.id === clipId));
  const moveClip = useMini((s) => s.moveClip);
  const trimClip = useMini((s) => s.trimClip);
  const [epoch, setEpoch] = useState(0);
  if (!clip) return null;
  return (
    <Group title="Timing" testid="mini-group-timing" defaultOpen>
      <NumberField
        key={`start-${epoch}`}
        label="Start"
        value={clip.start}
        min={0}
        step={0.5}
        testid="mini-field-start"
        onCommit={(v) => {
          moveClip(clip.id, v);
          setEpoch((e) => e + 1);
        }}
      />
      <NumberField
        key={`dur-${epoch}`}
        label="Duration"
        value={clip.duration}
        min={MIN_DUR}
        step={0.5}
        testid="mini-field-duration"
        onCommit={(v) => {
          trimClip(clip.id, 'end', clip.start + v);
          setEpoch((e) => e + 1);
        }}
      />
    </Group>
  );
}

/** The Clip group: Volume (audio, dB), Opacity (visual, %), Speed (%),
 *  In-point (only when the media window exceeds the clip). */
function ClipPropsGroup({ clipId }: { clipId: string }) {
  const clip = useMini((s) => s.doc.clips.find((c) => c.id === clipId));
  const media = useMini((s) => s.doc.media.find((m) => clipId && s.doc.clips.find((c) => c.id === clipId)?.mediaId === m.id));
  const setClipProp = useMini((s) => s.setClipProp);
  const setClipSpeed = useMini((s) => s.setClipSpeed);
  const setClipSourceStart = useMini((s) => s.setClipSourceStart);
  const [epoch, setEpoch] = useState(0);
  if (!clip || !media) return null;
  const isAudio = media.kind === 'audio';
  const rate = clip.speed ?? 1;
  const window = clip.duration * rate;
  const hasWindowSlack = media.kind !== 'image' && media.duration - window > 0.01;
  return (
    <Group title={isAudio ? 'Audio' : 'Video'} testid="mini-group-clip" defaultOpen>
      {isAudio && (
        <NumberField
          key={`vol-${epoch}`}
          label="Volume"
          value={Number(volToDb(clip.volume ?? 1).toFixed(1))}
          min={DB_MIN}
          max={DB_MAX}
          step={0.5}
          resetTo={0}
          testid="mini-field-volume"
          onCommit={(db) => {
            setClipProp(clip.id, { volume: dbToVol(db) });
            setEpoch((e) => e + 1);
          }}
        />
      )}
      {!isAudio && (
        <NumberField
          key={`opa-${epoch}`}
          label="Opacity"
          value={Math.round((clip.opacity ?? 1) * 100)}
          min={0}
          max={100}
          step={5}
          resetTo={100}
          testid="mini-field-opacity"
          onCommit={(v) => {
            setClipProp(clip.id, { opacity: v / 100 });
            setEpoch((e) => e + 1);
          }}
        />
      )}
      {media.kind !== 'image' && (
        <NumberField
          key={`spd-${epoch}`}
          label="Speed"
          value={Math.round(rate * 100)}
          min={10}
          max={400}
          step={5}
          resetTo={100}
          testid="mini-field-speed"
          onCommit={(v) => {
            setClipSpeed(clip.id, v / 100);
            setEpoch((e) => e + 1);
          }}
        />
      )}
      {hasWindowSlack && (
        <NumberField
          key={`in-${epoch}`}
          label="In-point"
          value={clip.sourceStart ?? 0}
          min={0}
          max={media.duration - window}
          step={0.5}
          resetTo={0}
          testid="mini-field-inpoint"
          onCommit={(v) => {
            setClipSourceStart(clip.id, v);
            setEpoch((e) => e + 1);
          }}
        />
      )}
    </Group>
  );
}

/** The Effects group (D4): the stack as accordion rows (LOCAL expanded
 *  state — no store selection domain; the S7 XOR law untouched), the
 *  add-picker filtered to defs not already on the clip, per-param rows
 *  seeded from the def registry. */
function EffectsGroup({ clipId }: { clipId: string }) {
  const clip = useMini((s) => s.doc.clips.find((c) => c.id === clipId));
  const addEffect = useMini((s) => s.addEffect);
  const removeEffect = useMini((s) => s.removeEffect);
  const toggleEffect = useMini((s) => s.toggleEffect);
  const setEffectParam = useMini((s) => s.setEffectParam);
  const reorderEffect = useMini((s) => s.reorderEffect);
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!clip) return null;
  const stack = clip.effects ?? [];
  const available = EFFECT_DEFS.filter((d) => !stack.some((e) => e.id === d.id));
  return (
    <Group title={`Effects${stack.length ? ` (${stack.length})` : ''}`} testid="mini-group-effects" defaultOpen>
      {stack.map((fx, i) => {
        const def: EffectDef | undefined = EFFECT_DEFS.find((d) => d.id === fx.id);
        const isOpen = expanded === fx.id;
        return (
          <div key={fx.id} className="mini-fx-row" data-testid={`mini-fx-row-${fx.id}`}>
            <div className="mini-fx-row__head">
              <input
                type="checkbox"
                checked={fx.enabled}
                onChange={() => toggleEffect(clip.id, fx.id)}
                aria-label={`${fx.name} enabled`}
                data-testid={`mini-fx-enabled-${fx.id}`}
              />
              <button
                type="button"
                className="mini-fx-row__name"
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? null : fx.id)}
                data-testid={`mini-fx-toggle-${fx.id}`}
              >
                {fx.name}
              </button>
              <button
                type="button"
                className="mini-iconbtn mini-fx-row__btn"
                aria-label={`Move ${fx.name} up`}
                disabled={i === 0}
                onClick={() => reorderEffect(clip.id, fx.id, -1)}
                data-testid={`mini-fx-up-${fx.id}`}
              >
                <ChevronUp size={12} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="mini-iconbtn mini-fx-row__btn"
                aria-label={`Move ${fx.name} down`}
                disabled={i === stack.length - 1}
                onClick={() => reorderEffect(clip.id, fx.id, 1)}
                data-testid={`mini-fx-down-${fx.id}`}
              >
                <ChevronDown size={12} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="mini-iconbtn mini-fx-row__btn"
                aria-label={`Remove ${fx.name}`}
                onClick={() => removeEffect(clip.id, fx.id)}
                data-testid={`mini-fx-remove-${fx.id}`}
              >
                <X size={12} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            {isOpen && def && (
              <div className="mini-fx-row__params">
                {def.params.map((p) => (
                  <ParamRow
                    key={p.key}
                    label={p.label}
                    value={fx.params?.[p.key] ?? p.default}
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    resetTo={p.default}
                    testid={`mini-fx-param-${fx.id}-${p.key}`}
                    onCommit={(v) => setEffectParam(clip.id, fx.id, p.key, v)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {stack.length === 0 && <p className="mini-inspector__hint">No effects on this clip.</p>}
      {available.length > 0 && (
        <label className="mini-fx-add">
          <span className="mini-field__label">Add effect</span>
          <select
            className="mini-fx-add__select"
            aria-label="Add effect"
            data-testid="mini-fx-add"
            value=""
            onChange={(e) => {
              if (e.target.value) addEffect(clip.id, e.target.value);
            }}
          >
            <option value="">Choose…</option>
            {available.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Plus size={12} strokeWidth={1.75} aria-hidden="true" />
        </label>
      )}
    </Group>
  );
}

/** The plus sections mount (gate ON only — the additive-by-construction
 *  law: these groups mint NEW testids; the R23 facts surface above never
 *  changes). */
function PlusSections({ clipId }: { clipId: string }) {
  return (
    <>
      <TimingGroup clipId={clipId} />
      <ClipPropsGroup clipId={clipId} />
      <EffectsGroup clipId={clipId} />
      <TransitionGroup clipId={clipId} />
      <FadeGroup clipId={clipId} />
    </>
  );
}

/* ---------- R24-miniplus W2 (DESIGN-R24 D5): the transition/fade groups ---- */

/** The Transition group: the selected clip's outgoing seam transition —
 *  presentation select (8), duration (clamped to the seam bound),
 *  alignment (0..100%), remove. The "Hard cut" affordance when the seam
 *  is touching + empty. */
function TransitionGroup({ clipId }: { clipId: string }) {
  const clip = useMini((s) => s.doc.clips.find((c) => c.id === clipId));
  const clips = useMini((s) => s.doc.clips);
  const setTransition = useMini((s) => s.setTransition);
  const removeTransition = useMini((s) => s.removeTransition);
  if (!clip) return null;
  const eps = 1e-9;
  const right = clips.find(
    (c) => c.trackId === clip.trackId && Math.abs(c.start - (clip.start + clip.duration)) < eps,
  );
  const touching = right !== undefined;
  const t = clip.transitionOut;
  const seamMax = Math.max(0.5, Math.min(clip.duration, right?.duration ?? Infinity) - 0.5);
  const canMint = touching && seamMax >= 0.5;
  return (
    <Group title="Transition" testid="mini-group-transition" defaultOpen={!!t}>
      {t ? (
        <>
          <label className="mini-field">
            <span className="mini-field__label">Style</span>
            <select
              className="mini-field__select"
              value={t.presentation}
              aria-label="Transition style"
              data-testid="mini-transition-presentation"
              onChange={(e) => setTransition(clip.id, { presentation: e.target.value as never })}
            >
              {TRANSITION_PRESENTATIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <NumberField
            label="Duration"
            value={t.duration}
            min={0.5}
            max={seamMax}
            step={0.5}
            testid="mini-field-transition-dur"
            onCommit={(v) => setTransition(clip.id, { duration: v })}
          />
          <ParamRow
            label="Alignment"
            value={Math.round(t.alignment * 100)}
            min={0}
            max={100}
            step={1}
            format={(v) => `${v}%`}
            testid="mini-transition-alignment"
            onCommit={(v) => setTransition(clip.id, { alignment: v / 100 })}
          />
          <button
            type="button"
            className="mini-inspector__mute"
            onClick={() => removeTransition(clip.id)}
            data-testid="mini-btn-transition-remove"
          >
            <X size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Remove transition</span>
          </button>
        </>
      ) : (
        <>
          <p className="mini-inspector__hint">
            {touching
              ? canMint
                ? 'Hard cut — the clips touch; add a cross transition.'
                : 'The seam is too short for a transition (both clips need 1s).'
              : 'No touching clip after this one — the tail is detached (use a fade instead).'}
          </p>
          {canMint && (
            <button
              type="button"
              className="mini-inspector__mute"
              onClick={() => setTransition(clip.id)}
              data-testid="mini-btn-transition-add"
            >
              <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>Add cross transition</span>
            </button>
          )}
        </>
      )}
    </Group>
  );
}

/** The Fade group: the clip-edge fades (in/out) — mint/edit/remove. */
function FadeGroup({ clipId }: { clipId: string }) {
  const clip = useMini((s) => s.doc.clips.find((c) => c.id === clipId));
  const setFade = useMini((s) => s.setFade);
  const removeFade = useMini((s) => s.removeFade);
  if (!clip) return null;
  const maxDur = Math.min(clip.duration, 4);
  return (
    <Group title="Fades" testid="mini-group-fades" defaultOpen={!!(clip.fadeIn || clip.fadeOut)}>
      {(clip.fadeIn === undefined && clip.fadeOut === undefined) && (
        <p className="mini-inspector__hint">No fades on this clip.</p>
      )}
      {clip.fadeIn !== undefined ? (
        <>
          <NumberField
            label="Fade in"
            value={clip.fadeIn}
            min={0.5}
            max={maxDur}
            step={0.5}
            testid="mini-field-fadein"
            onCommit={(v) => setFade(clip.id, 'in', v)}
          />
          <button
            type="button"
            className="mini-inspector__mute"
            onClick={() => removeFade(clip.id, 'in')}
            data-testid="mini-btn-fadein-remove"
          >
            <X size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Remove fade in</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          className="mini-inspector__mute"
          onClick={() => setFade(clip.id, 'in')}
          data-testid="mini-btn-fadein-add"
        >
          <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
          <span>Add fade in</span>
        </button>
      )}
      {clip.fadeOut !== undefined ? (
        <>
          <NumberField
            label="Fade out"
            value={clip.fadeOut}
            min={0.5}
            max={maxDur}
            step={0.5}
            testid="mini-field-fadeout"
            onCommit={(v) => setFade(clip.id, 'out', v)}
          />
          <button
            type="button"
            className="mini-inspector__mute"
            onClick={() => removeFade(clip.id, 'out')}
            data-testid="mini-btn-fadeout-remove"
          >
            <X size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Remove fade out</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          className="mini-inspector__mute"
          onClick={() => setFade(clip.id, 'out')}
          data-testid="mini-btn-fadeout-add"
        >
          <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
          <span>Add fade out</span>
        </button>
      )}
    </Group>
  );
}
