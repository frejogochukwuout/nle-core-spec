# Storybook 9 Review Surface — Work Record

**Task**: Convert the React 19 + Vite 8 + Tailwind 4 + Zustand shell-variants
app into a Storybook 9 design-review surface while keeping the standalone Vite
app working. Constraint honored: **zero runtime-code edits** — only story
files, `.storybook/` config, scripts, and docs were added/edited (the one
config-level edit besides additions: `tsconfig.json` include gains
`.storybook`, so `tsc --noEmit` covers the storybook config too).

## Versions installed (npm, exact 9.1.20 line)

`storybook`, `@storybook/react-vite`, `@storybook/addon-a11y`,
`@storybook/addon-docs`, `@storybook/addon-themes` — all **9.1.20**
(`@storybook/addon-essentials` has no v9 release; viewport/backgrounds toolbars
are built into storybook 9 core, so a11y + docs are the only addons wired in
main.ts; addon-themes is installed but NOT wired because it would write
light/dark markers on `<html>` that collide with the app's real
`[data-theme="light"]` variant).

Peer-dep note: `@storybook/react-vite@9` peers on vite `^5||^6||^7`, app pins
vite **8.2.2** → install required `--legacy-peer-deps`; added `.npmrc` with
`legacy-peer-deps=true` for reproducibility. Verified at runtime: boots clean,
stories render, vite build unaffected.

## Files added/changed

- `.storybook/main.ts` — framework react-vite, stories `src/**/*.stories.tsx`,
  addons (a11y, docs), staticDirs `../public` (mock thumbnails serve at `/media`).
- `.storybook/preview.tsx` — imports `src/styles/app.css`; decorators
  `[withStoreReset, withVariantProvider]`; `initialGlobals.viewport` =
  1920×1080 with `shell-1920x1080` / `shell-1440x900` / `shell-1280x800`
  options; `backgrounds: { disable: true }`; a11y context `#storybook-root`.
- `src/stories/decorators.tsx` — the isolation layer:
  - `withStoreReset` (outer, global): captures `useUi.getState()` ONCE at
    module load; on every story-id change replaces the store
    (`setState(pristine, true)`), removes localStorage keys
    `nle-shell-variants:v1` + `nle-mock-pool-prefs`, drops the `#v=…` hash,
    strips stray `data-theme|density|clipstyle|accent|headerstyle|variant`
    attrs from `<html>`. Runs in render phase → `VariantProvider`'s
    `loadVariant()` sees clean storage; never re-runs mid-story (play-safe).
  - `withVariantProvider` (inner, global): `VariantProvider > ConfirmProvider`
    (ConfirmProvider needed because Clip/SceneTabs call `useConfirm()`
    unconditionally — discovered via live render check, not by reading).
  - `StoreBoot` / `VariantBoot`: `useLayoutEffect` boots applying per-story
    store patches / variant dimensions before first paint (no default-state
    flash). `FullShell` = App composition minus the CSS-driven TooSmall
    overlay. `PanelBox` = fixed-geometry panel wrapper for solo stories.
- Stories (29 total): `AppShell.stories.tsx` (4), `Variants.stories.tsx` (3),
  `Mixer.stories.tsx` (5), `Timeline.stories.tsx` (4), `Shell.stories.tsx`
  (13, title "Shell/Components").
- `package.json`: added `storybook` / `build-storybook` scripts (existing
  scripts untouched). `.gitignore`: `storybook-static/`. `README.md`: Storybook
  section. `tsconfig.json`: include `.storybook`.

## Verification performed

- `npx tsc --noEmit` → exit 0 (strict, includes stories + .storybook).
- `npx storybook dev -p 6006 --ci --smoke-test` → exit 0 (twice, incl. final state).
- Dev server + `curl`: `GET /` → HTTP 200; `GET /iframe.html?id=…` → HTTP 200.
- Headless-browser (agent-browser) DOM verification of **all 29 stories**:
  - Full shells: 14 clips, all media images `naturalWidth>0` (staticDirs OK),
    `shell-mediapool/viewer/inspector/toolbar` present; Audio Focus shows
    `mixer-row-full` + `shell-channel-editor` + `shell-soundlibrary`; Color/
    Deliver swap the right rail (`shell-color`, `shell-deliver` + job card).
  - Presets A/B/C: `data-variant` attribute matches each preset; switching
    stories resets to default variant (leak check passed).
  - Mixer: full row = A1/A2/aux-a1/aux-a2/master strips; bridge = A1+A2 chips.
  - Timeline: default + blocks render; clip-states story shows the six mock
    clips (selected/offline/F-badge/linked+50%/fades/locked).
  - Shell/Components: pool grid+list, viewer, inspector×4 tabs, status
    saved/saving(transient confirmed via polling: "Saved"→"Saving…"→"Saved")/
    failed, toast stack (3 fired, auto-dismiss semantics confirmed), open
    context menu (item + shortcut rows), cheat sheet (40 bindings).
- `npx vite build` → success (standalone app unaffected).

## Caveats / notes for future agents

- The pristine-store snapshot shares nested `effects`/`transitionOut` array
  refs with the module-level mock project; stories never mutate those
  programmatically (documented in decorators.tsx header).
- Story ids derive from export names (e.g. `shell-appshell--edit`), the
  `name:` field is display-only — link accordingly.
- The "Status strip — saving" story is transient by design (~750 ms window).
- Media pool shows its ~900 ms OPFS boot skeleton on first mount — part of
  spec 18 §4.2, kept intentionally.
