/* SceneTabs component tests — scene switching (spec 09 §6 multi-scene /
   18 §4.6), dirty dot, +scene creation, delete-with-clips confirmation
   (spec 18 §6.4), direct empty-scene delete, and the last-scene guard. */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { SceneTabs } from './SceneTabs';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

const boot = (patch: UiPatch = {}) => renderShell(<SceneTabs />, { patch });

describe('SceneTabs', () => {
  it('renders a tablist with one tab per scene; the active tab is selected (spec 18 §4.6)', () => {
    boot({});
    const tabs = screen.getByRole('tablist', { name: 'Scenes' });
    expect(within(tabs).getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByTestId('shell-scene-tab-sc-1')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-scene-tab-sc-2')).toHaveAttribute('aria-selected', 'false');
  });

  it('the dirty dot marks unsaved scenes only (spec 18 §4.6 autosave state)', () => {
    boot({});
    expect(within(screen.getByTestId('shell-scene-tab-sc-1')).getByLabelText('Unsaved changes')).toBeInTheDocument();
    expect(within(screen.getByTestId('shell-scene-tab-sc-2')).queryByLabelText('Unsaved changes')).toBeNull();
  });

  it('clicking a tab switches the active scene and clears the selection (spec 09 §6)', () => {
    boot({});
    fireEvent.click(screen.getByTestId('shell-scene-tab-sc-2'));
    expect(store().activeSceneId).toBe('sc-2');
    expect(store().selection).toEqual([]);
  });

  it('+ scene creates an empty 3-track scene and activates it (spec 09 §6 create)', () => {
    boot({});
    fireEvent.click(screen.getByTestId('shell-timeline-tab-add'));
    expect(store().scenes).toHaveLength(3);
    const sc = store().scenes.at(-1)!;
    expect(sc.name).toBe('Scene 3');
    expect(sc.tracks.map((t) => t.kind)).toEqual(['overlay', 'main', 'audio']);
    expect(store().activeSceneId).toBe(sc.id);
    expect(store().selection).toEqual([]);
  });

  it('closing a scene WITH clips confirms first; confirm deletes (spec 18 §6.4 destructive confirm)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Close scene Rough Cut v3' })); // 7 clips
    expect(screen.getByTestId('shell-confirm')).toBeInTheDocument();
    expect(screen.getByText('Delete scene Rough Cut v3?')).toBeInTheDocument();
    expect(screen.getByText(/7 clips will be lost/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-confirm-confirm'));
    expect(store().scenes.map((s) => s.id)).toEqual(['sc-2']);
    expect(store().activeSceneId).toBe('sc-2'); // fell back to the previous scene
  });

  it('cancelling the confirm dialog keeps the scene (spec 18 §6.4)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Close scene Rough Cut v3' }));
    fireEvent.click(screen.getByTestId('shell-confirm-cancel'));
    expect(screen.queryByTestId('shell-confirm')).not.toBeInTheDocument();
    expect(store().scenes).toHaveLength(2);
  });

  it('closing an EMPTY scene deletes directly without a dialog (undo is the safety net)', () => {
    boot({});
    fireEvent.click(screen.getByTestId('shell-timeline-tab-add')); // Scene 3, 0 clips
    const newId = store().activeSceneId;
    fireEvent.click(screen.getByRole('button', { name: 'Close scene Scene 3' }));
    expect(screen.queryByTestId('shell-confirm')).not.toBeInTheDocument();
    expect(store().scenes.map((s) => s.id)).not.toContain(newId);
  });

  it('the last scene never deletes — guard toast instead (store guard)', () => {
    useUi.setState({ scenes: [store().scenes.find((s) => s.id === 'sc-1')!] });
    renderShell(<SceneTabs />);
    fireEvent.click(screen.getByRole('button', { name: 'Close scene Rough Cut v3' }));
    expect(screen.queryByTestId('shell-confirm')).not.toBeInTheDocument();
    expect(store().scenes).toHaveLength(1);
    expect(store().toasts.at(-1)!.title).toBe('Cannot delete the last scene');
  });
});
