import {
  API_BASE,
  FOCUS_THREAD,
  THREADS_CHANGED,
  UI_COMMAND,
  UI_STATE,
  probeMode
} from "./chunk-4TMC73XV.mjs";
import {
  getStaticStore,
  renderStaticDigest
} from "./chunk-QIWATIG4.mjs";

// src/manager/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addons, types, useStorybookApi, useStorybookState } from "storybook/manager-api";
import { useTheme } from "storybook/theming";
import { BoxIcon, CameraIcon, CheckIcon, CommentIcon, CommentsIcon, EyeIcon, EyeCloseIcon, LinkIcon, PinIcon, SyncIcon } from "@storybook/icons";
var ADDON_ID = "annotakit";
var PANEL_ID = `${ADDON_ID}/panel`;
var TOOL_ID = `${ADDON_ID}/tool`;
var AUTHOR_KEY = "annotakit:author";
async function jfetch(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(
      body && typeof body === "object" && "error" in body ? String(body.error) : `HTTP ${res.status}${text.slice(0, 120) ? `: ${text.slice(0, 120)}` : ""}`
    );
  }
  return body;
}
var getThreadsAndSnapshots = (storyId) => jfetch(`${API_BASE}/threads${storyId ? `?storyId=${encodeURIComponent(storyId)}` : ""}`).then((b) => {
  const o = b;
  return { threads: o.threads ?? [], snapshots: new Set(o.snapshots ?? []) };
});
var getHealth = () => fetch(`${API_BASE}/health`, { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null);
var getExport = (format, storyId) => fetch(
  `${API_BASE}/export?format=${format}${storyId ? `&storyId=${encodeURIComponent(storyId)}` : ""}`,
  { cache: "no-store" }
).then((r) => {
  if (!r.ok) throw new Error(`export failed: HTTP ${r.status}`);
  return r.text();
});
var getSyncStatus = () => fetch(`${API_BASE}/sync`, { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null);
var postSync = () => jfetch(`${API_BASE}/sync`, { method: "POST" });
function stableSort(threads) {
  return [...threads].sort((a, b) => {
    const sa = a.story?.title ?? a.storyId;
    const sb = b.story?.title ?? b.storyId;
    if (sa !== sb) return sa < sb ? -1 : 1;
    return (a.number ?? 0) - (b.number ?? 0);
  });
}
function ago(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1e3));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}
function ReviewPanel() {
  const theme = useTheme();
  const storybookApi = useStorybookApi();
  const state = useStorybookState();
  const storyId = state.storyId;
  const [scope, setScope] = useState("story");
  const [filter, setFilter] = useState("all");
  const [threads, setThreads] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [author, setAuthor] = useState("reviewer");
  const [activeThread, setActiveThread] = useState(null);
  const [ghOpen, setGhOpen] = useState(false);
  const [sync, setSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [health, setHealth] = useState(null);
  const [snapshotIds, setSnapshotIds] = useState(/* @__PURE__ */ new Set());
  const [staticMode, setStaticMode] = useState(false);
  useEffect(() => {
    try {
      const a = localStorage.getItem(AUTHOR_KEY);
      if (a) setAuthor(a);
    } catch {
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void probeMode().then((m) => {
      if (!alive || m !== "static") return;
      setStaticMode(true);
    });
    void getHealth().then((h) => {
      if (!alive || !h) return;
      setHealth(h);
    });
    void getSyncStatus().then((s) => {
      if (alive && s) setSync(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    try {
      if (staticMode) {
        const store = await getStaticStore();
        setThreads(store.list(scope === "story" ? storyId : void 0));
        setSnapshotIds(/* @__PURE__ */ new Set());
        setError(null);
      } else {
        const { threads: list, snapshots } = await getThreadsAndSnapshots(scope === "story" ? storyId : void 0);
        setThreads(list);
        setSnapshotIds(snapshots);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    if (staticMode) return;
    void getSyncStatus().then((s) => {
      if (s) setSync(s);
    });
    void getHealth().then((h) => {
      if (h) setHealth(h);
    });
  }, [scope, storyId, staticMode]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const ch = addons.getChannel();
    const onChange = (payload) => {
      if (scope === "all" || !payload?.storyId || payload.storyId === storyId) void refresh();
    };
    ch.on(THREADS_CHANGED, onChange);
    return () => {
      ch.removeListener(THREADS_CHANGED, onChange);
    };
  }, [scope, storyId, refresh]);
  useEffect(() => {
    if (!staticMode) return;
    let unsub;
    let alive = true;
    void getStaticStore().then((store) => {
      if (!alive) return;
      unsub = store.subscribe(() => void refresh());
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, [staticMode, refresh]);
  const saveAuthor = (value) => {
    setAuthor(value);
    try {
      localStorage.setItem(AUTHOR_KEY, value);
    } catch {
    }
  };
  const focusThread = (t) => {
    if (t.storyId !== storyId) {
      storybookApi.selectStory(t.storyId);
      window.setTimeout(() => addons.getChannel().emit(FOCUS_THREAD, t.id), 400);
    } else {
      addons.getChannel().emit(FOCUS_THREAD, t.id);
    }
    setActiveThread(t.id);
  };
  const reply = async (t, body) => {
    if (!body.trim()) return false;
    setBusy(true);
    try {
      if (staticMode) {
        const store = await getStaticStore();
        await store.addComment(t.id, body, author);
        await refresh();
        return true;
      }
      await jfetch(`${API_BASE}/threads/${encodeURIComponent(t.id)}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, author })
      });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const toggleResolve = async (t) => {
    setBusy(true);
    try {
      const next = {
        ...t,
        status: t.status === "open" ? "resolved" : "open",
        resolvedAt: t.status === "open" ? (/* @__PURE__ */ new Date()).toISOString() : void 0
      };
      if (staticMode) {
        const store = await getStaticStore();
        await store.patch(next);
        await refresh();
        return;
      }
      await jfetch(`${API_BASE}/threads/${encodeURIComponent(t.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next)
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${what} copied to clipboard`);
      window.setTimeout(() => setNotice(null), 2500);
    } catch {
      setError("clipboard blocked \u2014 use Download instead");
    }
  };
  const exportAny = async (format) => {
    const list = staticMode ? (await getStaticStore()).list(scope === "story" ? storyId : void 0) : null;
    if (list !== null) {
      return format === "md" ? renderStaticDigest(list) : JSON.stringify({ generatedAt: (/* @__PURE__ */ new Date()).toISOString(), mode: "static", threads: list }, null, 2);
    }
    return getExport(format, scope === "story" ? storyId : void 0);
  };
  const doExport = (format, sink) => {
    void exportAny(format).then((text) => sink === "copy" ? copy(text, format === "md" ? "markdown digest" : "JSON bundle") : download(text, "annotakit-review.md")).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };
  const download = (text, filename) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const syncNow = async () => {
    setSyncing(true);
    try {
      const summary = await postSync();
      if (summary.noop) {
        setNotice(`GitHub mirror not configured \u2014 local mode. ${summary.reason ?? ""}`.slice(0, 400));
      } else {
        setNotice(
          `synced: ${summary.created} issue${summary.created === 1 ? "" : "s"} created \xB7 ${summary.pushed} pushed \xB7 ${summary.pulled} pulled from GitHub${summary.stalled ? ` \xB7 ${summary.stalled} stalled (will retry)` : ""}`
        );
      }
      window.setTimeout(() => setNotice(null), 6e3);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };
  const ordered = useMemo(() => stableSort(threads), [threads]);
  const shown = useMemo(
    () => ordered.filter((t) => filter === "all" ? true : t.status === "open"),
    [ordered, filter]
  );
  const openCount = ordered.filter((t) => t.status === "open").length;
  const chip = (bg, color) => ({
    background: bg,
    color,
    borderRadius: 999,
    padding: "1px 7px",
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: "nowrap",
    border: `1px solid ${color}33`
  });
  const miniBtn = (bg, active) => ({
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    background: active ? bg : "transparent",
    color: active ? "#fff" : theme.textColor
  });
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: theme.fontBase, fontSize: 13, padding: "8px 10px", height: "100%", overflow: "auto", color: theme.textColor } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", paddingBottom: 6, borderBottom: `1px solid ${theme.appBorderColor}` } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 0, border: `1px solid ${theme.appBorderColor}`, borderRadius: 7, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("button", { style: miniBtn(theme.colorSecondary, scope === "story"), onClick: () => setScope("story") }, "This story"), /* @__PURE__ */ React.createElement("button", { style: miniBtn(theme.colorSecondary, scope === "all"), onClick: () => setScope("all") }, "All stories")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 0, border: `1px solid ${theme.appBorderColor}`, borderRadius: 7, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("button", { style: miniBtn(theme.colorSecondary, filter === "all"), onClick: () => setFilter("all"), title: "Show open + resolved" }, "all"), /* @__PURE__ */ React.createElement("button", { style: miniBtn(theme.colorSecondary, filter === "open"), onClick: () => setFilter("open"), title: "Show only open" }, "open")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: theme.textMutedColor } }, threads.length ? `${openCount} open / ${threads.length} threads` : "no threads"), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement(
    "input",
    {
      style: { padding: "3px 8px", fontSize: 11, borderRadius: 6, border: `1px solid ${theme.inputBorder || theme.appBorderColor}`, background: theme.inputBackground || "transparent", color: theme.textColor, width: 110 },
      value: author,
      onChange: (e) => saveAuthor(e.target.value),
      placeholder: "your name",
      title: "Author name (shared with the preview composer)"
    }
  ), /* @__PURE__ */ React.createElement("button", { style: { padding: "3px 9px", fontSize: 11, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: `1px solid ${theme.appBorderColor}`, background: "transparent", color: theme.textColor }, onClick: () => setGhOpen((v) => !v), title: "GitHub lifecycle sync", hidden: staticMode }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", gap: 4, alignItems: "center" } }, /* @__PURE__ */ React.createElement(SyncIcon, { width: 12, height: 12 }), " GitHub", sync && sync.mode === "auto" && !sync.lastError && /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: 999, background: theme.colorPositive, display: "inline-block" } }), sync?.lastError && /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: 999, background: theme.colorNegative, display: "inline-block" }, title: "sync error \u2014 open for details" }), sync && sync.mode !== "auto" && !sync.lastError && /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: 999, background: "#f59e0b", display: "inline-block" }, title: sync.mode === "unconfigured" ? "local mode \u2014 GitHub mirror not configured" : "mirror disabled" }))), staticMode && /* @__PURE__ */ React.createElement("span", { style: { ...chip("#f59e0b22", "#b45309"), fontSize: 10 }, title: "Static `storybook build` \u2014 no dev server, no sync. Threads live in this browser's localStorage for this deployment; use export to hand-carry them back to a dev-server store." }, "static \xB7 local-only")), ghOpen && !staticMode && /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 0", borderBottom: `1px solid ${theme.appBorderColor}`, fontSize: 11, display: "flex", flexDirection: "column", gap: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } }, sync ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { ...chip(sync.mode === "auto" ? `${theme.colorPositive}22` : "#f59e0b22", sync.mode === "auto" ? theme.colorPositive : "#b45309") } }, sync.mode === "auto" ? "auto-sync" : sync.mode === "unconfigured" ? "local mode" : "mirror off"), /* @__PURE__ */ React.createElement("span", { style: { color: theme.textMutedColor } }, sync.mode === "auto" && /* @__PURE__ */ React.createElement(React.Fragment, null, sync.mapped, "/", sync.threads, " threads mirrored", sync.pending > 0 ? ` \xB7 ${sync.pending} queued` : "", sync.stalled > 0 ? ` \xB7 ${sync.stalled} stalled` : "", sync.lastPushAt ? ` \xB7 pushed ${ago(sync.lastPushAt)}` : "", sync.lastPullAt ? ` \xB7 pulled ${ago(sync.lastPullAt)}` : "", sync.pollSec > 0 ? ` \xB7 polls every ${sync.pollSec}s` : ""), sync.backoffUntil && /* @__PURE__ */ React.createElement(React.Fragment, null, sync.lastError ? " \xB7 " : "", "backoff until ", new Date(sync.backoffUntil).toLocaleTimeString()))) : /* @__PURE__ */ React.createElement("span", { style: { color: theme.textMutedColor } }, "sync status unavailable (dev server offline?)"), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement(
    "button",
    {
      style: { padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: syncing ? "default" : "pointer", borderRadius: 6, border: "none", background: theme.colorSecondary, color: "#fff", display: "inline-flex", gap: 4, alignItems: "center" },
      disabled: syncing,
      onClick: () => void syncNow(),
      title: "Force reconcile both directions \u2014 idempotent, never duplicates issues"
    },
    /* @__PURE__ */ React.createElement(SyncIcon, { width: 11, height: 11 }),
    " ",
    syncing ? "syncing\u2026" : "Sync now"
  )), sync?.lastError && /* @__PURE__ */ React.createElement("div", { style: { padding: "4px 8px", borderRadius: 6, background: `${theme.colorNegative}18`, color: theme.colorNegative, whiteSpace: "pre-wrap" } }, "last sync error: ", sync.lastError), sync?.note && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: theme.textMutedColor, whiteSpace: "pre-wrap" } }, sync.note), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: theme.textMutedColor } }, health?.agentSurfaces?.github ? /* @__PURE__ */ React.createElement(React.Fragment, null, "repo: ", /* @__PURE__ */ React.createElement("b", null, health.gh?.repo), " \xB7 durability: ", health.agentSurfaces.durability, " \xB7 store: ", health.gh?.autoSync) : health?.agentSurfaces ? /* @__PURE__ */ React.createElement(React.Fragment, null, "local mode \u2014 reviews live here (REST + digests); GitHub mirror: ", health.agentSurfaces.githubReason ?? "off", health.agentSurfaces.durability ? ` \xB7 durability: ${health.agentSurfaces.durability}` : "") : "set ANNOTAKIT_GH_TOKEN in .env (auto-loaded) \xB7 repo auto-detected from git remote"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: theme.textMutedColor } }, "Every thread mirrors to exactly ONE issue \u2014 status (open/resolved), replies and fix evidence sync both ways automatically. \u201CSync now\u201D only reconciles; it never creates a duplicate issue.")), error && /* @__PURE__ */ React.createElement("div", { style: { margin: "6px 0", padding: "5px 8px", fontSize: 11, borderRadius: 6, background: `${theme.colorNegative}22`, color: theme.colorNegative, whiteSpace: "pre-wrap" } }, error), notice && /* @__PURE__ */ React.createElement("div", { style: { margin: "6px 0", padding: "5px 8px", fontSize: 11, borderRadius: 6, background: `${theme.colorPositive}22`, color: theme.colorPositive } }, notice), shown.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 4px", fontSize: 12, color: theme.textMutedColor } }, threads.length === 0 ? scope === "story" ? /* @__PURE__ */ React.createElement(React.Fragment, null, "No threads for this story. Press ", /* @__PURE__ */ React.createElement("b", null, "C"), " in the canvas and click an element \u2014 or ", /* @__PURE__ */ React.createElement("b", null, "R"), " to drag a region. Everything saves automatically to the dev-server store.") : /* @__PURE__ */ React.createElement(React.Fragment, null, "No threads yet. Press ", /* @__PURE__ */ React.createElement("b", null, "C"), " in the canvas and click an element.") : /* @__PURE__ */ React.createElement(React.Fragment, null, "All threads resolved \u{1F389} \u2014 switch the filter to \u201Call\u201D to see them.")), shown.map((t) => {
    const active = t.id === activeThread;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: t.id,
        style: {
          padding: "6px 6px 6px 8px",
          margin: "5px 0",
          borderRadius: 7,
          border: `1px solid ${active ? theme.colorSecondary : theme.appBorderColor}`,
          background: active ? `${theme.colorSecondary}11` : "transparent",
          cursor: "pointer",
          opacity: t.status === "open" ? 1 : 0.75
        },
        onClick: () => focusThread(t)
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: chip(t.status === "open" ? "#f59e0b22" : "#16a34a22", t.status === "open" ? "#b45309" : "#15803d") }, "#", t.number, " ", t.status === "open" ? "open" : "resolved"), t.gh?.url && /* @__PURE__ */ React.createElement(
        "a",
        {
          href: t.gh.url,
          target: "_blank",
          rel: "noreferrer",
          title: `GitHub issue #${t.gh.issue} \u2014 mirrors this thread's lifecycle (open/closed + replies)`,
          style: { ...chip(`${theme.colorSecondary}18`, theme.colorSecondary), textDecoration: "none", display: "inline-flex", gap: 3, alignItems: "center", cursor: "pointer" },
          onClick: (e) => e.stopPropagation()
        },
        /* @__PURE__ */ React.createElement(LinkIcon, { width: 10, height: 10 }),
        " ",
        t.gh.issue
      ), t.component?.name && /* @__PURE__ */ React.createElement("span", { style: chip(`${theme.colorSecondary}18`, theme.colorSecondary) }, t.component.name), snapshotIds.has(t.id) && /* @__PURE__ */ React.createElement(
        "a",
        {
          href: `${API_BASE}/threads/${encodeURIComponent(t.id)}/snapshot?format=html`,
          target: "_blank",
          rel: "noreferrer",
          title: "Plan-b evidence: story DOM captured at pin time (pinned element highlighted) \u2014 opens as a viewable page",
          style: { ...chip("#d9770618", "#b45309"), textDecoration: "none", display: "inline-flex", gap: 3, alignItems: "center", cursor: "pointer" },
          onClick: (e) => e.stopPropagation()
        },
        /* @__PURE__ */ React.createElement(CameraIcon, { width: 10, height: 10 }),
        " dom"
      ), scope === "all" && t.story.name && /* @__PURE__ */ React.createElement("span", { style: chip("#64748b18", theme.textMutedColor) }, t.story.name), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: theme.textMutedColor } }, t.createdAt.slice(0, 10))),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, marginTop: 3, color: theme.textColor, textDecoration: t.status === "open" ? "none" : "line-through" } }, t.comments[0]?.body?.split("\n")[0]?.slice(0, 140) ?? "(no text)"),
      t.component?.source && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, color: theme.textMutedColor, fontFamily: theme.fontMonospace, marginTop: 2 } }, t.component.source.file, t.component.source.line ? `:${t.component.source.line}` : ""),
      t.comments.length > 1 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, color: theme.textMutedColor, marginTop: 2 } }, "+", t.comments.length - 1, " replies"),
      /* @__PURE__ */ React.createElement(ThreadActions, { thread: t, busy, onReply: reply, onToggleResolve: toggleResolve, active })
    );
  }), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", paddingTop: 8, marginTop: 6, borderTop: `1px solid ${theme.appBorderColor}`, position: "sticky", bottom: 0, background: theme.backgroundBar ?? theme.background }
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10.5, color: theme.textMutedColor, display: "inline-flex", gap: 4, alignItems: "center" } }, /* @__PURE__ */ React.createElement(CommentIcon, { width: 11, height: 11 }), " agent digest:"),
    /* @__PURE__ */ React.createElement(MiniButton, { theme, onClick: () => doExport("md", "copy") }, "copy md"),
    /* @__PURE__ */ React.createElement(MiniButton, { theme, onClick: () => doExport("json", "copy") }, "copy json"),
    /* @__PURE__ */ React.createElement(MiniButton, { theme, onClick: () => doExport("md", "download") }, "download md"),
    /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }),
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: theme.textMutedColor, fontFamily: theme.fontMonospace } }, staticMode ? "static build \xB7 digest generated locally from this browser's store" : `curl ${API_BASE}/export?format=md`)
  ));
}
function ThreadActions(props) {
  const [body, setBody] = useState("");
  const theme = useTheme();
  if (!props.active) return /* @__PURE__ */ React.createElement(React.Fragment, null);
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 6 }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
    "input",
    {
      style: { flex: 1, padding: "3px 8px", fontSize: 12, borderRadius: 6, border: `1px solid ${theme.appBorderColor}`, background: "transparent", color: theme.textColor },
      placeholder: "reply\u2026",
      value: body,
      onChange: (e) => setBody(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter" && body.trim() && !props.busy) {
          void props.onReply(props.thread, body).then((ok) => {
            if (ok) setBody("");
          });
        }
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      style: { padding: "3px 9px", fontSize: 11, fontWeight: 600, cursor: props.busy ? "default" : "pointer", borderRadius: 6, border: `1px solid ${props.thread.status === "open" ? "#86efac" : "#fecaca"}`, background: "transparent", color: props.thread.status === "open" ? "#15803d" : "#b91c1c", display: "inline-flex", gap: 4, alignItems: "center" },
      disabled: props.busy,
      onClick: () => props.onToggleResolve(props.thread)
    },
    /* @__PURE__ */ React.createElement(CheckIcon, { width: 11, height: 11 }),
    props.thread.status === "open" ? "resolve" : "reopen"
  ));
}
function MiniButton(props) {
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      style: { padding: "2px 8px", fontSize: 10.5, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: `1px solid ${props.theme.appBorderColor}`, background: "transparent", color: props.theme.textColor },
      onClick: props.onClick
    },
    props.children
  );
}
function AnnotaKitTool() {
  const theme = useTheme();
  const [ui, setUi] = useState(null);
  useEffect(() => {
    const ch = addons.getChannel();
    const onState = (s) => {
      if (s && typeof s === "object") setUi(s);
    };
    ch.on(UI_STATE, onState);
    return () => {
      ch.removeListener(UI_STATE, onState);
    };
  }, []);
  const emit = useCallback((command) => {
    addons.getChannel().emit(UI_COMMAND, { command });
  }, []);
  const apiDown = ui?.apiOk === false;
  const armed = (on) => ({
    color: on ? theme.barSelectedColor : theme.barTextColor,
    opacity: on ? 1 : 0.75
  });
  const btn = (label, icon, on, onClick) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: label,
      title: apiDown ? "Annotakit: dev server API down \u2014 run `storybook dev`" : label,
      "aria-label": label,
      disabled: apiDown,
      style: {
        background: "transparent",
        border: "none",
        padding: 4,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        cursor: apiDown ? "default" : "pointer",
        ...armed(on)
      },
      onClick
    },
    icon
  );
  const open = ui?.open ?? 0;
  const total = ui?.total ?? 0;
  const drawerOn = ui?.drawerOpen === true;
  return /* @__PURE__ */ React.createElement("div", { key: "annotakit-tool", style: { display: "inline-flex", alignItems: "center", gap: 2 } }, btn("Pin a comment to an element (\u2325C)", /* @__PURE__ */ React.createElement(PinIcon, { width: 14, height: 14 }), ui?.mode === "pin", () => emit("pin")), btn("Mark a region (\u2325R)", /* @__PURE__ */ React.createElement(BoxIcon, { width: 14, height: 14 }), ui?.mode === "region", () => emit("region")), /* @__PURE__ */ React.createElement(
    "button",
    {
      key: "annotakit-drawer",
      title: apiDown ? "Annotakit: dev server API down \u2014 run `storybook dev`" : "Threads drawer (\u2325D)",
      "aria-label": "Annotakit threads drawer",
      disabled: apiDown,
      style: {
        background: "transparent",
        border: "none",
        padding: 4,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        cursor: apiDown ? "default" : "pointer",
        ...armed(drawerOn)
      },
      onClick: () => emit("drawer")
    },
    /* @__PURE__ */ React.createElement(CommentsIcon, { width: 14, height: 14 }),
    total > 0 && /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          background: open > 0 ? "#d97706" : "#94a3b8",
          color: "#fff",
          borderRadius: 999,
          minWidth: 16,
          height: 16,
          lineHeight: "16px",
          textAlign: "center",
          fontSize: 10,
          padding: "0 4px",
          fontWeight: 700
        }
      },
      open > 0 ? open : total
    )
  ), /* @__PURE__ */ React.createElement("span", { key: "annotakit-sep", style: { width: 1, height: 16, background: theme.appBorderColor, margin: "0 4px" } }), btn(
    ui?.visible === false ? "Show Annotakit pins (\u2325L)" : "Hide Annotakit pins (\u2325L)",
    ui?.visible === false ? /* @__PURE__ */ React.createElement(EyeCloseIcon, { width: 14, height: 14 }) : /* @__PURE__ */ React.createElement(EyeIcon, { width: 14, height: 14 }),
    ui?.visible !== false,
    () => emit("layer")
  ));
}
addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: "Annotakit",
    match: ({ viewMode }) => viewMode === "story",
    render: ({ active }) => active ? /* @__PURE__ */ React.createElement(ReviewPanel, null) : null
  });
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: "Annotakit",
    match: ({ viewMode }) => viewMode === "story",
    render: () => /* @__PURE__ */ React.createElement(AnnotaKitTool, null)
  });
});
