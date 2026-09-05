import { describe, expect, it } from 'vitest';
import {
  applyPreviewRedirect,
  previewRedirectTarget,
  STORIES_PATH,
  type LocationLike,
} from './previewRedirect';

describe('previewRedirectTarget — the XTransformPort casing trap', () => {
  it('redirects the lowercase key the platform matcher misses', () => {
    expect(previewRedirectTarget('?xtransformport=6007')).toBe(STORIES_PATH);
  });

  it('redirects the exact platform casing too (harmless double-cover)', () => {
    // Correct-case requests never reach the app (Caddy routes them to :6007),
    // but covering it costs nothing and guards against matcher drift.
    expect(previewRedirectTarget('?XTransformPort=6007')).toBe(STORIES_PATH);
  });

  it('redirects other common casings users type', () => {
    expect(previewRedirectTarget('?XTransformport=6007')).toBe(STORIES_PATH);
    expect(previewRedirectTarget('?XTRANSFORMPORT=6007')).toBe(STORIES_PATH);
  });

  it('redirects when the key is embedded among other params', () => {
    expect(previewRedirectTarget('?foo=1&xtransformport=6007&bar=2')).toBe(
      STORIES_PATH,
    );
  });

  it('leaves other port values alone (not ours to guess)', () => {
    expect(previewRedirectTarget('?xtransformport=3003')).toBeNull();
    expect(previewRedirectTarget('?XTransformPort=6006')).toBeNull();
  });

  it('leaves normal app URLs alone', () => {
    expect(previewRedirectTarget('')).toBeNull();
    expect(previewRedirectTarget('?foo=1')).toBeNull();
  });
});

describe('applyPreviewRedirect — side-effect wiring', () => {
  const spyLoc = (search: string) => {
    const calls: string[] = [];
    const loc: LocationLike = {
      search,
      replace: (url: string) => calls.push(url),
    };
    return { loc, calls };
  };

  it('replaces the location once and reports true', () => {
    const { loc, calls } = spyLoc('?xtransformport=6007');
    expect(applyPreviewRedirect(loc)).toBe(true);
    expect(calls).toEqual([STORIES_PATH]);
  });

  it('does nothing on a clean URL', () => {
    const { loc, calls } = spyLoc('');
    expect(applyPreviewRedirect(loc)).toBe(false);
    expect(calls).toEqual([]);
  });
});
