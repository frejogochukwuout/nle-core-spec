/* SceneTabs — spec 18 §4.6: one tab per scene (spec 09 §6 multi-scene),
   dirty dot for autosave state, "+" creates, close confirms. */

import { Plus, X } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { useConfirm } from '../shell/ConfirmDialog';
import type { SceneJSON } from '../../lib/mockData';

export function SceneTabs() {
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const setActiveScene = useUi((s) => s.setActiveScene);
  const deleteScene = useUi((s) => s.deleteScene);
  const pushToast = useUi((s) => s.pushToast);
  const confirm = useConfirm();

  /* spec 18 §6.4 destructive confirmation: deleteScene WITH clips confirms
     (“M clips will be lost”); an empty scene deletes directly — undo is the
     safety net. The last scene never deletes (store guard → info toast). */
  const closeScene = (sc: SceneJSON) => {
    if (useUi.getState().scenes.length <= 1) {
      pushToast({ kind: 'info', title: 'Cannot delete the last scene', detail: 'The project keeps at least one scene (store guard)' });
      return;
    }
    const clipCount = sc.tracks.reduce((n, t) => n + t.elements.length, 0);
    if (clipCount === 0) {
      deleteScene(sc.id);
      return;
    }
    confirm({
      title: `Delete scene ${sc.name}?`,
      body: `${clipCount} clip${clipCount === 1 ? '' : 's'} will be lost. Undo can restore the scene.`,
      confirmLabel: 'Delete scene',
      danger: true,
      onConfirm: () => deleteScene(sc.id),
    });
  };

  return (
    <div
      data-testid="shell-timeline-tabs"
      role="tablist"
      aria-label="Scenes"
      className="flex shrink-0 items-stretch overflow-hidden border-b border-hairline bg-[var(--bg-inset)] text-[11.5px]"
      style={{ height: 26, minHeight: 26 }}
    >
      {scenes.map((sc) => {
        const active = sc.id === activeSceneId;
        return (
          <div
            key={sc.id}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-testid={`shell-scene-tab-${sc.id}`}
            onClick={() => setActiveScene(sc.id)}
            className={`relative flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-hairline pl-3.5 pr-2.5 ${
              active ? 'bg-shell text-tprimary' : 'text-tmuted hover:bg-[var(--hover-overlay)]'
            }`}
          >
            {active && <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'var(--accent-selection)' }} />}
            {sc.dirty && <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-accent" title="Unsaved changes" aria-label="Unsaved changes" />}
            <span className="whitespace-nowrap">{sc.name}</span>
            <button
              className="flex h-[13px] w-[13px] items-center justify-center rounded-[2px] text-tfaint hover:bg-[var(--active-overlay)] hover:text-tprimary"
              aria-label={`Close scene ${sc.name}`}
              onClick={(e) => { e.stopPropagation(); closeScene(sc); }}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
      <button
        className="flex w-[28px] shrink-0 items-center justify-center text-tfaint hover:bg-[var(--hover-overlay)] hover:text-tprimary"
        aria-label="Create scene"
        data-tip="New scene"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
