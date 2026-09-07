/* DeliverPage — spec 18 §4.8 / specs 10-11: FCPXML export, optional cloud
   master, render settings, progress list (job rows + retry per §6.4).
   R22 W5 (issues #88/#89 — the layout ruling): the three regions follow the
   STANDARD mainbody grammar now:
     LEFT   (280px)  — PRESETS ONLY (#89: "left side is related to asset
                       browsing (presets are okay, queues are not)");
     CENTER (flex)   — the VIDEO PREVIEW (the program Viewer, read-only —
                       #88: "video preview should still be here") while
                       idle; THE RENDER QUEUE replaces the preview while a
                       render is active (#89: "the center view may be better
                       for these queues replacing the video preview when
                       rendering is happening");
     RIGHT  (340px)  — the deliver INSPECTOR: render settings + the export
                       summary (the metadata the reviewer wanted "in
                       inspector, or as a separate console panel", #88).
   th_mto38qzp: preset tiles keep the breathing-room grammar.
   Honest mock: the export CTA / Reveal / Retry never run an encode — each
   pushes an info toast that says the render queue is mock, and the CTA
   appends a static queued job row (it never progresses — so the queue view
   persists after queueing; that IS the "rendering is happening" state).
   Render settings stay LOCAL state the queue READS. §4.2 state rows: an
   empty active scene honestly disables the CTA + the queue's empty row. */

import { FileVideo, FileCode2, Camera, Download, RefreshCw, CheckCircle2, LoaderCircle, Clock, TriangleAlert, MonitorPlay } from 'lucide-react';
import { useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { Viewer } from '../shell/Viewer';
import { project, sceneDuration } from '../../lib/mockData';
import { tc } from '../../lib/timecode';

const PRESETS = [
  { id: 'fcpxml', icon: FileCode2, name: 'FCPXML 1.10', desc: 'Handoff to FCP / Resolve / Premiere', badge: 'primary' },
  { id: 'master', icon: FileVideo, name: 'Master · H.264', desc: 'Cloud render (headless Chrome + GPU)', badge: 'cloud' },
  { id: 'frame', icon: Camera, name: 'Current frame · PNG', desc: 'Playhead frame export', badge: '' },
];

const CODECS = [
  { id: 'h264', label: 'H.264' },
  { id: 'h265', label: 'H.265' },
  { id: 'prores', label: 'ProRes 422' },
];

type Job = { id: string; name: string; progress: number; state: 'done' | 'running' | 'queued' | 'failed'; time: string; bundle?: boolean };

const JOBS: Job[] = [
  /* §4.2 error-state fixture (R14): one permanently-failed row — the Retry
     affordance already exists for non-done rows and fires the honest toast.
     R22 W5: NO running row by default — the center shows the PREVIEW (#88);
     queueing an export flips it to the queue (#89's replacement rule). */
  { id: 'j-0', name: 'Beach Doc — v2 master.mp4', progress: 62, state: 'failed', time: '12m ago' },
  { id: 'j-1', name: 'Beach Doc — v3 master.mp4', progress: 100, state: 'done', time: '2m ago' },
  { id: 'j-2', name: 'Beach Doc — v3.fcpxml', progress: 100, state: 'done', time: '2m ago' },
  { id: 'j-3', name: 'Interview selects master.mp4', progress: 100, state: 'done', time: '26m ago' },
];

/* file suffix for a queued row per preset — keeps the honest-mock story */
const EXPORT_EXT: Record<string, string> = { fcpxml: 'fcpxml', master: 'mp4', frame: 'png' };

const MOCK_RENDER_DETAIL = 'render queue is mock — no encode runs';

export function DeliverPage() {
  const [preset, setPreset] = useState('fcpxml');
  const [jobs, setJobs] = useState<Job[]>(JOBS);
  /* the center-view toggle: queueing an export auto-shows the queue; the
     header toggle lets the user inspect past renders while idle (#89's
     center home + #88's preview-default) */
  const [showQueue, setShowQueue] = useState(false);
  const pushToast = useUi((s) => s.pushToast);
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  /* th_mto37ba3: the RANGE block reads the STORE loop (spec 16 §3.4 — the
     timeline's I/O marks ARE the deliver range selection), not a hardcoded
     string; moving the loop brackets on the timeline moves this readout */
  const loop = useUi((s) => s.loop);

  /* render settings = LOCAL state the queued row READS (R14): range /
     resolution feed the job name, bundle-media toggles a chip on the row,
     format mirrors the preset and codec feeds the summary (th_mto37ba3) */
  const [range, setRange] = useState<'inout' | 'full'>('inout');
  const [resolution, setResolution] = useState<'1080' | '2160'>('1080');
  const [codec, setCodec] = useState('h264');
  const [bundleMedia, setBundleMedia] = useState(true);
  const rangeLabel = range === 'inout' ? 'In–Out' : 'Full';
  const resLabel = resolution === '2160' ? '2160p' : '1080p';

  /* §4.2 empty state: an element-less active scene has nothing to render —
     honest-disabled route: the CTA is aria-disabled with the reason in the
     tip and the queue swaps for the empty-state row (no fake export) */
  const scene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];
  const emptyTimeline = scene.tracks.every((t) => t.elements.length === 0);
  const duration = sceneDuration(scene);

  /** honest-mock export: toast the preset + append a static queued row whose
      name reflects the current range/resolution choices */
  const queueExport = () => {
    if (emptyTimeline) return; // aria-disabled guard — nothing to export
    const p = PRESETS.find((x) => x.id === preset)!;
    pushToast({ kind: 'info', title: `Export queued: ${p.name}`, detail: MOCK_RENDER_DETAIL });
    setJobs((prev) => [...prev, {
      id: `j-${prev.length + 1}`,
      name: `Beach Doc — Rough Cut — ${resLabel} · ${rangeLabel}.${EXPORT_EXT[preset]}`,
      progress: 0,
      state: 'queued',
      time: '',
      bundle: bundleMedia,
    }]);
    setShowQueue(true); // the center flips to the queue (#89)
  };

  /* R22 W5 (#89): "rendering is happening" = any queued/running row. While
     true the CENTER swaps the video preview for the queue; the honest mock
     queued row never progresses, so the queue view persists after the CTA
     (that IS the mock's rendering state). The header toggle reviews past
     renders while idle. */
  const renderActive = jobs.some((j) => j.state === 'queued' || j.state === 'running');
  const queueView = renderActive || showQueue;

  return (
    <div data-testid="shell-deliver" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-panel">
      <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <span className="text-[12px] font-semibold text-tprimary">Deliver</span>
        <span className="text-[11px] text-tfaint">export &amp; handoff</span>
        <div className="grow" />
        <button
          type="button"
          className={`toolbtn !py-[2px] !text-[11px] ${queueView ? 'active' : ''}`}
          aria-pressed={queueView}
          data-testid="shell-deliver-queue-toggle"
          data-tip={queueView ? 'Back to the video preview' : 'Review the render queue (past + active renders)'}
          onClick={() => setShowQueue((v) => !v)}
        >
          <Clock size={12} strokeWidth={1.7} />
          <span>Queue{renderActive ? ' · rendering' : ` · ${jobs.length}`}</span>
        </button>
      </div>

      {/* the standard-grammar body: presets left · preview/queue center ·
          the deliver inspector right (R22 W5, #88/#89).
          R23-FIX (review-sweep item 8, R2-F6/R5-P2-3): the row carries
          overflow-x-auto + min-w-0 — the three regions keep their minimums
          (280+flex+340 ≥ ~900px), so a narrow shell used to CLIP the row
          with no scroll reachable (the queue + settings fell off the right
          edge). The row now scrolls honestly; Pages.stories'
          narrow-container story already claimed this — now true. */}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-x-auto">

        {/* ---- LEFT: PRESETS ONLY (min 260px) — #89 ----------------------- */}
        <div data-testid="shell-deliver-queue" className="flex w-[280px] min-w-[260px] shrink-0 flex-col border-r border-hairline">
          <div className="scroll-y min-h-0 flex-1 px-3 py-3">
            {/* preset picker — th_mto38qzp grammar: 2-col wrapping grid,
                taller tiles, icon + title + subtitle breathing room */}
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-tfaint">Presets</div>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const active = preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    data-testid={`shell-deliver-preset-${p.id}`}
                    aria-pressed={active}
                    aria-label={`${p.name} export preset`}
                    className={`flex min-h-[78px] flex-col items-start gap-1.5 rounded-[var(--radius)] border px-2.5 py-2.5 text-left transition-colors ${
                      active ? 'border-accent bg-accent/10' : 'border-soft hover:bg-[var(--hover-overlay)]'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-accent' : 'text-tmuted'} />
                    <span className="text-[11.5px] font-medium leading-tight text-tprimary">{p.name}</span>
                    <span className="text-[11px] leading-snug text-tmuted">{p.desc}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-tfaint">
              {renderActive
                ? 'Rendering — the queue shows in the center view.'
                : 'Queue an export — the render queue replaces the center preview while rendering.'}
            </p>
          </div>
        </div>

        {/* ---- CENTER: the video PREVIEW (idle) / the QUEUE (rendering) —
              #88 + #89 ------------------------------------------------------ */}
        {queueView ? (
          <div data-testid="shell-deliver-summary" className="flex min-w-0 min-w-0 flex-1 flex-col">
            <div className="scroll-y min-h-0 flex-1 px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* R23-FIX (item 9, R2-F7): the spinner + "rendering"
                      label ride renderActive — the queue view is reachable
                      while IDLE (the header toggle / a past-renders review),
                      and an idle queue claiming "rendering" was a lying
                      header. Idle = plain "Render queue" label, no spin. */}
                  {renderActive ? (
                    <>
                      <LoaderCircle size={13} className="animate-spin text-accent" aria-hidden="true" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">Render queue — rendering</span>
                    </>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">Render queue</span>
                  )}
                </div>
                <span className="text-[10px] text-tfaint" data-tip="The queued row is the honest mock — no encode runs; the preview returns when the mock completes">mock render</span>
              </div>
              {/* §4.2: the empty scene swaps the queue for the empty-state row */}
              {emptyTimeline ? (
                <div data-testid="shell-deliver-state-empty" className="rounded-[var(--radius)] border border-dashed border-soft px-3 py-4 text-center text-[11px] text-tmuted">
                  Timeline is empty — nothing to export
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {jobs.map((j) => (
                    <div key={j.id} className="flex items-center gap-2.5 rounded-[var(--radius)] border border-soft px-3 py-2.5" data-testid="shell-deliver-job">
                      {j.state === 'done' ? (
                        <CheckCircle2 size={14} className="shrink-0 text-[var(--mk-green)]" />
                      ) : j.state === 'failed' ? (
                        <TriangleAlert size={14} className="shrink-0 text-[var(--danger)]" />
                      ) : j.state === 'queued' ? (
                        <Clock size={14} className="shrink-0 text-tmuted" />
                      ) : (
                        <LoaderCircle size={14} className="shrink-0 animate-spin text-accent" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate text-[11.5px] text-tprimary">{j.name}</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {j.bundle && (
                              <span className="mono rounded border border-soft px-1 text-[10px] text-tmuted" data-testid="shell-deliver-job-bundle">bundle media</span>
                            )}
                            {j.state === 'failed' ? (
                              <span className="mono text-[11px] font-semibold text-[var(--danger)]">Failed</span>
                            ) : (
                              <span className="mono text-[11px] text-tmuted">{j.state === 'done' ? j.time : `${j.progress}%`}</span>
                            )}
                          </div>
                        </div>
                        {j.state === 'running' && (
                          <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-[var(--border-soft)]">
                            <div className="h-full rounded-full" style={{ width: `${j.progress}%`, background: 'var(--accent-selection)' }} />
                          </div>
                        )}
                      </div>
                      {j.state === 'done' ? (
                        <button
                          className="icon-btn !h-[22px]"
                          data-tip="Reveal file"
                          aria-label="Reveal file"
                          onClick={() => pushToast({ kind: 'info', title: 'Reveal file', detail: 'render queue is mock — no file was written' })}
                        >
                          <Download size={12} />
                        </button>
                      ) : (
                        <button
                          className="icon-btn !h-[22px]"
                          data-tip="Retry"
                          aria-label="Retry job"
                          onClick={() => pushToast({ kind: 'info', title: `Retry ${j.name}`, detail: MOCK_RENDER_DETAIL })}
                        >
                          <RefreshCw size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div data-testid="shell-deliver-preview" className="flex min-w-0 flex-1 flex-col">
            {/* #88: the video preview RETURNS — the program viewer (real,
                read-only; the transport drives the real playhead) */}
            <Viewer duration={duration} />
          </div>
        )}

        {/* ---- RIGHT: the deliver INSPECTOR (min 300px) — #88 ------------ */}
        <div data-testid="shell-deliver-settings" className="scroll-y flex w-[340px] min-w-[300px] shrink-0 flex-col border-l border-hairline">
          <div className="min-h-0 flex-1 px-3 py-3">
            {/* project metadata section (spec 18 §4.1: project title deep-links here) */}
            <div className="mb-4 flex items-center justify-between rounded-[var(--radius)] border border-soft bg-inset px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <MonitorPlay size={18} strokeWidth={1.6} className="shrink-0 text-accent" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-tprimary">Beach Doc — Rough Cut</div>
                  <div className="mono text-[11px] text-tfaint">{tc(duration)} · {project.settings.fps} fps · {project.settings.width}×{project.settings.height}</div>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-soft px-2 py-0.5 text-[11px] text-tmuted">Edited</span>
            </div>

            {/* timeline identity — the export targets the ACTIVE timeline */}
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">Export summary</div>
            <div className="mb-4 flex flex-col gap-2.5 rounded-[var(--radius)] border border-soft px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] text-tmuted">Timeline</span>
                <span className="text-[11.5px] font-medium text-tprimary">{scene.name}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] text-tmuted">Format</span>
                <span className="text-[11.5px] text-tprimary">{PRESETS.find((p) => p.id === preset)?.name}</span>
              </div>
              {preset === 'master' && (
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[11px] text-tmuted">Codec</span>
                  <span className="text-[11.5px] text-tprimary">{CODECS.find((c) => c.id === codec)?.label}</span>
                </div>
              )}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] text-tmuted">Resolution</span>
                <span className="mono text-[11.5px] text-tprimary">{resolution === '2160' ? '3840 × 2160' : '1920 × 1080'}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] text-tmuted">Destination</span>
                <span className="mono text-[11.5px] text-tprimary">~/Downloads/beach-doc/</span>
              </div>

              {/* the RANGE — th_mto37ba3: live loop in/out TCs from the store.
                  The timeline's I/O marks ARE the deliver range selection
                  (spec 16 §3.4); the hint points the user where to change it */}
              <div className="mt-1 rounded-[var(--radius)] border border-soft bg-inset px-3 py-2.5">
                <div className="text-[11px] font-semibold text-tprimary">In → Out range selection</div>
                <div className="mono mt-1 text-[12px] text-accent" data-testid="shell-deliver-range">
                  {tc(loop.start)} → {tc(loop.end)}
                </div>
                <div className="mt-1 text-[11px] text-tmuted">set I/O at the playhead (I / O keys, the viewer transport marks) or drag the in/out range band on the compact timeline below</div>
              </div>
            </div>

            {/* ---- the deliver inspector's render settings half (#88) ----- */}
            <div className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">Render settings</div>
            {/* th_mto35hrm: field rows WRAP (label keeps its basis, control
                takes the rest) and the <select> is min-w-0 + truncate — the
                long In→Out option can no longer push the column wide */}
            <div className="mb-3 flex flex-col gap-2 rounded-[var(--radius)] border border-soft px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-[84px] shrink-0 grow basis-[84px] text-[11px] text-tmuted">Format</span>
                <select
                  className="field min-w-0 grow cursor-pointer truncate"
                  aria-label="Export format"
                  value={preset}
                  onChange={(e) => setPreset(e.target.value)}
                >
                  <option value="fcpxml">FCPXML 1.10</option>
                  <option value="master">MP4 · H.264 master</option>
                  <option value="frame">PNG · current frame</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-[84px] shrink-0 grow basis-[84px] text-[11px] text-tmuted">Codec</span>
                <select
                  className="field min-w-0 grow cursor-pointer truncate"
                  aria-label="Export codec"
                  value={codec}
                  disabled={preset !== 'master'}
                  title={preset !== 'master' ? 'codec applies to the video master preset' : 'Export codec'}
                  onChange={(e) => setCodec(e.target.value)}
                >
                  {CODECS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-[84px] shrink-0 grow basis-[84px] text-[11px] text-tmuted">Range</span>
                <select className="field min-w-0 grow cursor-pointer truncate" aria-label="Export range" value={range} onChange={(e) => setRange(e.target.value as 'inout' | 'full')}>
                  <option value="inout">In → Out ({tc(loop.start)} – {tc(loop.end)})</option>
                  <option value="full">Full timeline ({tc(duration)})</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-[84px] shrink-0 grow basis-[84px] text-[11px] text-tmuted">Resolution</span>
                <select className="field min-w-0 grow cursor-pointer truncate" aria-label="Export resolution" value={resolution} onChange={(e) => setResolution(e.target.value as '1080' | '2160')}>
                  <option value="1080">1920 × 1080 (project)</option>
                  <option value="2160">3840 × 2160</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-[84px] shrink-0 grow basis-[84px] text-[11px] text-tmuted">Destination</span>
                <span className="field min-w-0 grow truncate">~/Downloads/beach-doc/</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-[84px] shrink-0 grow basis-[84px] text-[11px] text-tmuted">Bundle media</span>
                <input type="checkbox" checked={bundleMedia} onChange={(e) => setBundleMedia(e.target.checked)} className="accent-[var(--accent-focus)]" aria-label="Bundle media with FCPXML" />
                <span className="text-[11px] text-tmuted">sidecar files for round-trip (spec 10)</span>
              </div>
            </div>

            {/* export CTA — accent-focus has no AA text pair in resolve/studio
                (recorded spec finding); use the accent-selection pair — per accent:
                gold 9.1:1 / ember 6.0:1 / violet 5.05:1 (R13: violet darkened from
                #7b5cff after a live AA measurement caught 3.99:1). §4.2 empty
                state: honest-disabled (aria-disabled + reason in the tip) */}
            <button
              data-testid="shell-deliver-btn-export-fcpxml"
              aria-disabled={emptyTimeline || undefined}
              data-tip={emptyTimeline ? 'nothing to export — the timeline is empty' : undefined}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] px-3 py-2.5 text-[12px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-selection)', color: 'var(--accent-contrast)' }}
              onClick={emptyTimeline ? undefined : queueExport}
            >
              <Download size={13} />
              Export {PRESETS.find((p) => p.id === preset)?.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
