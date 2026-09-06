/* ColorInspectorRail — R20-W4b (DESIGN-R20 D3, C51 fold: "clip-level color
   sections rendered with the W3 inspector shell grammar"). The color page's
   RIGHT RAIL: the same Group (SectionHeader) + ParamRow (ControlRow) grammar
   as the type-driven Inspector — imported from Inspector.tsx, NOT forked —
   carrying the target's scalar grade params.

   Single-owner law: the target resolves from the STORE (resolveGradeTargetId
   — 'timeline' or selection[0]), the same resolver the ColorConsole uses, so
   rail and console CANNOT disagree. While target = Timeline the header shows
   the 'Timeline grade' badge (the timeline grade's ONLY editor is the
   console — this rail edits whichever target is active, never a stale clip).

   Every ParamRow writes ONE undoable setGrade on commit (pointer-up / Enter /
   dbl-click reset — the W3 ParamRow law IS the D3 commit law). */

import { Film } from 'lucide-react';
import { Group, ParamRow } from '../../shell/Inspector';
import { useGradeRecord } from './useGradeTarget';
import { useGradingToast } from './useHonestToast';
import { gradeTargetLabel } from './useGradeTarget';
import { DEFAULT_GRADE } from '../../../lib/color';
import { useUi } from '../../../state/useUiStore';
import type { GradePatch } from '../../../state/useUiStore';

/** one scalar param row: GradeParams field + rail grammar. */
const PARAMS: {
  key: 'exposure' | 'contrast' | 'pivot' | 'temperature' | 'tint' | 'midDetail' | 'saturation' | 'hue';
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals: number;
  fmt: (v: number) => string;
}[] = [
  { key: 'exposure', label: 'Exposure', min: -2, max: 2, step: 0.05, decimals: 2, fmt: (v) => v.toFixed(2) },
  { key: 'contrast', label: 'Contrast', min: 0, max: 2, step: 0.005, decimals: 3, fmt: (v) => v.toFixed(3) },
  { key: 'pivot', label: 'Pivot', min: 0, max: 1, step: 0.005, decimals: 3, fmt: (v) => v.toFixed(3) },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100, step: 0.5, unit: '', decimals: 1, fmt: (v) => v.toFixed(1) },
  { key: 'tint', label: 'Tint', min: -100, max: 100, step: 0.5, unit: '', decimals: 1, fmt: (v) => v.toFixed(1) },
  { key: 'midDetail', label: 'Mid Detail', min: -100, max: 100, step: 1, unit: '', decimals: 1, fmt: (v) => v.toFixed(1) },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, unit: '', decimals: 1, fmt: (v) => v.toFixed(1) },
  { key: 'hue', label: 'Hue', min: 0, max: 100, step: 1, unit: '', decimals: 1, fmt: (v) => v.toFixed(1) },
];

const fieldPatch = (key: (typeof PARAMS)[number]['key'], v: number): GradePatch => {
  const p: GradePatch = {};
  p[key] = v;
  return p;
};

export function ColorInspectorRail() {
  const rec = useGradeRecord();
  const tell = useGradingToast();
  const scenes = useUi((s) => s.scenes);

  if (rec.targetId == null) {
    return (
      <div data-testid="shell-color-rail" className="flex h-full min-h-0 flex-col bg-panel">
        <div className="border-b border-hairline px-3 py-2.5">
          <span data-testid="shell-color-rail-chip" className="text-[11.5px] font-medium text-tfaint">
            Color — no clip selected
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-center">
          <p className="text-[11px] text-tfaint">Click a clip in the console lane strip, or switch the target to Timeline.</p>
        </div>
      </div>
    );
  }

  const { grade, setGrade, isTimeline } = rec;
  const label = gradeTargetLabel(scenes, rec.targetId);

  return (
    <div data-testid="shell-color-rail" className="scroll-y flex h-full min-h-0 flex-col bg-panel">
      {/* target chip — WHICH grade the rail edits (console + rail share the
          resolver, so they never disagree) */}
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
        <Film size={14} aria-hidden className="shrink-0 text-tmuted" />
        <span data-testid="shell-color-rail-chip" className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-tprimary" title={label}>
          {label}
        </span>
        {isTimeline && (
          <span
            data-testid="shell-color-rail-timeline-badge"
            className="shrink-0 rounded-[2px] border border-strong px-[5px] py-[1px] text-[10px] font-semibold tracking-wide text-tprimary"
            title="The post-clip timeline grade — its ONLY editor is the ColorConsole (single owner)"
          >
            Timeline grade
          </span>
        )}
      </div>

      <Group title="Color" note="Bound to the mockGrades sidecar (spec 08 §4.2 fields) — viewer preview renders with the canvas (render round).">
        {PARAMS.map((p) => (
          <ParamRow
            key={p.key}
            label={p.label}
            value={grade[p.key]}
            min={p.min}
            max={p.max}
            step={p.step}
            unit={p.unit}
            decimals={p.decimals}
            resetTo={DEFAULT_GRADE[p.key]}
            title={`${p.label} — spec 08 §4.2`}
            onCommit={(v) => {
              tell();
              setGrade(fieldPatch(p.key, v));
            }}
          />
        ))}
      </Group>
    </div>
  );
}
