# UI review — 19 stories

26 open / 20 resolved · 2026-09-05 22:40
storybook: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run

## Mixer / Mixer — ChannelStrip solo

story id: `mixer--channel-strip-solo`
story file: src/stories/Mixer.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/mixer--channel-strip-solo

### #1 OPEN — the problem of channel strip right now is the meter is too wide and the rest is too squeezed

- story: Mixer/Mixer — ChannelStrip solo (src/stories/Mixer.stories.tsx)
- thread id: th_mto617w1_o4wqu5w8
- component: ChannelStrip
- jsx: src/components/mixer/ChannelStrip.tsx:136
- chain: VariantProvider > ConfirmProvider > StripSolo > ChannelStrip
- props: sceneId="sc-1" compact=false focused=true
- element: <div.flex.min-h-[110px].w-full:nth(3) "-12.0 dB +6 0 −6 −12 −24 −48 −∞">
- selector: .min-h-\[110px\]
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto617w1_o4wqu5w8/snapshot (story DOM at pin time; append ?format=html to render)

## Pages / Channel editor — no clip selected

story id: `pages--channel-editor-empty`
story file: src/stories/Pages.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/pages--channel-editor-empty

### #1 OPEN — this feels like it should be all the way vertically right now 50%

- story: Pages/Channel editor — no clip selected (src/stories/Pages.stories.tsx)
- thread id: th_mto37ze9_rrfaf16p
- component: Fader
- jsx: src/components/mixer/MixerPrimitives.tsx:64
- chain: VariantProvider > ConfirmProvider > PanelBox > ChannelEditor > Fader
- props: db=-3 height=84 ariaLabel="A1 fader"
- element: <div.flex.flex-col.items-center:nth(1) "-3.0 dB">
- selector: .gap-3 > .items-center
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto37ze9_rrfaf16p/snapshot (story DOM at pin time; append ?format=html to render)

## Pages / Deliver page — cloud master preset

story id: `pages--deliver-master-preset`
story file: src/stories/Pages.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/pages--deliver-master-preset

### #1 OPEN — this whole view feels very crammed the three preset tiles especially

- story: Pages/Deliver page — cloud master preset (src/stories/Pages.stories.tsx)
- thread id: th_mto38qzp_dy2r4v6f
- component: DeliverPage
- jsx: src/components/pages/DeliverPage.tsx:82
- chain: VariantProvider > ConfirmProvider > PanelBox > DeliverPage
- element: <div.scroll-y.min-h-0.flex-1:nth(2) "Beach Doc — Rough Cut00:00:30:00 · 24 fps · 1920…">
- selector: .scroll-y
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto38qzp_dy2r4v6f/snapshot (story DOM at pin time; append ?format=html to render)

## Pages / Deliver page — settings + job queue

story id: `pages--deliver-page-story`
story file: src/stories/Pages.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/pages--deliver-page-story

### #1 OPEN — overflowing

- story: Pages/Deliver page — settings + job queue (src/stories/Pages.stories.tsx)
- thread id: th_mto35hrm_wmx1od65
- component: DeliverPage
- jsx: src/components/pages/DeliverPage.tsx:120
- chain: VariantProvider > ConfirmProvider > PanelBox > DeliverPage
- element: <select.field.flex-1.cursor-pointer [value="inout"] "In → Out (00:00:02:00 – 00:00:28:00) Full timeli…">
- selector: div:nth-of-type(1) > .field
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto35hrm_wmx1od65/snapshot (story DOM at pin time; append ?format=html to render)

## Regions / Viewer — program monitor

story id: `regions--viewer-default`
story file: src/stories/Regions.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/regions--viewer-default

### #1 OPEN — should we allow this to dual-purpose as asset preview (when selecting the asset on the left side media bin)?

- story: Regions/Viewer — program monitor (src/stories/Regions.stories.tsx)
- thread id: th_mto3504c_5d4fy2g2
- component: VariantProvider
- jsx: src/components/debug/VariantProvider.tsx:53
- element: <div.h-full.w-full.bg-shell:nth(1) "Fit 1.5× 2× 4× 00:00:16:00 1920×1080 24 fps Mari…">
- selector: .text-tprimary
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto3504c_5d4fy2g2/snapshot (story DOM at pin time; append ?format=html to render)

## Shell / Shell — after split at 6.5s

story id: `shell--after-split`
story file: src/stories/Shell.stories.tsx
open: https://preview-chat-4c1120aa-eb90-4156-b501-f6e57f6fe7a9.space-z.ai/?path=/story/shell--after-split

<details><summary>1 resolved</summary>

### #1 resolved — shortcut S is a common one we should support

- story: Shell/Shell — after split at 6.5s (src/stories/Shell.stories.tsx)
- thread id: th_mtnwqp8s_8jw4xxx8
- component: ToolsRow
- jsx: src/timeline/Timeline.tsx:84
- chain: FullShell > App > Timeline > ToolsRow
- element: <button.qc-toolbar__icon:nth(1) [testid=mini-btn-split aria-label="Split at playhead"]>
- selector: [data-testid="mini-btn-split"]
  - agent 09-05 06:17: VERIFIED + DOCS: S has been wired since the R16 round (splitAtPlayhead via useKeys) — and R18f moved the keyboard surface INTO the Timeline component so it also works in the solo Timeline stories, not
  - resolved 09-05 06:17

</details>

## Shell / Shell — default (seed)

story id: `shell--default`
story file: src/stories/Shell.stories.tsx
open: https://preview-chat-4c1120aa-eb90-4156-b501-f6e57f6fe7a9.space-z.ai/?path=/story/shell--default

<details><summary>8 resolved</summary>

### #1 resolved — what can i say - the overall visual is very poor - go back and study RH dom you didn't replicate close enough, or in any case even if you create from scratch it shouldn't be so bad. there's barely any contrast on the regions, the dotty background extremely distracting, and the panels can't resize even slightly, and the media bin not sure if they can even scroll. we can keep the minimalistic feel but polish it up

- story: Shell/Shell — default (seed) (src/stories/Shell.stories.tsx)
- thread id: th_mtnwq2jr_r4hfww15
- component: App
- jsx: src/App.tsx:15
- chain: FullShell > App
- element: <div.mini-root:nth(1) [testid=mini-root] "Beach Doc — Mini Cut 00:00.0 / 00:12.5 Export Me…">
- selector: .mini-root
  - agent 09-05 06:17: FIXED (R18e/R18f, in waves): contrast — panel surfaces elevated (rgba(24,25,27,.92) + hairline borders, deeper timeline well, lane surfaces up to .075); the dot grid is GONE (replaced by a quiet top-l
  - resolved 09-05 06:17

### #2 resolved — these shouldn't use vertical 'fit' but simply should just overflow and scroll

- story: Shell/Shell — default (seed) (src/stories/Shell.stories.tsx)
- thread id: th_mto1vm32_2dajiype
- component: MediaPool
- jsx: src/shell/MediaPool.tsx:81
- chain: FullShell > App > MediaPool
- element: <div.mini-scroll.mini-pool__list:nth(2) [testid=mini-pool-list] "VIDEO drone_launch.mp4 00:04.5 VIDEO beach_wide.…">
- selector: .mini-scroll
  - agent 09-05 07:48: FIXED (R18g): the cards keep their natural height now and the list simply overflows + scrolls. Root cause: the card's overflow:hidden zeroes the flex min-height floor, so the implicit flex-shrink squa
  - frejogochukwuout 09-05 07:48: **agent:** FIXED (R18g): the cards keep their natural height now and the list simply overflows + scrolls. Root cause: the card's overflow:hidden zeroes the flex min-height floor, so the implicit flex-
  - frejogochukwuout 09-05 07:48: closed on GitHub
  - resolved 09-05 07:48

### #3 resolved — let's have another theme / variation / style that has non-round edges, or rather make it smaller in radius not this round.

- story: Shell/Shell — default (seed) (src/stories/Shell.stories.tsx)
- thread id: th_mto1wwlv_k8i5ftgg
- component: Viewer
- jsx: src/shell/Viewer.tsx:26
- chain: FullShell > App > Viewer
- element: <div.mini-panel__head:nth(1) "VIEWER">
- selector: .mini-viewer > .mini-panel__head
  - agent 09-05 07:48: FIXED (R18g): radii tightened per your 'or rather make it smaller in radius' — panels 20px to 8px, controls 8px to 4px, tracks 10px to 4px, the Export pill to 6px. Done as a documented deviation in to
  - frejogochukwuout 09-05 07:48: **agent:** FIXED (R18g): radii tightened per your 'or rather make it smaller in radius' — panels 20px to 8px, controls 8px to 4px, tracks 10px to 4px, the Export pill to 6px. Done as a documented devi
  - frejogochukwuout 09-05 07:48: closed on GitHub
  - resolved 09-05 07:48

### #4 resolved — can this also show a shaded bar when hovering for adjustment using accent color

- story: Shell/Shell — default (seed) (src/stories/Shell.stories.tsx)
- thread id: th_mto1y0q8_nqe7qj3n
- component: Splitter
- jsx: src/shell/Splitter.tsx:72
- chain: FullShell > App > Splitter
- props: orientation="vertical" value=183.50390625 min=180 max=400 initial=240 label="Inspector width"
- element: <div.mini-splitter:nth(3) [testid=mini-splitter-inspector-width aria-label="Inspector width"]>
- selector: [data-testid="mini-splitter-inspector-width"]
  - agent 09-05 07:48: FIXED (R18g): hovering (or dragging) a splitter now shows a shaded ACCENT bar — sky rgba(56,189,248,0.78) with a soft glow, plus the longer 56px bar. RH's own resize handles light up blue on hover, so
  - frejogochukwuout 09-05 07:48: **agent:** FIXED (R18g): hovering (or dragging) a splitter now shows a shaded ACCENT bar — sky rgba(56,189,248,0.78) with a soft glow, plus the longer 56px bar. RH's own resize handles light up blue o
  - frejogochukwuout 09-05 07:48: closed on GitHub
  - resolved 09-05 07:48

### #5 resolved — BUG: adjust direction is wrong here drags right for left (bottom one is correct)

- story: Shell/Shell — default (seed) (src/stories/Shell.stories.tsx)
- thread id: th_mto1yu80_vn5nw5v5
- component: Splitter
- jsx: src/shell/Splitter.tsx:72
- chain: FullShell > App > Splitter
- props: orientation="vertical" value=183.50390625 min=180 max=400 initial=240 label="Inspector width"
- element: <div.mini-splitter:nth(3) [testid=mini-splitter-inspector-width aria-label="Inspector width"]>
- selector: [data-testid="mini-splitter-inspector-width"]
  - agent 09-05 07:48: FIXED (R18g): the inspector splitter now has boundary semantics — dragging it RIGHT shrinks the inspector (the panel sits right of the handle), dragging left grows it. The pool splitter (panel on the 
  - frejogochukwuout 09-05 07:48: **agent:** FIXED (R18g): the inspector splitter now has boundary semantics — dragging it RIGHT shrinks the inspector (the panel sits right of the handle), dragging left grows it. The pool splitter (pa
  - frejogochukwuout 09-05 07:48: closed on GitHub
  - resolved 09-05 07:48

### #6 resolved — shouldn't round out the edge for videos

- story: Shell/Shell — default (seed) (src/stories/Shell.stories.tsx)
- thread id: th_mto1zix7_l2wgha3x
- component: Viewer
- jsx: src/shell/Viewer.tsx:30
- chain: FullShell > App > Viewer
- element: <div.mini-viewer__frame:nth(1)>
- selector: .mini-viewer__frame
  - agent 09-05 07:48: FIXED (R18g): the video frame is square now — border-radius 0 on the stage. The recessed-monitor depth (inset ring + inner shadow) survives on square corners, so it still reads as a screen-well, just 
  - frejogochukwuout 09-05 07:48: **agent:** FIXED (R18g): the video frame is square now — border-radius 0 on the stage. The recessed-monitor depth (inset ring + inner shadow) survives on square corners, so it still reads as a screen-
  - frejogochukwuout 09-05 07:49: closed on GitHub
  - resolved 09-05 07:48

### #7 resolved — i'd move this space down to allow timestamp + play control (play button) below the video just like RH

- story: Shell/Shell — default (seed) (src/stories/Shell.stories.tsx)
- thread id: th_mto2b1zv_589fb1wn
- component: Viewer
- jsx: src/shell/Viewer.tsx:26
- chain: FullShell > App > Viewer
- element: <div.mini-panel__head:nth(1) "VIEWER">
- selector: .mini-viewer > .mini-panel__head
  - agent 09-05 07:48: FIXED (R18g): the transport row now lives BELOW the video, centered like RH — a grid [1fr auto 1fr]: current/total timecode on the left (tabular-nums, current clickable-style bright, total muted), the
  - frejogochukwuout 09-05 07:48: **agent:** FIXED (R18g): the transport row now lives BELOW the video, centered like RH — a grid [1fr auto 1fr]: current/total timecode on the left (tabular-nums, current clickable-style bright, total 
  - frejogochukwuout 09-05 07:49: closed on GitHub
  - resolved 09-05 07:48

### #8 resolved — these should move to be below video and centered like RH (like i said taking the space of 'viewer bar'

- story: Shell/Shell — default (seed) (src/stories/Shell.stories.tsx)
- thread id: th_mto2blw7_wgp4fxq4
- component: Topbar
- jsx: src/shell/Topbar.tsx:24
- chain: FullShell > App > Topbar
- element: <div.mini-topbar__transport:nth(2) "00:00.0 / 00:12.5">
- selector: .mini-topbar__transport
  - agent 09-05 07:48: FIXED (R18g): the topbar transport is gone — the topbar is brand + Export only, and the play control + timecode live in the new viewer transport bar below the video (see the sibling thread on the View
  - frejogochukwuout 09-05 07:48: **agent:** FIXED (R18g): the topbar transport is gone — the topbar is brand + Export only, and the play control + timecode live in the new viewer transport bar below the video (see the sibling thread 
  - frejogochukwuout 09-05 07:49: closed on GitHub
  - resolved 09-05 07:48

</details>

## Shell/AppShell / Full Shell — Audio Focus

story id: `shell-appshell--audio-focus`
story file: src/stories/AppShell.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/shell-appshell--audio-focus

### #1 OPEN — right side empty space is weired

- story: Shell/AppShell/Full Shell — Audio Focus (src/stories/AppShell.stories.tsx)
- thread id: th_mto63f99_7a34waco
- component: AppShellInner
- jsx: src/components/shell/AppShell.tsx:335
- chain: VariantProvider > ConfirmProvider > FullShell > AppShell > ConfirmProvider
- element: <div.shell-region.flex.min-h-0:nth(2) "MIXER · G-LAYER A1 A1 DIALOGUE -3.0 dB +6 0 −6 −…">
- selector: .min-h-0 > .shell-region
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto63f99_7a34waco/snapshot (story DOM at pin time; append ?format=html to render)

### #2 OPEN — it doesn't look good when the actual channel strip is only taking like 50% of vertical space that said i am aware of the rest of stuff we try to show and don't have the perfect idea how we should arrange these

- story: Shell/AppShell/Full Shell — Audio Focus (src/stories/AppShell.stories.tsx)
- thread id: th_mto6496s_nmf8ad6b
- component: ChannelStrip (key="tr-audio-2")
- jsx: src/components/mixer/ChannelStrip.tsx:109
- chain: AppShell > ConfirmProvider > AppShellInner > MixerDock > FullDock
- props: sceneId="sc-1" compact=false focused=false flashing=false index=1
- element: <div.mixer-strip.relative.flex:nth(3) [testid=mixer-strip-A2] "A2 A2 BGM -12.0 dB +6 0 −6 −12 −24 −48 −∞ -12.0 …">
- selector: .bg-\[color-mix\(in_srgb\,var\(--accent-selection\)_12\%\,var\(--bg-shell\)\)\)\]
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto6496s_nmf8ad6b/snapshot (story DOM at pin time; append ?format=html to render)

### #3 OPEN — these fader should be same height as meter that will look much better

- story: Shell/AppShell/Full Shell — Audio Focus (src/stories/AppShell.stories.tsx)
- thread id: th_mtoyq7jt_xu4i1odo
- component: Fader
- jsx: src/components/mixer/MixerPrimitives.tsx:139
- chain: ConfirmProvider > AppShellInner > MixerDock > FullDock > ChannelStrip
- props: db=-3 fillHeight=true scale=true ariaLabel="A1 fader"
- element: <span.absolute.left-1/2.h-[10px]:nth(10) [testid=fader-thumb]>
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mtoyq7jt_xu4i1odo/snapshot (story DOM at pin time; append ?format=html to render)

### #4 OPEN — remove these

- story: Shell/AppShell/Full Shell — Audio Focus (src/stories/AppShell.stories.tsx)
- thread id: th_mtoyslr9_9m64tl8c
- component: Toolbar2
- jsx: src/components/shell/Toolbar2.tsx:58
- chain: ConfirmProvider > FullShell > AppShell > ConfirmProvider > AppShellInner
- element: <div.flex.items-center.gap-1.5:nth(1)>
- selector: .pr-1
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mtoyslr9_9m64tl8c/snapshot (story DOM at pin time; append ?format=html to render)

### #5 OPEN — use the same area as bin

- story: Shell/AppShell/Full Shell — Audio Focus (src/stories/AppShell.stories.tsx)
- thread id: th_mtoyt5fv_8igxhdv9
- component: Toolbar2
- jsx: src/components/shell/Toolbar2.tsx:76
- chain: ConfirmProvider > FullShell > AppShell > ConfirmProvider > AppShellInner
- element: <button.toolbtn:nth(2) [testid=shell-toolbar-btn-effects] "Effects">
- selector: [data-testid="shell-toolbar-btn-effects"]
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mtoyt5fv_8igxhdv9/snapshot (story DOM at pin time; append ?format=html to render)

### #6 OPEN — i am not sure exactly what does this fullscreen toggle does? we are in a browser does it fullscreen the preview? the whole app? we can remove this to be less confusing if no clear and strong use

- story: Shell/AppShell/Full Shell — Audio Focus (src/stories/AppShell.stories.tsx)
- thread id: th_mtoyu8bl_wbm1lvzy
- component: Toolbar2
- jsx: src/components/shell/Toolbar2.tsx:105
- chain: ConfirmProvider > FullShell > AppShell > ConfirmProvider > AppShellInner
- element: <button.icon-btn:nth(4) [aria-label="Toggle fullscreen viewer"]>
- selector: [data-testid="shell-toolbar"] > .icon-btn
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mtoyu8bl_wbm1lvzy/snapshot (story DOM at pin time; append ?format=html to render)

## Shell/AppShell / Full Shell — Deliver

story id: `shell-appshell--deliver`
story file: src/stories/AppShell.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/shell-appshell--deliver

### #1 OPEN — this feels tiny, should we repurpose the whole view for export related? like both left (media pool area) and right side, not sure about the timeline perhaps we keep but allow range selection

- story: Shell/AppShell/Full Shell — Deliver (src/stories/AppShell.stories.tsx)
- thread id: th_mto37ba3_joj3xmm1
- component: DeliverPage
- jsx: src/components/pages/DeliverPage.tsx:82
- chain: ConfirmProvider > FullShell > AppShell > ConfirmProvider > AppShellInner
- element: <div.scroll-y.min-h-0.flex-1:nth(2) "Beach Doc — Rough Cut00:00:30:00 · 24 fps · 1920…">
- selector: .py-3
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto37ba3_joj3xmm1/snapshot (story DOM at pin time; append ?format=html to render)

## Shell/AppShell / Full Shell — Edit

story id: `shell-appshell--edit`
story file: src/stories/AppShell.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/shell-appshell--edit

### #1 OPEN — shown only half the other half cutoff? is it because of the selection range

- story: Shell/AppShell/Full Shell — Edit (src/stories/AppShell.stories.tsx)
- thread id: th_mto2ook8_mq8qjevp
- component: Ruler
- jsx: src/components/timeline/Ruler.tsx:332
- chain: FullShell > AppShell > ConfirmProvider > AppShellInner > Timeline
- props: duration=30 pxPerSec=46 playhead=16 contentW=1525.65
- element: <div.pointer-events-auto.absolute.z-[7]:nth(29) [testid=shell-ruler-bracket-in aria-label="Loop in point"]>
- selector: div:nth-of-type(29)
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2ook8_mq8qjevp/snapshot (story DOM at pin time; append ?format=html to render)

### #2 OPEN — the transition curve bar is reversed it should taper on the top not bottom

- story: Shell/AppShell/Full Shell — Edit (src/stories/AppShell.stories.tsx)
- thread id: th_mto2ph3i_cs9xmovx
- component: Clip (key="el-6")
- jsx: src/components/timeline/Clip.tsx:804
- chain: FullShell > AppShell > ConfirmProvider > AppShellInner > Timeline
- props: pxPerSec=38.91249115790228 laneHeight=60 previewSuppressed=false
- element: <div.relative.h-full.w-full "ocean_ambience">
- selector: div:nth-of-type(4) > .clip-box > .clip-box > .relative
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2ph3i_cs9xmovx/snapshot (story DOM at pin time; append ?format=html to render)

### #3 OPEN — waveform preview doesn't look right possibly just demo data issue but still

- story: Shell/AppShell/Full Shell — Edit (src/stories/AppShell.stories.tsx)
- thread id: th_mto2xtgc_jv1oi4r9
- component: Timeline
- jsx: src/components/timeline/Timeline.tsx:790
- chain: ConfirmProvider > FullShell > AppShell > ConfirmProvider > AppShellInner
- element: <div.relative.shrink-0.border-b:nth(5) "interview_marina">
- selector: .overflow-auto > .relative > div:nth-of-type(5)
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2xtgc_jv1oi4r9/snapshot (story DOM at pin time; append ?format=html to render)

### #4 OPEN — this one has no waveform preview?

- story: Shell/AppShell/Full Shell — Edit (src/stories/AppShell.stories.tsx)
- thread id: th_mto2y86w_zizcvrm0
- component: Clip (key="el-6")
- jsx: src/components/timeline/Clip.tsx:805
- chain: FullShell > AppShell > ConfirmProvider > AppShellInner > Timeline
- props: pxPerSec=46 laneHeight=60 previewSuppressed=false
- element: <svg.absolute.inset-x-0.bottom-[2px]:nth(1)>
- selector: div:nth-of-type(4) > .clip-box .inset-x-0
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2y86w_zizcvrm0/snapshot (story DOM at pin time; append ?format=html to render)

### #5 OPEN — these chevron seem out of place, are these bookmarks? if so they should not be WITHIN text track

- story: Shell/AppShell/Full Shell — Edit (src/stories/AppShell.stories.tsx)
- thread id: th_mto2ytyo_mv16td2t
- component: Ruler
- jsx: src/components/timeline/Ruler.tsx:369
- chain: FullShell > AppShell > ConfirmProvider > AppShellInner > Timeline
- props: duration=30 pxPerSec=46 playhead=24.041666666666668 contentW=1519.35
- element: <path>
- selector: div:nth-of-type(35) path
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2ytyo_mv16td2t/snapshot (story DOM at pin time; append ?format=html to render)

### #6 OPEN — timeline should never just crop off when i can keep scrolling into nothing it should stop scrolling but always show track and timestamp

- story: Shell/AppShell/Full Shell — Edit (src/stories/AppShell.stories.tsx)
- thread id: th_mto2zq0g_d8ndz7lc
- component: Timeline
- jsx: src/components/timeline/Timeline.tsx:726
- chain: ConfirmProvider > FullShell > AppShell > ConfirmProvider > AppShellInner
- element: <div#timeline-scroll.relative.min-h-0.flex-1:nth(2) "00:21 00:24 00:27 00:30 00:33 drone_launch sunse…">
- selector: .bg-timeline
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2zq0g_d8ndz7lc/snapshot (story DOM at pin time; append ?format=html to render)

### #7 OPEN — when nothing to inspect this shouldn't be here either

- story: Shell/AppShell/Full Shell — Edit (src/stories/AppShell.stories.tsx)
- thread id: th_mto5fdf6_f3s7f9mh
- component: Inspector
- jsx: src/components/shell/Inspector.tsx:804
- chain: ConfirmProvider > FullShell > AppShell > ConfirmProvider > AppShellInner
- element: <button#tab-video.relative.flex.flex-col [testid=shell-inspector-tab-video] "Video">
- selector: .bg-\[var\(--active-overlay\)\]
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto5fdf6_f3s7f9mh/snapshot (story DOM at pin time; append ?format=html to render)
  - reviewer 09-05 08:58: that said i wonder what does daVinci Resolve do in this case? worth a web research for me on what makes most sense; i guess we can always inspect something? like there must be something that is consid

## Shell/Components / Media pool — list

story id: `shell-components--media-pool-list`
story file: src/stories/Shell.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/shell-components--media-pool-list

### #1 OPEN — not sure if this is the best way an icon would be better i think movie clip vs. audio etc. the standard NLE way?

- story: Shell/Components/Media pool — list (src/stories/Shell.stories.tsx)
- thread id: th_mto2qzoh_fhdwv445
- component: MediaRow (key="m-01")
- jsx: src/components/shell/MediaPool.tsx:204
- chain: VariantProvider > ConfirmProvider > PoolStory > PanelBox > MediaPool
- props: selected=false active=false
- element: <span.mono.shrink-0.rounded:nth(2) "V">
- selector: div:nth-of-type(1) > .rounded
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2qzoh_fhdwv445/snapshot (story DOM at pin time; append ?format=html to render)

### #2 OPEN — hover to autoplay would be a nice feature to have (and btw here thumbs should load from a thumb specific asset never full res)

- story: Shell/Components/Media pool — list (src/stories/Shell.stories.tsx)
- thread id: th_mto2s2nc_pii5wlgn
- component: Thumb
- jsx: src/components/shell/MediaPool.tsx:104
- chain: ConfirmProvider > PoolStory > PanelBox > MediaPool > MediaCard
- element: <img.h-full.w-full>
- selector: div:nth-of-type(2) > .relative > .h-full
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2s2nc_pii5wlgn/snapshot (story DOM at pin time; append ?format=html to render)

### #3 OPEN — same here should be icon

- story: Shell/Components/Media pool — list (src/stories/Shell.stories.tsx)
- thread id: th_mto2sako_elsox42p
- component: MediaCard (key="m-03")
- jsx: src/components/shell/MediaPool.tsx:166
- chain: VariantProvider > ConfirmProvider > PoolStory > PanelBox > MediaPool
- props: selected=false active=false
- element: <span.mono.rounded.border:nth(1) "V">
- selector: div:nth-of-type(2) > .flex > .flex > .rounded
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2sako_elsox42p/snapshot (story DOM at pin time; append ?format=html to render)

### #4 OPEN — this is EXPORT icon

- story: Shell/Components/Media pool — list (src/stories/Shell.stories.tsx)
- thread id: th_mto2t03u_aam4uy9n
- component: MediaPool
- jsx: src/components/shell/MediaPool.tsx:525
- chain: VariantProvider > ConfirmProvider > PoolStory > PanelBox > MediaPool
- element: <button.icon-btn.!h-[22px].!w-[22px]:nth(1) [aria-label="Import media"]>
- selector: .gap-1 > button:nth-of-type(1)
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2t03u_aam4uy9n/snapshot (story DOM at pin time; append ?format=html to render)

## Shell/Components / Viewer

story id: `shell-components--viewer-story`
story file: src/stories/Shell.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/shell-components--viewer-story

<details><summary>1 resolved</summary>

### #1 resolved — it seems to me timestamp is always below video never above

- story: Shell/Components/Viewer (src/stories/Shell.stories.tsx)
- thread id: th_mto2uar6_qdif8tk0
- component: Viewer
- jsx: src/components/shell/Viewer.tsx:165
- chain: VariantProvider > ConfirmProvider > ViewerPanel > PanelBox > Viewer
- props: duration=30
- element: <span.tc-chip:nth(1) [testid=shell-viewer-tc] "00:00:16:00">
- selector: .relative > span:nth-of-type(1)
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto2uar6_qdif8tk0/snapshot (story DOM at pin time; append ?format=html to render)
  - reviewer 09-05 08:11: ignore i realize this can be at the top i was wrong
  - frejogochukwuout 09-05 08:11: **reviewer:** ignore i realize this can be at the top i was wrong
  - frejogochukwuout 09-05 08:12: closed on GitHub
  - resolved 09-05 08:12

</details>

## Timeline / Timeline — audio clip selected (waveform body)

story id: `timeline--audio-focus`
story file: src/stories/Timeline.stories.tsx
open: https://preview-chat-4c1120aa-eb90-4156-b501-f6e57f6fe7a9.space-z.ai/?path=/story/timeline--audio-focus

<details><summary>1 resolved</summary>

### #1 resolved — we need real waveform although style wise this discrete line shaped one look modern and nice

- story: Timeline/Timeline — audio clip selected (waveform body) (src/stories/Timeline.stories.tsx)
- thread id: th_mtnwn453_kt4eqgqm
- component: ClipItem (key="c4")
- jsx: src/timeline/Timeline.tsx:316
- chain: Frame > Timeline > Lane > ClipItem
- props: pps=48 snapOn=true selected=false
- element: <span.qc-track-item__waveform:nth(1)>
- selector: .qc-track-item__waveform
  - agent 09-05 06:17: FIXED (R18e): the waveform is now a REAL envelope — deterministic per-asset (FNV-1a seeded body + detail waves + attack/decay ramps), rendered as the same discrete-bar grammar you liked. Heights vary 
  - resolved 09-05 06:17

</details>

## Timeline / Timeline — clip selected (selection ring)

story id: `timeline--clip-selected`
story file: src/stories/Timeline.stories.tsx
open: https://preview-chat-4c1120aa-eb90-4156-b501-f6e57f6fe7a9.space-z.ai/?path=/story/timeline--clip-selected

<details><summary>1 resolved</summary>

### #1 resolved — clip shouldn't use such a rounded edge same problem but worse here as it feels there's gap

- story: Timeline/Timeline — clip selected (selection ring) (src/stories/Timeline.stories.tsx)
- thread id: th_mto20fne_vkc5bzbn
- component: ClipItem (key="c2")
- jsx: src/timeline/Timeline.tsx:442
- chain: Frame > Timeline > Lane > ClipItem
- props: pps=48 snapOn=false selected=false filmstripOn=true
- element: <span.qc-track-item__filmstrip:nth(1)>
- selector: .is-selected > .qc-track-item__filmstrip
  - agent 09-05 07:48: FIXED (R18g): clips are near-square — their own token --mini-radius-clip: 2px (was 8px). The big corner cutouts between adjacent clips read as gaps in the cut; at 2px the sequence reads as one continu
  - frejogochukwuout 09-05 07:48: **agent:** FIXED (R18g): clips are near-square — their own token --mini-radius-clip: 2px (was 8px). The big corner cutouts between adjacent clips read as gaps in the cut; at 2px the sequence reads as 
  - frejogochukwuout 09-05 07:49: closed on GitHub
  - resolved 09-05 07:48

</details>

## Timeline / Clip states

story id: `timeline--clip-states`
story file: src/stories/Timeline.stories.tsx
open: https://preview-chat-4deec8a5-5652-47be-aa78-22a89018fb4f.space-z.ai/?path=/story/timeline--clip-states

### #1 OPEN — for a selected clip when hovering there should be a bit afforance hint on the edge that's draggable (a bit shaded border or something) not just cursor change

- story: Timeline/Clip states (src/stories/Timeline.stories.tsx)
- thread id: th_mto32fa6_zw9ctizj
- component: Clip (key="demo-audio-1")
- jsx: src/components/timeline/Clip.tsx:1031
- chain: VariantProvider > ConfirmProvider > Lane > Clip
- props: pxPerSec=46 laneHeight=60
- element: <div.absolute.inset-y-0:nth(3) [testid=clip-trim-r-demo-audio-1]>
- selector: .clip-box > div:nth-of-type(3)
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto32fa6_zw9ctizj/snapshot (story DOM at pin time; append ?format=html to render)

### #2 OPEN — pay attention to aspect ratio you never stretch filmstrip maintain ratio

- story: Timeline/Clip states (src/stories/Timeline.stories.tsx)
- thread id: th_mto334ar_lpmrqz01
- component: Clip (key="demo-link")
- jsx: src/components/timeline/Clip.tsx:841
- chain: VariantProvider > ConfirmProvider > Lane > Clip
- props: pxPerSec=46 laneHeight=80
- element: <div.w-full>
- selector: [data-testid="clip-content-demo-link"] > .relative > .w-full
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto334ar_lpmrqz01/snapshot (story DOM at pin time; append ?format=html to render)

## Timeline / Timeline — default (48pps, seed)

story id: `timeline--default`
story file: src/stories/Timeline.stories.tsx
open: https://preview-chat-4c1120aa-eb90-4156-b501-f6e57f6fe7a9.space-z.ai/?path=/story/timeline--default

### #7 OPEN — the transition block visual style look very unpolished and strange

- story: Timeline/Timeline — default (src/stories/Timeline.stories.tsx)
- thread id: th_mto31dyp_guhrblal
- component: Timeline
- jsx: src/components/timeline/Timeline.tsx:790
- chain: VariantProvider > ConfirmProvider > Timeline
- element: <div.absolute.top-[3px].z-[7]:nth(5) [testid=transition-el-2 aria-label="Crossfade transition, 0.75 sec…"]>
- selector: .top-\[3px\]
- dom-snapshot: http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/th_mto31dyp_guhrblal/snapshot (story DOM at pin time; append ?format=html to render)

<details><summary>5 resolved</summary>

### #2 resolved — there are two other cut styles from the RH example we should consider here

- story: Timeline/Timeline — default (48pps, seed) (src/stories/Timeline.stories.tsx)
- thread id: th_mtnw616m_d4oryeec
- component: ToolsRow
- jsx: src/timeline/Timeline.tsx:84
- chain: Frame > Timeline > ToolsRow
- element: <button.qc-toolbar__icon:nth(1) [testid=mini-btn-split aria-label="Split at playhead"]>
- selector: [data-testid="mini-btn-split"]
  - agent 09-05 06:17: FIXED (R18e): the two other RH cut styles are in — Cut head (裁剪开始, key [) discards the clip's part before the playhead; Cut tail (裁剪结束, key ]) discards the part after. Toolbar buttons next to Split + 
  - resolved 09-05 06:17

### #3 resolved — we should have a toggle for showing / hiding the audio track for the timeline;

- story: Timeline/Timeline — default (48pps, seed) (src/stories/Timeline.stories.tsx)
- thread id: th_mtnw8p2m_btr1fgse
- component: Lane (key="A1")
- jsx: src/timeline/Timeline.tsx:395
- chain: Frame > Timeline > Lane
- props: pps=48 snapOn=true playhead=0
- element: <div.qc-track-row__content:nth(2) [testid=mini-lane-A1] "A1 interview_audio.wav">
- selector: [data-track-kind="audio"]
  - agent 09-05 06:17: FIXED (R18e/R18f): audio-lane eye toggle in the toolbar (Eye/EyeOff, aria-pressed). Hidden = a slim collapsed bar that says 'A1 · N hidden' and restores on click — the clips stay in the doc (view stat
  - resolved 09-05 06:17

### #4 resolved — we need to introduce a state for timeline clips, at least internally if not a tool button to toggle too, for showing filmstrip vs. not showing (in which case we go with some color coding that the app state determine or something)

- story: Timeline/Timeline — default (48pps, seed) (src/stories/Timeline.stories.tsx)
- thread id: th_mtnwss7j_w4x149l1
- component: ClipItem (key="c2")
- jsx: src/timeline/Timeline.tsx:319
- chain: Frame > Timeline > Lane > ClipItem
- props: pps=48 snapOn=true selected=false
- element: <span.qc-track-item__filmstrip:nth(1)>
- selector: .is-selected > .qc-track-item__filmstrip
  - agent 09-05 06:17: FIXED (R18e): filmstrip toggle in the toolbar (Film icon, aria-pressed). OFF = media-kind color-block bodies (hue-coded from the media asset — video/image/audio each keep their identity color); ON = t
  - resolved 09-05 06:17

### #5 resolved — ripple edit is still one that's highly recommended, even for mini editor mode

- story: Timeline/Timeline — default (48pps, seed) (src/stories/Timeline.stories.tsx)
- thread id: th_mtnwuudb_7sn2eo1h
- component: ToolsRow
- jsx: src/timeline/Timeline.tsx:58
- chain: Frame > Timeline > ToolsRow
- element: <div.qc-timeline__tools:nth(1) [testid=mini-timeline-tools]>
- selector: .qc-timeline__tools
  - agent 09-05 06:17: FIXED (R18e): ripple edit is now a toolbar toggle (FoldHorizontal icon, aria-pressed). With ripple ON: delete closes the gap, end-trim pushes/pulls later clips, start-trim closes the head gap (frozen-
  - resolved 09-05 06:17

### #6 resolved — these two icons are not correct - they look like jump to head / tail

- story: Timeline/Timeline — default (48pps, seed) (src/stories/Timeline.stories.tsx)
- thread id: th_mto29gf0_d5qm3xu2
- component: ToolsRow
- jsx: src/timeline/Timeline.tsx:124
- chain: Frame > Timeline > ToolsRow
- element: <button.qc-toolbar__icon:nth(2) [testid=mini-btn-cuthead aria-label="Cut head at playhead"]>
- selector: [data-testid="mini-btn-cuthead"]
  - agent 09-05 07:48: FIXED (R18g): replaced the lucide ArrowLeftToLine/ArrowRightToLine pair (which indeed read as jump-to-start/end) with purpose-drawn trim glyphs: a clip rectangle with a DIM block on the discarded side
  - frejogochukwuout 09-05 07:48: **agent:** FIXED (R18g): replaced the lucide ArrowLeftToLine/ArrowRightToLine pair (which indeed read as jump-to-start/end) with purpose-drawn trim glyphs: a clip rectangle with a DIM block on the dis
  - frejogochukwuout 09-05 07:49: closed on GitHub
  - resolved 09-05 07:48

</details>

## Timeline / Timeline — empty lanes

story id: `timeline--empty-lanes`
story file: src/stories/Timeline.stories.tsx
open: https://preview-chat-4c1120aa-eb90-4156-b501-f6e57f6fe7a9.space-z.ai/?path=/story/timeline--empty-lanes

<details><summary>1 resolved</summary>

### #1 resolved — should we show playhead on empty lane? debatable?

- story: Timeline/Timeline — empty lanes (src/stories/Timeline.stories.tsx)
- thread id: th_mtnwjvv1_r4l4gmxp
- component: Playhead
- jsx: src/timeline/Timeline.tsx:444
- chain: Frame > Timeline > Playhead
- props: pps=48 endTime=8
- element: <button.qc-ruler__playhead.is-at-start [testid=mini-playhead aria-label="Playhead at 00:00.0 — drag or …"]>
- selector: .qc-ruler__playhead
  - agent 09-05 06:17: DECISION (kept, documented): the playhead line spans all lanes including empty ones — it is the global time cursor (standard NLE behavior; removing it on empty lanes would make the time position unrea
  - resolved 09-05 06:17

</details>

## Timeline / Timeline — playhead mid-doc (time pill on hover)

story id: `timeline--playhead-mid`
story file: src/stories/Timeline.stories.tsx
open: https://preview-chat-4c1120aa-eb90-4156-b501-f6e57f6fe7a9.space-z.ai/?path=/story/timeline--playhead-mid

<details><summary>1 resolved</summary>

### #1 resolved — when i select playhead and then hit enter there will be a selection bounding box doesn't look good

- story: Timeline/Timeline — playhead mid-doc (time pill on hover) (src/stories/Timeline.stories.tsx)
- thread id: th_mtnwm63o_lmdi4o1z
- component: Playhead
- jsx: src/timeline/Timeline.tsx:444
- chain: Frame > Timeline > Playhead
- props: pps=48 endTime=12.5
- element: <button.qc-ruler__playhead [testid=mini-playhead aria-label="Playhead at 00:05.2 — drag or …"]>
- selector: .qc-ruler__playhead
  - agent 09-05 06:17: FIXED (R18e): Enter on the playhead is now a swallowed no-op (preventDefault) and the generic 2px focus box is gone — focus-visible draws a subtle ring on the 8px handle dot only. Arrow keys still scr
  - resolved 09-05 06:17

</details>

## Timeline / Timeline — snap toggle off (magnet icon inactive)

story id: `timeline--snap-off-state`
story file: src/stories/Timeline.stories.tsx
open: https://preview-chat-4c1120aa-eb90-4156-b501-f6e57f6fe7a9.space-z.ai/?path=/story/timeline--snap-off-state

<details><summary>1 resolved</summary>

### #1 resolved — snap toggle should be off by default

- story: Timeline/Timeline — snap toggle off (magnet icon inactive) (src/stories/Timeline.stories.tsx)
- thread id: th_mtnwlfpy_khdv9ee1
- component: ToolsRow
- jsx: src/timeline/Timeline.tsx:105
- chain: Frame > Timeline > ToolsRow
- element: <button.qc-toolbar__icon:nth(3) [testid=mini-btn-snap aria-label="Snapping off"]>
- selector: [data-testid="mini-btn-snap"]
  - agent 09-05 06:17: FIXED (R18e): snap (magnet + grid) is now OFF by default — turning it on is a deliberate act via the toolbar toggle (aria-pressed). With snap ON, dragging near an edge now also paints the 2px snap gui
  - resolved 09-05 06:17

</details>

---

Agent loop: fix the code at the `jsx:`/`component file:` paths, then resolve the thread — PATCH http://ws-dd-abca-bcdb-jysvhiklkb.cn-hongkong-vpc.fcapp.run/annotakit/api/threads/<id> with the full thread JSON and status "resolved" (GET /annotakit/api/threads returns the full docs). Note: `jsx: file:line` points at the component definition (may be a few lines off); the `element:`/`selector:` lines pinpoint the exact pinned node.
