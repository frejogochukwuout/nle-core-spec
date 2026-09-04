/**
 * storybook-annotakit — shared domain types.
 *
 * Lean by design (user feedback: previous JSON export was "extremely verbose").
 * A thread = one pin/region + its comment thread + everything an implementer
 * agent needs to find the code: story metadata (index.json) and React component
 * metadata (fiber walk at capture time). DOM selectors are the fallback anchor,
 * not the identity.
 */

export type ThreadStatus = 'open' | 'resolved';
export type ThreadKind = 'pin' | 'region';

/** Story metadata captured at pin time (from /index.json + CSF render context). */
export interface StoryRef {
  storyId: string;
  /** Sidebar group title, e.g. "Nimbus Components". */
  title?: string;
  /** Story name, e.g. "Danger". */
  name?: string;
  /** CSF file that declares the story (relative to project root). */
  importPath?: string;
  /** File providing meta.component when the indexer detected it. */
  componentPath?: string;
  /** Deep link to open this story in the manager. */
  url?: string;
}

/** JSX creation site of the nearest component (parsed from fiber _debugStack). */
export interface ComponentSource {
  file: string;
  line?: number;
  column?: number;
}

/**
 * React component identity for the pinned element — the differentiator.
 * Everything optional: guarded fiber walk, absent in production builds.
 */
export interface ComponentRef {
  /** Nearest React component display name. */
  name?: string;
  /** Component chain, innermost last, bounded length. */
  chain: string[];
  /** JSX site: file:line:col (dev only, from _debugStack). */
  source?: ComponentSource;
  /** Small stringified prop values of the nearest component (bounded count/size). */
  props?: Record<string, string>;
}

export interface TextQuote {
  exact: string;
  prefix?: string;
  suffix?: string;
  occurrenceIndex?: number;
}

export interface Fragment {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnchorSelector {
  cssSelector?: string;
  textQuote?: TextQuote;
  fragment?: Fragment;
}

export interface AttrFingerprint {
  name: string;
  value: string;
}

export interface ElementFingerprint {
  tag: string;
  attrs: AttrFingerprint[];
  neighborText?: string;
}

/** Just enough DOM context for a human/agent to recognize the element. */
export interface TargetContext {
  tag: string;
  role?: string;
  ariaLabel?: string;
  text?: string;
  /** Clipped outerHTML — SHORT (verbose JSON was feedback #1). */
  outerHTML?: string;
}

/** The pinned element anchor package (ported multi-selector engine). */
export interface ThreadTarget {
  kind: ThreadKind;
  selector: AnchorSelector;
  fingerprint?: ElementFingerprint;
  context: TargetContext;
  bbox: BBox;
  captureViewportWidth: number;
}

/** One reply in a thread. ghId/source are set by the server-side GH mirror
 *  engine (never by clients) — they make pull-dedupe exact. */
export interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  /** GitHub comment id this reply was mirrored to / imported from. */
  ghId?: string;
  /** 'github' = imported from a GitHub issue comment by pull-sync. */
  source?: 'local' | 'github';
}

/** 1:1 GitHub issue mirror for a thread. SERVER-OWNED: clients never write it
 *  (PATCH always keeps the server's copy — losing it would fork the mapping
 *  and create duplicate issues). Syncing is idempotent BECAUSE of this link. */
export interface ThreadGhRef {
  issue: number;
  url?: string;
  /** Last issue state we pushed or pulled — diffing against thread.status is
   *  how both directions of the lifecycle sync are decided. */
  state?: 'open' | 'closed';
  syncedAt?: string;
}

export interface Thread {
  id: string;
  /** Per-story sequential number, server-assigned. */
  number: number;
  storyId: string;
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  /** Author of the first comment (thread owner). */
  author: string;
  story: StoryRef;
  component?: ComponentRef | null;
  target: ThreadTarget;
  comments: Comment[];
  /** GitHub issue mirror (absent until the thread is synced to GitHub once). */
  gh?: ThreadGhRef;
}

/** Store info surfaced by /health. */
export interface HealthInfo {
  ok: true;
  version: string;
  store: 'sqlite' | 'json';
  storePath: string;
  threads: number;
  /** Machine-readable agent onboarding: which consumption paths exist. */
  agentSurfaces: AgentSurfaces;
  /** GitHub publish readiness (pre-flight for agents). */
  gh?: {
    repo: string | null;
    hasToken: boolean;
    autoSync: string;
    ghSync?: GhSyncStatus;
  };
}

/** The two agent consumption paths, computed server-side so agents (and the
 *  panel) branch on ONE field instead of inferring from prose. */
export interface AgentSurfaces {
  /** REST API on this origin (always true when health responds). */
  rest: true;
  /** Markdown + JSON digests at /export. */
  digests: string[];
  /** 1:1 GitHub issue mirror is active (agents can work purely from GitHub). */
  github: boolean;
  /** Label the mirror files issues under. */
  githubLabel: string;
  /** Why the mirror is off (when github=false): 'no token' | 'no repo' | 'disabled'. */
  githubReason?: string;
  /** How feedback survives: pushed to a remote, committed locally, or file only. */
  durability: 'git-push' | 'git-commit' | 'disk-only';
}

/** Lifecycle mirror engine state (GET /sync, /health). */
export interface GhSyncStatus {
  /** Auto push+pull active (token+repo present, not disabled). */
  enabled: boolean;
  /** 'auto' = engine running; 'unconfigured' = local mode (no token/repo);
   *  'off' = mirror disabled by config/env. */
  mode: 'auto' | 'unconfigured' | 'off';
  /** Threads with a gh mapping / total threads. */
  mapped: number;
  threads: number;
  /** Queued + in-flight push tasks. */
  pending: number;
  /** Threads with un-mirrored local deltas (retries exhausted — self-heal via
   *  POST /sync, next mutation, the periodic sweep, or a restart). */
  stalled: number;
  /** Remote→local poll interval seconds (0 = pull only on POST /sync). */
  pollSec: number;
  lastPushAt: string | null;
  lastPullAt: string | null;
  lastError: string | null;
  /** While set (rate-limit/transient backoff), pushes+polls pause. */
  backoffUntil: string | null;
  /** Human note for the panel/agents. */
  note: string;
}

/** Result of POST /sync (force reconcile both directions). */
export interface GhSyncSummary {
  ok: true;
  /** True when the mirror is unconfigured: nothing was done, `reason` says why
   *  (with a/b/c setup steps). Local mode is NOT an error. */
  noop?: boolean;
  reason?: string;
  /** Issues created for unmapped threads (backfill) — ONE per thread, ever. */
  created: number;
  /** Issue comments/state changes pushed. */
  pushed: number;
  /** Remote changes imported (state flips + comments). */
  pulled: number;
  closedTombstones: number;
  issuesTotal: number;
  /** Threads still carrying un-mirrored deltas after this sync. */
  stalled?: number;
}

/** Payload preview sends when creating a thread (server fills number/status). */
export interface ThreadInput {
  id?: string;
  storyId: string;
  story?: Partial<StoryRef>;
  component?: ComponentRef | null;
  target: ThreadTarget;
  comments: Comment[];
}

/** Lean JSON export envelope. */
export interface ExportBundle {
  generatedAt: string;
  exportUrl: string;
  stories: ExportedStory[];
}

export interface ExportedStory {
  story: StoryRef;
  counts: { open: number; resolved: number };
  threads: Thread[];
}

/** GitHub publish result (legacy digest mode — kept for type back-compat). */
export interface GhPublishResult {
  ok: true;
  mode: 'issue' | 'pr-comment';
  url: string;
  number: number;
  threadCount: number;
}
