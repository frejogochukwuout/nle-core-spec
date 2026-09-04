/**
 * storybook-annotakit — channel event names.
 * Strings must stay identical across the server (CJS) and browser (ESM) bundles.
 */

/** Server → all clients (manager + every preview iframe) after any mutation. */
export const THREADS_CHANGED = 'annotakit/threads-changed';

/** Manager → preview: scroll to + highlight a thread's pin. */
export const FOCUS_THREAD = 'annotakit/focus-thread';

/** Preview → manager: focus succeeded (pin existed + was flashed). The
 *  cross-story path is a race — the new story's anchors may not be resolved
 *  yet when FOCUS_THREAD lands, so the manager retries until this ack. */
export const THREAD_FOCUSED = 'annotakit/thread-focused';

/** Manager (canvas toolbar) → preview: show/hide the capture layer. */
export const TOGGLE_LAYER = 'annotakit/toggle-layer';

/** Preview → manager: capture layer visibility changed (ack). */
export const LAYER_STATE = 'annotakit/layer-state';

/** Payload for THREADS_CHANGED. */
export interface ThreadsChangedPayload {
  storyId?: string;
  threadId?: string;
  reason: 'created' | 'updated' | 'commented' | 'resolved' | 'reopened';
}

/** API base path on the storybook dev server (same-origin). */
export const API_BASE = '/annotakit/api';
