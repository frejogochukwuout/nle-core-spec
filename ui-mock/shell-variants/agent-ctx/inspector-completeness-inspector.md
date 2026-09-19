# Task: Inspector-panel completeness (spec 18 §4.4)

Agent: inspector-completeness agent
Scope: /home/z/nle-core-spec/ui-mock/shell-variants

## Files changed
- `src/components/shell/Inspector.tsx` — full rewrite (1003 lines).
- `src/lib/timecode.ts` — appended shared `parseTc` (HH:MM:SS:FF | SS.s | Nf, frame-overflow guard).
- `src/styles/app.css` — appended `@layer components` block at end: `.num-field-invalid`,
  `.num-field-msg`, `.insp-badge`, `.chip-mixed`, `.mini-btn`, `.icon-btn-sm`.
  NOTE: a concurrent agent (timeline pass) appended another components block after mine —
  no class-name collisions.

## Implemented (per §4.4)
- NumberField contract: 50ms-debounced keystroke live-preview, Enter/blur settle,
  invalid = red 1px border + inline msg + focus retained + no dispatch; blur-invalid reverts.
- Time fields (fades, transition duration) use the one shared parseTc.
- Sliders: local drag preview, commit-on-release; §5A double-click reset on fields+sliders.
- Video tab: Transform (pos X/Y, scale, rotation, opacity→setElementField, flip H/V local Set)
  + per-group Reset; Speed (rate%→speed, preserve-pitch local chip); quick-seek In/Mid/Out
  on the source card (setPlayhead only).
- Audio tab (audio-bearing only): Levels (gain dB, pan — local mock state) + Fades
  (audioFadeIn/Out → setElementField), both groups with Reset.
- Effects tab: toggle/remove/reorder (effects-array patch via setElementField — store has
  no reorder action), EFFECT_DEFS param editors (slider+field+badge, debounced
  setEffectParam), add-effect picker (names not on clip), "No effects" empty row.
- Transition tab: 27-entry presentation select, TC-validated duration 0.1–2.0s,
  alignment 0–1, "Add crossfade" via setTransition(id, {}) when a cut follows,
  Remove disabled + data-tip "mock: removal needs store action".
- Multi-select: common-subset tabs/fields (every() predicates), "Mixed values" chips,
  fan-out commits (comment: real shell = one coalesced updateElements batch).
- Hidden-not-disabled tabs; testids `shell-inspector`, `shell-inspector-tab-*`,
  `shell-inspector-state-empty` ("Nothing to inspect") preserved; extra testids:
  chip-mixed-values, fx-param-value, transition-presentation, quick-seek-{in,mid,out}.

## Status
- `npx tsc --noEmit` → clean (exit 0).
- Mock-only (honest, commented): position/scale/rotation/flip, gain/pan, preserve-pitch
  (no ElementJSON fields); effect reorder via array patch; transition removal; multi
  effect editing (summary note); history granularity for fan-outs.
