/* DeliverPage — spec 18 §4.8 / specs 10-11: FCPXML export, optional cloud
   master, render settings, progress list (job rows + retry per §6.4).
   R22 W5 (issues #88/#89 — the layout ruling): the three regions follow the
   STANDARD mainbody grammar:
     LEFT   (280px)  — PRESETS ONLY (#89: "left side is related to asset
                       browsing (presets are okay, queues are not)");
     CENTER (flex)   — the VIDEO PREVIEW (the program Viewer, read-only —
                       #88: "video preview should still be here") while
                       idle; THE RENDER QUEUE replaces the preview while a
                       render is active (#89);
     RIGHT  (340px)  — the deliver INSPECTOR (#88 + th_mtzp4arw, R25-W5:
                       inspection-family content ONLY — the project
                       metadata row + the render settings + the export CTA;
                       the export summary card MOVED OUT to the console-row
                       Export tab, see DeliverExportConsole below).
   th_mto38qzp: preset tiles keep the breathing-room grammar.
   R24-W4 (F5's P2): the VIEW state (jobs + showQueue) lives in the
   module-level zustand store src/state/deliverViewStore.ts (the
   stills/sourceRanges/stripArm unmount-survival precedents) — the queue
   SURVIVES page switches, and the mock render COMPLETES on the
   store-owned timer (500ms ticks) even while this page is unmounted.
   showQueue is the center view's SINGLE WRITER (allow-collapse — a
   collapsed render keeps walking in the store).
   R25-W5 (DESIGN-R25 §1 R18/R19 / §3 W5; threads th_mtzp4arw +
   th_mtzp4xeb) — the deliver wave, two rulings:
   1. th_mtzp4xeb "add a custom JSON format too": PRESETS gains the
      Custom JSON interchange preset. Unlike the render presets (whose
      queue is an honest mock — no encode runs), the JSON export is data
      the mock ACTUALLY owns, so its EXPORT action is REAL: build the doc
      via the pure src/lib/exportJson.ts builder and DOWNLOAD it (Blob +
      object URL + anchor click; jsdom no-ops the DOM half). No render row
      is queued for it — the mock queue exists precisely because encodes
      don't run; this export did. The honest toast says both.
   2. th_mtzp4arw "a separate panel the same place we do mixer console
      etc. … it is not inspection": the EXPORT SUMMARY card moved from the
      right column into the console row's new Export tab (the W3
      ConsoleTabs grammar extended to deliver: [Timeline | Export]). The
      split ruling: INSPECTATION-family content (editable settings —
      format/codec/range/resolution/destination/bundle + the CTA + the
      project identity row) STAYS in the right column; OPERATIONAL
      summary content (the readout rows + the loop range block + the queue
      status) lives in the console panel. The render settings moved to
      deliverViewStore with the panel (an AppShell-rendered sibling tree
      must read the same choice this inspector edits — the one-choice law).
   Honest mock: the render presets' export CTA / Reveal / Retry never run
   an encode — each pushes an info toast that says the render queue is
   mock, and the CTA queues a job row the store timer carries to
   completion. §4.2 state rows: an empty active scene honestly disables
   the CTA + the queue's empty row. */

import { FileVideo, FileCode2, FileJson, Camera, Download, RefreshCw, CheckCircle2, LoaderCircle, Clock, TriangleAlert, MonitorPlay } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { useDeliverView, type DeliverPresetId } from '../../state/deliverViewStore';
import { Viewer } from '../shell/Viewer';
import { project, sceneDuration } from '../../lib/mockData';
import { tc } from '../../lib/timecode';
import { buildExportJson, downloadJson, exportJsonFileName } from '../../lib/exportJson';

const PRESETS: { id: DeliverPresetId; icon: typeof FileVideo; name: string; desc: string; badge: string }[] = [
  { id: 'fcpxml', icon: FileCode2, name: 'FCPXML 1.10', desc: 'Handoff to FCP / Resolve / Premiere', badge: 'primary' },
  { id: 'master', icon: FileVideo, name: 'Master · H.264', desc: 'Cloud render (headless Chrome + GPU)', badge: 'cloud' },
  { id: 'frame', icon: Camera, name: 'Current frame · PNG', desc: 'Playhead frame export', badge: '' },
  /* R25-W5 (th_mtzp4xeb): the Custom JSON interchange preset — the one
     export this mock can REALLY produce (no encode, just the doc). */
  { id: 'json', icon: FileJson, name: 'Custom JSON', desc: 'NLE project interchange', badge: '' },
];

const CODECS = [
  { id: 'h264', label: 'H.264' },
  { id: 'h265', label: 'H.265' },
  { id: 'prores', label: 'ProRes 422' },
];

/* file suffix for a queued row per RENDER preset (the json preset never
   queues — its file is already local; see runExport) */
const EXPORT_EXT: Record<string, string> = { fcpxml: 'fcpxml', master: 'mp4', frame: 'png' };

const MOCK_RENDER_DETAIL = 'render queue is mock — no encode runs';

export function DeliverPage() {
  /* R24-W4 (F5's P2): jobs + showQueue live in the module-level
     deliverViewStore now (NOT local useState) — the queue survives page
     switches and the mock render walks on the store-owned timer while this
     page is unmounted. showQueue is the center view's SINGLE WRITER: the
     toggle below is honest mid-render (allow-collapse — a collapsed render
     keeps walking in the store; the old renderActive-locked view made the
     toggle a silent no-op). */
  const jobs = useDeliverView((s) => s.jobs);
  const showQueue = useDeliverView((s) => s.showQueue);
  const queueExport = useDeliverView((s) => s.queueExport);
  const toggleShowQueue = useDeliverView((s) => s.toggleShowQueue);
  /* R25-W5: the RENDER SETTINGS joined the store (th_mtzp4arw — the export
     summary's console-row panel is an AppShell-rendered SIBLING tree; it
     must read the same choice this inspector edits, so the settings moved
     out of local useState into deliverViewStore — one choice, every
     mirror: the preset tiles, the format select, the summary rows, the
     queued row's name). They survive page switches now (the queue's law).
     Render settings = the settings block the queue READS (R14): range /
     resolution feed the job name, bundle-media toggles a chip on the row,
     format mirrors the preset and codec feeds the summary. */
  const preset = useDeliverView((s) => s.preset);
  const codec = useDeliverView((s) => s.codec);
  const resolution = useDeliverView((s) => s.resolution);
  const range = useDeliverView((s) => s.range);
  const bundleMedia = useDeliverView((s) => s.bundleMedia);
  const setExportSettings = useDeliverView((s) => s.setExportSettings);
  const pushToast = useUi((s) => s.pushToast);
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  /* th_mto37ba3: the RANGE block reads the STORE loop (spec 16 §3.4 — the
     timeline's I/O marks ARE the deliver range selection), not a hardcoded
     string; moving the loop brackets on the timeline moves this readout */
  const loop = useUi((s) => s.loop);

  const rangeLabel = range === 'inout' ? 'In–Out' : 'Full';
  const resLabel = resolution === '2160' ? '2160p' : '1080p';

  /* §4.2 empty state: an element-less active scene has nothing to render —
     honest-disabled route: the CTA is aria-disabled with the reason in the
     tip and the queue swaps for the empty-state row (no fake export) */
  const scene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];
  const emptyTimeline = scene.tracks.every((t) => t.elements.length === 0);
  const duration = sceneDuration(scene);

  /** the export action. Render presets (fcpxml/master/frame): the honest
      mock — toast the preset + queue a row whose name reflects the current
      choices (the STORE timer walks it to done). The json preset (R25-W5,
      th_mtzp4xeb): a REAL download — build the interchange doc from the
      live state and save it; no mock render row is queued (the queue
      exists because encodes don't run — this export actually ran). */
  const runExport = () => {
    if (emptyTimeline) return; // aria-disabled guard — nothing to export
    const p = PRESETS.find((x) => x.id === preset)!;
    if (preset === 'json') {
      const fileName = exportJsonFileName(project.metadata.name, scene.name);
      downloadJson(buildExportJson({ scenes, loop }, scene.id), fileName);
      pushToast({
        kind: 'success',
        title: `Export downloaded: ${fileName}`,
        detail: 'custom JSON interchange (schema nle-interchange/1) — no render queued: the file is already local',
      });
      return;
    }
    pushToast({ kind: 'info', title: `Export queued: ${p.name}`, detail: MOCK_RENDER_DETAIL });
    queueExport({
      name: `Beach Doc — Rough Cut — ${resLabel} · ${rangeLabel}.${EXPORT_EXT[preset]}`,
      bundle: bundleMedia,
    });
    /* the store's queueExport auto-shows the queue (the center flips — #89) */
  };

  /* R22 W5 (#89): "rendering is happening" = any queued/running row — the
     header label + the queue view's spinner ride it. R24-W4: the VIEW
     itself is showQueue's alone (single writer); a render may be collapsed
     to the preview and it keeps walking in the store. */
  const renderActive = jobs.some((j) => j.state === 'queued' || j.state === 'running');
  const queueView = showQueue;

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
          onClick={toggleShowQueue}
        >
          <Clock size={12} strokeWidth={1.7} />
          <span>Queue{renderActive ? ' · rendering' : ` · ${jobs.length}`}</span>
        </button>
      </div>

      {/* the standard-grammar body: presets left · preview/queue center ·
          the deliver inspector right (R22 W5, #88/#89 + R25-W5's split).
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
                taller tiles, icon + title + subtitle breathing room.
                R25-W5: FOUR presets now (the json tile joins). */}
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-tfaint">Presets</div>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const active = preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setExportSettings({ preset: p.id })}
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
          <div data-testid="shell-deliver-summary" className="flex min-w-0 flex-1 flex-col">
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
                <span className="text-[10px] text-tfaint" data-tip="The queued row is the honest mock — no encode runs; the store's timer walks it to done (500ms ticks) — the queue toggle returns to the preview">mock render</span>
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

        {/* ---- RIGHT: the deliver INSPECTOR (min 300px) — #88 + R25-W5 ---
              th_mtzp4arw ("it is not inspection"): the INSPECTION-family
              content alone — the project identity row + the render
              settings + the export CTA. The export SUMMARY card moved to
              the console row's Export tab (DeliverExportConsole below,
              rendered by the AppShell under the [Timeline | Export] strip). */}
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
                  onChange={(e) => setExportSettings({ preset: e.target.value as DeliverPresetId })}
                >
                  <option value="fcpxml">FCPXML 1.10</option>
                  <option value="master">MP4 · H.264 master</option>
                  <option value="frame">PNG · current frame</option>
                  {/* R25-W5 (th_mtzp4xeb): the Custom JSON interchange format */}
                  <option value="json">Custom JSON · project interchange</option>
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
                  onChange={(e) => setExportSettings({ codec: e.target.value })}
                >
                  {CODECS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-[84px] shrink-0 grow basis-[84px] text-[11px] text-tmuted">Range</span>
                <select className="field min-w-0 grow cursor-pointer truncate" aria-label="Export range" value={range} onChange={(e) => setExportSettings({ range: e.target.value as 'inout' | 'full' })}>
                  <option value="inout">In → Out ({tc(loop.start)} – {tc(loop.end)})</option>
                  <option value="full">Full timeline ({tc(duration)})</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-[84px] shrink-0 grow basis-[84px] text-[11px] text-tmuted">Resolution</span>
                <select className="field min-w-0 grow cursor-pointer truncate" aria-label="Export resolution" value={resolution} onChange={(e) => setExportSettings({ resolution: e.target.value as '1080' | '2160' })}>
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
                <input type="checkbox" checked={bundleMedia} onChange={(e) => setExportSettings({ bundleMedia: e.target.checked })} className="accent-[var(--accent-focus)]" aria-label="Bundle media with FCPXML" />
                <span className="text-[11px] text-tmuted">sidecar files for round-trip (spec 10)</span>
              </div>
            </div>

            {/* export CTA — accent-focus has no AA text pair in resolve/studio
                (recorded spec finding); use the accent-selection pair — per accent:
                gold 9.1:1 / ember 6.0:1 / violet 5.05:1 (R13: violet darkened from
                #7b5cff after a live AA measurement caught 3.99:1). §4.2 empty
                state: honest-disabled (aria-disabled + reason in the tip).
                R25-W5: the json preset's CTA is the REAL download (runExport). */}
            <button
              data-testid="shell-deliver-btn-export-fcpxml"
              aria-disabled={emptyTimeline || undefined}
              data-tip={emptyTimeline ? 'nothing to export — the timeline is empty' : undefined}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] px-3 py-2.5 text-[12px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-selection)', color: 'var(--accent-contrast)' }}
              onClick={emptyTimeline ? undefined : runExport}
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

/* ---------- the console-row EXPORT panel (R25-W5, th_mtzp4arw) ----------
   The export summary's new home: the console row's Export tab (the W3
   ConsoleTabs grammar extended to deliver — [Timeline | Export]). The
   AppShell mounts this component when page === 'deliver' && consoleTab ===
   'export'; it is a SIBLING tree of DeliverPage, so it reads the shared
   surfaces: the render settings + the queue from deliverViewStore, the
   scene + the loop from useUi. The card's content moved from the right
   column (R22 W5's "Export summary" block) — the rows verbatim, plus the
   "what else makes sense" additions the reviewer invited: a Duration row
   and the read-only render-queue status strip (the detail rows stay in the
   center view; the strip mirrors the store, writes nothing). */

function SummaryRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-[11px] text-tmuted">{label}</span>
      <span className={`text-[11.5px] font-medium text-tprimary ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  );
}

export function DeliverExportConsole() {
  const preset = useDeliverView((s) => s.preset);
  const codec = useDeliverView((s) => s.codec);
  const resolution = useDeliverView((s) => s.resolution);
  const jobs = useDeliverView((s) => s.jobs);
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const loop = useUi((s) => s.loop);

  const scene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];
  const duration = sceneDuration(scene);
  const p = PRESETS.find((x) => x.id === preset)!;
  const isJson = preset === 'json';
  const renderActive = jobs.some((j) => j.state === 'queued' || j.state === 'running');

  return (
    <div
      data-testid="shell-deliver-export-console"
      aria-label="Export console panel"
      className="scroll-y flex min-h-0 flex-1 flex-col bg-panel"
    >
      {/* the summary column keeps a reading width — a full-row card would
          stretch its rows across the console row's whole width */}
      <div className="mx-auto flex w-full max-w-[560px] flex-col px-5 py-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">Export summary</div>
        <div data-testid="shell-deliver-export-summary" className="flex flex-col gap-2.5 rounded-[var(--radius)] border border-soft px-4 py-3">
          <SummaryRow label="Timeline" value={scene.name} />
          <SummaryRow label="Format" value={p.name} />
          {/* the codec row is the master preset's; the json preset gets its
              honest interchange fields instead (th_mtzp4xeb) */}
          {preset === 'master' && (
            <SummaryRow label="Codec" value={CODECS.find((c) => c.id === codec)?.label ?? ''} />
          )}
          {isJson && <SummaryRow label="Schema" value="nle-interchange/1" mono />}
          {isJson && <SummaryRow label="Pretty-printed" value="on" />}
          {/* resolution does not apply to a JSON interchange — the honest em-dash */}
          <SummaryRow
            label="Resolution"
            value={isJson ? '—' : resolution === '2160' ? '3840 × 2160' : '1920 × 1080'}
            mono
          />
          {/* R25-W5's "what else makes sense": the timeline's duration readout */}
          <SummaryRow label="Duration" value={`${tc(duration)} · ${project.settings.fps} fps`} mono />
          <SummaryRow label="Destination" value="~/Downloads/beach-doc/" mono />

          {/* the RANGE — th_mto37ba3 (moved verbatim from the right column,
              R25-W5): live loop in/out TCs from the store. The timeline's
              I/O marks ARE the deliver range selection (spec 16 §3.4); the
              hint points where to change it — on the Export tab the range
              band lives on the TIMELINE TAB (the copy says so honestly) */}
          <div className="mt-1 rounded-[var(--radius)] border border-soft bg-inset px-3 py-2.5">
            <div className="text-[11px] font-semibold text-tprimary">In → Out range selection</div>
            <div className="mono mt-1 text-[12px] text-accent" data-testid="shell-deliver-range">
              {tc(loop.start)} → {tc(loop.end)}
            </div>
            <div className="mt-1 text-[11px] text-tmuted">set I/O at the playhead (I / O keys, the viewer transport marks) or drag the in/out range band on the Timeline tab</div>
          </div>
        </div>

        {/* R25-W5 "what else makes sense": the read-only render-queue status
            strip — the queue's DETAIL rows stay in the center view (the
            header toggle owns them); this mirror writes nothing (the
            single-writer law) */}
        <div data-testid="shell-deliver-export-queue" className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-tmuted">
          {renderActive ? (
            <LoaderCircle size={13} className="animate-spin text-accent" aria-hidden="true" />
          ) : (
            <Clock size={13} className="text-tmuted" aria-hidden="true" />
          )}
          <span className="font-semibold">Render queue</span>
          <span className="mono rounded border border-soft px-1.5 py-0.5 text-[10px]">{jobs.length} jobs</span>
          <span className="mono rounded border border-soft px-1.5 py-0.5 text-[10px]" data-testid="shell-deliver-export-queue-state">
            {renderActive ? 'rendering' : 'idle'}
          </span>
          <span className="text-[10px] text-tfaint">review past + active renders from the deliver header's queue toggle</span>
        </div>
      </div>
    </div>
  );
}
