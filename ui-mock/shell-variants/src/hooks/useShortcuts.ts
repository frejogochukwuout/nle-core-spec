/* useShortcuts — spec 16 keyboard layer for the shell mock. ONE window
   keydown listener; SHORTCUT_MAP (lib/shortcutMap.ts) is the documented
   twin (cheat sheet). §8.5 text-input guard; JKL multi-tap shuttle with an
   500 ms accel window; ⌘ = metaKey || ctrlKey (spec 16 conventions), ⌥ =
   altKey exactly. F6 region cycling stays in AppShell (spec 18 §11.5). */

import { useEffect, useRef } from 'react';
import { useUi } from '../state/useUiStore';
import { snapToFrame } from '../lib/timecode';
import { zoomBus } from '../lib/zoomController';
import { isGestureActive } from '../lib/timelinePlacement';
import { DEFAULT_PPS } from '../lib/pixel';
import type { Marker } from '../lib/mockData';
import type { ConfirmFn } from '../components/shell/ConfirmDialog';

const MARKER_PALETTE: Marker['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
const JKL_WINDOW_MS = 500; // multi-tap accel window (task spec: 500 ms)
interface JklState {
  dir: 1 | -1; // shuttle direction of the last J/L press
  t: number;   // timestamp of the last J/L press
  taps: number; // consecutive same-direction taps (capped at 3 → 4×)
}

/** Installs the global shortcut handler. `duration` = active scene duration
 *  (Home/End). Everything else is read fresh from the store per event.
 *  `confirm` (optional) routes multi-delete through the §6.4 dialog — the
 *  AppShell supplies its ConfirmProvider's fn; bare harnesses (tests) omit
 *  it and Delete falls back to the direct path. */
export function useShortcuts(duration: number, confirm?: ConfirmFn) {
  const jklRef = useRef<JklState | null>(null);
  const markerColorIdx = useRef(0); // ⇧M palette cursor (red → orange → …)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* §8.5 — skip when typing in a field. (The real shell keeps Cmd+combos
         alive here; the mock suppresses everything for simplicity.) */
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;

      const s = useUi.getState();
      if (s.cheatOpen) return; // cheat-sheet modal owns the keyboard (Esc handled locally)

      const cmd = e.metaKey || e.ctrlKey;
      const alt = e.altKey;
      const key = e.key;
      const lower = key.length === 1 ? key.toLowerCase() : key;

      /* R15-F1 FIX 3 (c): destructive keys are GESTURE-GATED. Firing ⌫/⌘Z/
         ⌘⇧Z mid-drag unmounts the dragged Clip before its 'end' can flush,
         leaking the Timeline's host session (auto-scroll rAF + snap
         indicator + ghost previews — the R15-V1 review's mid-drag-unmount
         leak). The Clip owns the module flag (lib/timelinePlacement — set on
         5px activation, cleared on every end + unmount); while it holds we
         swallow the key entirely (no store write, no preventDefault — the
         default for these keys is inert here). */
      const destructive = key === 'Delete' || key === 'Backspace' || (cmd && !alt && lower === 'z');
      if (destructive && isGestureActive()) return;
      const now = performance.now();

      /* ---- JKL shuttle: tap-accel 1× → 2× → 4×, reset on K / Space.
          spec 16 §3.1: ⇧J/⇧L jump straight to 2× (no accel ladder). ---- */
      if (!cmd && !alt && (lower === 'j' || lower === 'l')) {
        const dir: 1 | -1 = lower === 'l' ? 1 : -1;
        if (e.shiftKey) {
          jklRef.current = null; // ⇧ variant is a fixed rate, not a ladder step
          s.setShuttle(dir * 2);
          return;
        }
        const prev = jklRef.current;
        const taps = prev && prev.dir === dir && now - prev.t < JKL_WINDOW_MS ? Math.min(prev.taps + 1, 3) : 1;
        jklRef.current = { dir, t: now, taps };
        s.setShuttle(dir * (taps === 1 ? 1 : taps === 2 ? 2 : 4));
        return;
      }
      if (!cmd && !alt && lower === 'k') {
        jklRef.current = null;
        s.setShuttle(0);
        return;
      }

      /* ---- non-modifier structural keys (⌘/⌥ must NOT fall through here:
         ⌘Delete previously deleted instead of being swallowed as an
         unmatched ⌘ combo per spec 16, and ⌥ arrows hit the nudge path) ---- */
      if (!cmd && !alt) switch (key) {
        case ' ':
          e.preventDefault();
          jklRef.current = null;
          s.togglePlay();
          return;
        case 'ArrowLeft':
          e.preventDefault();
          s.nudgePlayhead(e.shiftKey ? -10 : -1);
          return;
        case 'ArrowRight':
          e.preventDefault();
          s.nudgePlayhead(e.shiftKey ? 10 : 1);
          return;
        case 'ArrowUp':
          e.preventDefault();
          s.moveFocusedTrack(-1);
          return;
        case 'ArrowDown':
          e.preventDefault();
          s.moveFocusedTrack(1);
          return;
        case 'Home':
          e.preventDefault();
          s.setPlayhead(0);
          return;
        case 'End':
          e.preventDefault();
          s.setPlayhead(duration);
          return;
        case 'PageUp':
        case 'PageDown': {
          // prev/next edit point on the main track (moved from AppShell)
          e.preventDefault();
          const sc = s.scenes.find((x) => x.id === s.activeSceneId);
          const main = sc?.tracks.find((tr) => tr.kind === 'main');
          const edges = (main?.elements ?? [])
            .flatMap((el) => [el.startTime, el.startTime + el.duration])
            .sort((a, b) => a - b);
          const dir = key === 'PageDown' ? 1 : -1;
          // forward: first edge after the playhead; backward: NEAREST edge
          // before it (find on ascending edges grabs the EARLIEST — the R13
          // review caught PageUp always landing near t=0)
          const next = dir === 1
            ? edges.find((x) => x > s.playhead + 0.01)
            : [...edges].reverse().find((x) => x < s.playhead - 0.01);
          if (next !== undefined) s.setPlayhead(dir === 1 ? next + 0.01 : Math.max(0, next - 0.01));
          return;
        }
        case 'Tab':
          // spec 16 §3.3 Tab = neighbor-clip selection — but ONLY while focus
          // lives inside the timeline region. Elsewhere Tab keeps its a11y
          // navigation role: F6 region cycling hands focus to regions whose
          // controls must stay Tab-reachable (R13 review: the global hijack
          // made keyboard navigation impossible outside text fields).
          if (document.activeElement?.closest?.('[data-testid="shell-timeline"]')) {
            e.preventDefault();
            s.selectNeighbors(e.shiftKey ? -1 : 1);
          }
          return;
        case 'Delete':
        case 'Backspace':
          if (s.selection.length === 0) return;
          e.preventDefault();
          // §6.4: multi-delete ≥ 5 elements confirms first — same dialog as
          // the clip-menu path (R13: the keyboard route previously bypassed
          // the confirm the menu honored)
          if (s.selection.length >= 5 && confirm) {
            const n = s.selection.length;
            const ripple = e.shiftKey;
            confirm({
              title: `Delete ${n} clips?`,
              body: `${n} selected elements will be removed from the timeline. Undo can restore them.`,
              confirmLabel: 'Delete',
              danger: true,
              onConfirm: () => {
                const st = useUi.getState();
                st.deleteElements(st.selection, ripple);
              },
            });
            return;
          }
          s.deleteElements(s.selection, e.shiftKey); // ⇧Delete = ripple
          return;
        case 'Escape':
          if (s.page === 'audio') s.exitAudioFocus();
          else if (s.tool !== 'select') s.setTool('select');
          else if (s.selection.length > 0) s.setSelection([]);
          return;
      }

      /* ---- ⌘ combos (⌘ = metaKey || ctrlKey; unmatched ⌘ combos swallowed) ---- */
      if (cmd && !alt) {
        if (lower === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            if (s.future.length > 0) s.redo();
            else s.pushToast({ kind: 'info', title: 'Nothing to redo' });
          } else {
            if (s.past.length > 0) s.undo();
            else s.pushToast({ kind: 'info', title: 'Nothing to undo' });
          }
          return;
        }
        if (lower === 'a') {
          e.preventDefault();
          // spec 16 §3.3: ⌘A = focused track, ⇧⌘A = all in timeline
          const sc = s.scenes.find((x) => x.id === s.activeSceneId);
          if (e.shiftKey) {
            const ids = (sc?.tracks ?? []).flatMap((t) => t.elements.map((e2) => e2.id));
            s.setSelection(ids);
          } else {
            const ft = sc?.tracks.find((t) => t.id === s.focusedTrackId);
            if (ft) s.selectTrackElements(ft.id, false);
            else if (sc) s.selectTrackElements(sc.tracks[0].id, false);
          }
          return;
        }
        if (lower === 'b' && !e.shiftKey) {
          // split clip under playhead (main track) at playhead
          e.preventDefault();
          const main = s.scenes.find((x) => x.id === s.activeSceneId)?.tracks.find((tr) => tr.kind === 'main');
          const el = main?.elements.find((x) => s.playhead > x.startTime && s.playhead < x.startTime + x.duration);
          if (el) s.splitElement(el.id, s.playhead);
          return;
        }
        if (lower === 'd' && !e.shiftKey) {
          e.preventDefault();
          if (s.selection.length > 0) s.duplicateElements(s.selection);
          return;
        }
        if (lower === 'm') {
          // spec 16 §3.5: ⌘M = focused track mute (ANY kind — TrackJSON.muted
          // exists on video/text too, and the M button renders on every
          // header); master fallback ONLY when nothing is focused. ⌘⇧M =
          // mute-all batch. (R14: the old audio-kind filter made ⌘M on a
          // focused VIDEO track silently mute the master.)
          e.preventDefault();
          if (e.shiftKey) { s.toggleMuteAll(); return; }
          const st = useUi.getState();
          const sc = st.scenes.find((x) => x.id === st.activeSceneId);
          const ft = sc?.tracks.find((t) => t.id === st.focusedTrackId);
          if (ft) st.toggleTrackCmd(sc!.id, ft.id, 'muted');
          else st.toggleMasterMute();
          return;
        }
        if (lower === 'g' && e.shiftKey) {
          e.preventDefault();
          s.setLoopEnabled(!s.loopEnabled);
          return;
        }
        if (key === '1') {
          e.preventDefault();
          s.setPage('edit');
          return;
        }
        if (key === '2') {
          e.preventDefault();
          s.setPage('color');
          return;
        }
        if (key === '3') {
          e.preventDefault();
          s.setPage('deliver');
          return;
        }
        if (key === '4') {
          // spec 16 §3.8's orphaned "Audio workspace" binding gets its surface
          e.preventDefault();
          s.page === 'audio' ? s.exitAudioFocus() : s.enterAudioFocus('shortcut');
          return;
        }
        if (lower === 's') {
          // spec 16 §3.9 ⌘S — runs the save cycle (StatusStrip chip tracks it).
          // saveNow keeps simulateSaveFail armed so the debug overlay's failure
          // drill still works from the keyboard (retrySave would clear it).
          e.preventDefault();
          if (s.past.length > 0 || s.saveAttempt > 0) s.saveNow();
          else s.pushToast({ kind: 'info', title: 'Nothing to save', detail: 'no doc mutations since boot (mock)' });
          return;
        }
        if (lower === 'e') {
          // spec 16 §3.9 ⌘E — FCPXML export: real command lands with spec 10;
          // the mock lands on the Deliver page and explains the boundary.
          e.preventDefault();
          s.setPage('deliver');
          s.pushToast({ kind: 'info', title: 'Export', detail: 'FCPXML export lands with spec 10 — the Deliver page carries the mock queue (§5)' });
          return;
        }
        if (key === '0') {
          // spec 16 §3.8 ⌘0 — reset zoom to the boot default (R15 T1: routed
          // through the zoom bus so the controller anchors the scroll)
          e.preventDefault();
          zoomBus(DEFAULT_PPS);
          return;
        }
        if (key === '\\') {
          // spec 16 §3.8 ⌘\ — zoom-to-fit (the TimelineToolbar tooltip has
          // advertised this chord since R12; the binding is real now)
          e.preventDefault();
          const w = document.getElementById('timeline-scroll')?.clientWidth ?? 900;
          zoomBus.zoomFit(w, duration);
          return;
        }
        if ((key === 'ArrowLeft' || key === 'ArrowRight')) {
          e.preventDefault();
          if (e.shiftKey) {
            // spec 16 §3.1 ⌘⇧←/→ — marker navigation (nearest before/after)
            const sc = s.scenes.find((x) => x.id === s.activeSceneId);
            const markers = (sc?.markers ?? []).slice().sort((a, b) => a.time - b.time);
            if (markers.length === 0) return;
            const t = snapToFrame(s.playhead);
            const next = key === 'ArrowRight'
              ? markers.find((m) => m.time > t + 0.01)
              : [...markers].reverse().find((m) => m.time < t - 0.01);
            if (next) s.setPlayhead(next.time);
            return;
          }
          // spec 16 §3.1 ⌘←/→ — playhead to timeline start / end
          s.setPlayhead(key === 'ArrowRight' ? duration : 0);
          return;
        }
        if (lower === 'i' && e.shiftKey) {
          // spec 16 §3.1 ⌘⇧I — clear the IN half (loop reverts to 0)
          e.preventDefault();
          s.clearLoopIn();
          return;
        }
        if (lower === 'o' && e.shiftKey) {
          // spec 16 §3.1 ⌘⇧O — clear the OUT half (loop reverts to scene tail)
          e.preventDefault();
          s.clearLoopOut();
          return;
        }
        if (lower === 'i') {
          // real shell opens the OS file picker; mock explains the drop path
          e.preventDefault();
          s.pushToast({ kind: 'info', title: 'Import media', detail: 'File picker is mock — drop files on the Media Pool' });
          return;
        }
        return;
      }

      /* ---- ⌥ combos (⌥ = e.altKey exactly; e.code because Mac alt-key
         layouts remap e.key — ⌥[ types “, ⌥X types ≈) ---- */
      if (alt) {
        if (e.code === 'BracketLeft') {
          e.preventDefault();
          s.trimToPlayhead('l', true);
          return;
        }
        if (e.code === 'BracketRight') {
          e.preventDefault();
          s.trimToPlayhead('r', true);
          return;
        }
        if (e.code === 'KeyX') {
          e.preventDefault();
          s.clearInOut();
          return;
        }
        if (e.code === 'KeyM' && e.shiftKey) {
          // ⌥⇧M — add marker with cycled color (spec 16 §3.7). Lives HERE, not
          // in the plain-key switch below: the switch is unreachable under
          // alt, and e.key is remapped on Mac layouts so e.code is the only
          // stable signal. (R13: previously unreachable — the cheat sheet
          // documented the binding but it never fired; caught by tests.)
          e.preventDefault();
          const color = MARKER_PALETTE[markerColorIdx.current % MARKER_PALETTE.length];
          markerColorIdx.current = (markerColorIdx.current + 1) % MARKER_PALETTE.length;
          s.addMarker(s.playhead, color);
          return;
        }
        return;
      }

      /* ---- plain single-key bindings (tools, in/out, markers, slip) ---- */
      switch (lower) {
        case 'v': s.setTool('select'); return;
        case 'b': s.setTool('blade'); return;
        case 't': s.setTool('roll'); return;
        case 'y': s.setTool('slip'); return;
        case 'u': s.setTool('slide'); return;
        case 'r': s.setTool('ripple'); return;
        case 'n': s.toggleSnap(); return;
        case 'i': s.markIn(); return;
        case 'o': s.markOut(); return;
        case 'm': {
          // spec 16 §3.7: ⇧M = delete marker at playhead; plain M = add marker.
          // (⌥⇧M add-with-color is handled up in the alt block — unreachable here.)
          if (e.shiftKey) {
            s.removeMarkersAt(s.playhead);
          } else {
            s.addMarker(s.playhead);
          }
          return;
        }
        case ',': if (s.selection.length > 0) s.slipNudge(s.selection, e.shiftKey ? -10 : -1); return;
        case '.': if (s.selection.length > 0) s.slipNudge(s.selection, e.shiftKey ? 10 : 1); return;
        /* spec 16 §3.4 ⇧,/⇧. = 10-frame slip ladder (R14 — was 1-frame only);
           spec 16 §3.8 zoom keys: ×1.7 canonical step (R15 T1 revision,
           same factor as the toolbar buttons) via the zoom bus */
        case '[': s.trimToPlayhead('l', false); return; // spec 16 §3.4: non-ripple trim start
        case ']': s.trimToPlayhead('r', false); return; // spec 16 §3.4: non-ripple trim end
        case '=':
        case '+': zoomBus.zoomIn(); return;
        case '-': zoomBus.zoomOut(); return;
      }

      if (key === '?') {
        s.setCheatOpen(!s.cheatOpen);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration, confirm]);
}
