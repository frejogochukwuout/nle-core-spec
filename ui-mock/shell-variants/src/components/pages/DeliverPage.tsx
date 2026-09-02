/* DeliverPage — spec 18 §4.8 / specs 10-11: FCPXML export, optional cloud
   master, render settings, progress list (job rows + retry per §6.4). */

import { FileVideo, FileCode2, Camera, Download, RefreshCw, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

const PRESETS = [
  { id: 'fcpxml', icon: FileCode2, name: 'FCPXML 1.10', desc: 'Handoff to FCP / Resolve / Premiere', badge: 'primary' },
  { id: 'master', icon: FileVideo, name: 'Master · H.264', desc: 'Cloud render (headless Chrome + GPU)', badge: 'cloud' },
  { id: 'frame', icon: Camera, name: 'Current frame · PNG', desc: 'Playhead frame export', badge: '' },
];

const JOBS = [
  { id: 'j-1', name: 'Beach Doc — v3 master.mp4', progress: 100, state: 'done', time: '2m ago' },
  { id: 'j-2', name: 'Beach Doc — v3.fcpxml', progress: 100, state: 'done', time: '2m ago' },
  { id: 'j-3', name: 'Interview selects master.mp4', progress: 38, state: 'running', time: '' },
];

export function DeliverPage() {
  const [preset, setPreset] = useState('fcpxml');

  return (
    <div data-testid="shell-deliver" className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <span className="text-[12px] font-semibold text-tprimary">Deliver</span>
        <span className="text-[11px] text-tfaint">export &amp; handoff</span>
      </div>

      <div className="scroll-y min-h-0 flex-1 px-3 py-3">
        {/* project metadata section (spec 18 §4.1: project title deep-links here) */}
        <div className="mb-3 flex items-center justify-between rounded-[var(--radius)] border border-soft bg-inset px-3 py-2">
          <div>
            <span className="text-[11.5px] font-semibold text-tprimary">Beach Doc — Rough Cut</span>
            <span className="mono ml-2 text-[11px] text-tfaint">00:00:30:00 · 24 fps · 1920×1080</span>
          </div>
          <span className="rounded-full border border-soft px-2 py-0.5 text-[11px] text-tmuted">Edited</span>
        </div>

        {/* preset picker */}
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-tfaint">Presets</div>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const active = preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                data-testid={`shell-deliver-preset-${p.id}`}
                className={`flex flex-col items-start gap-1 rounded-[var(--radius)] border px-2.5 py-2 text-left transition-colors ${
                  active ? 'border-accent bg-accent/10' : 'border-soft hover:bg-[var(--hover-overlay)]'
                }`}
              >
                <Icon size={15} className={active ? 'text-accent' : 'text-tmuted'} />
                <span className="text-[11.5px] font-medium text-tprimary">{p.name}</span>
                <span className="text-[11px] leading-tight text-tmuted">{p.desc}</span>
              </button>
            );
          })}
        </div>

        {/* render settings */}
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">Render settings</div>
        <div className="mb-3 flex flex-col gap-1.5 rounded-[var(--radius)] border border-soft px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="w-[92px] shrink-0 text-[11px] text-tmuted">Range</span>
            <select className="field flex-1 cursor-pointer" aria-label="Export range" defaultValue="inout">
              <option value="inout">In → Out (00:00:02:00 – 00:00:28:00)</option>
              <option value="full">Full timeline (00:00:30:00)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[92px] shrink-0 text-[11px] text-tmuted">Resolution</span>
            <select className="field flex-1 cursor-pointer" aria-label="Export resolution">
              <option>1920 × 1080 (project)</option>
              <option>3840 × 2160</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[92px] shrink-0 text-[11px] text-tmuted">Destination</span>
            <span className="field flex-1">~/Downloads/beach-doc/</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[92px] shrink-0 text-[11px] text-tmuted">Bundle media</span>
            <input type="checkbox" defaultChecked className="accent-[var(--accent-focus)]" aria-label="Bundle media with FCPXML" />
            <span className="text-[11px] text-tfaint">sidecar files for round-trip (spec 10)</span>
          </div>
        </div>

        {/* export CTA — accent-focus has no AA text pair in resolve/studio
            (recorded spec finding); use the accent-selection pair (9.1:1) */}
        <button
          data-testid="shell-deliver-btn-export-fcpxml"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] px-3 py-2.5 text-[12px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent-selection)', color: 'var(--accent-contrast)' }}
        >
          <Download size={13} />
          Export {PRESETS.find((p) => p.id === preset)?.name}
        </button>

        {/* job list */}
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">Jobs</div>
        <div className="flex flex-col gap-1.5">
          {JOBS.map((j) => (
            <div key={j.id} className="flex items-center gap-2.5 rounded-[var(--radius)] border border-soft px-2.5 py-2" data-testid="shell-deliver-job">
              {j.state === 'done' ? (
                <CheckCircle2 size={14} className="shrink-0 text-[var(--mk-green)]" />
              ) : (
                <LoaderCircle size={14} className="shrink-0 animate-spin text-accent" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[11.5px] text-tprimary">{j.name}</span>
                  <span className="mono shrink-0 text-[11px] text-tmuted">{j.state === 'done' ? j.time : `${j.progress}%`}</span>
                </div>
                {j.state === 'running' && (
                  <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-[var(--border-soft)]">
                    <div className="h-full rounded-full" style={{ width: `${j.progress}%`, background: 'var(--accent-selection)' }} />
                  </div>
                )}
              </div>
              {j.state === 'done' ? (
                <button className="icon-btn !h-[22px]" data-tip="Reveal file" aria-label="Reveal file"><Download size={12} /></button>
              ) : (
                <button className="icon-btn !h-[22px]" data-tip="Retry" aria-label="Retry job"><RefreshCw size={12} /></button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
