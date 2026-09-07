/* leftDockContent — R23-WD (DESIGN-R23 D-D1; #100/#106/#91 + Part IX
   rulings 4/16): the table pins. The table is the ONE source both the
   Toolbar2 left toggle and the LeftDock routing read, so these pins are the
   contract the DOM-level pins in Toolbar2.test / LeftDock.test build on:
   the label names the dock's actual content, deliver's entry is null (the
   hidden law), and Record<Page, …> forces every page to decide. */

import { describe, expect, it } from 'vitest';
import { LEFT_DOCK_CONTENT, leftDockContent, type LeftDockSurface } from './leftDockContent';
import type { Page } from '../../state/useUiStore';

const PAGES: Page[] = ['edit', 'color', 'audio', 'fx', 'deliver'];

describe('leftDockContent (R23-WD D-D1 — the one table)', () => {
  it('names every page: Media Pool / Stills / Sound Library / Effects — the label IS the dock content (#100/#106)', () => {
    expect(leftDockContent('edit')!.label).toBe('Media Pool');
    expect(leftDockContent('color')!.label).toBe('Stills');
    expect(leftDockContent('audio')!.label).toBe('Sound Library');
    expect(leftDockContent('fx')!.label).toBe('Effects');
  });

  it('the four labels are distinct — no page carries another page\'s name (a generic label is a lying label)', () => {
    const labels = PAGES.map((p) => leftDockContent(p)?.label).filter(Boolean);
    expect(new Set(labels).size).toBe(4);
    // Edit is the ONLY "Media Pool" page (Wave A retired the effects tab;
    // Wave B made color stills-only — the pool no longer leaks anywhere)
    expect(PAGES.filter((p) => leftDockContent(p)?.label === 'Media Pool')).toEqual(['edit']);
  });

  it('DELIVER is null — the hidden law (ruling 16: DeliverPage owns its own presets rail)', () => {
    expect(leftDockContent('deliver')).toBeNull();
    expect(LEFT_DOCK_CONTENT.deliver).toBeNull();
  });

  it('the table is exhaustive over Page — a future page MUST decide here (Record<Page,…>)', () => {
    expect(Object.keys(LEFT_DOCK_CONTENT).sort()).toEqual([...PAGES].sort());
    for (const p of PAGES) {
      // every entry is either a full record or the deliver null
      const c = LEFT_DOCK_CONTENT[p];
      if (c === null) continue;
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.icon).toBeDefined();
    }
  });

  it('each non-deliver entry maps a MOUNTABLE surface (the LeftDock switch keys)', () => {
    const surfaces: LeftDockSurface[] = ['media-pool', 'stills', 'sound-library', 'fx-browser'];
    for (const p of PAGES) {
      const c = leftDockContent(p);
      if (!c) continue;
      expect(surfaces).toContain(c.surface);
    }
    // one surface per page — the dock is single-content (no tab bar, #106)
    const used = PAGES.map((p) => leftDockContent(p)?.surface).filter(Boolean);
    expect(new Set(used).size).toBe(4);
  });

  it('the pool flag gates edit + color only (audio/fx own the whole slot — the Fairstyle left-dock law)', () => {
    expect(leftDockContent('edit')!.gatedByPool).toBe(true);
    expect(leftDockContent('color')!.gatedByPool).toBe(true);
    expect(leftDockContent('audio')!.gatedByPool).toBe(false);
    expect(leftDockContent('fx')!.gatedByPool).toBe(false);
  });
});
