/* Storybook 10 config (react-vite builder) — added manually so the standalone
   Vite app stays untouched (no `storybook init` scaffolding, no App edits).

   Notes:
   - v10.6 (annotakit peer requires ^10.0.0 — the whole reason for the
     major bump).
   - storybook-annotakit FIRST in addons: it registers the pin-comment review
     surface (manager panel + preview overlay + dev-server REST/WS API).
     Requires `storybook dev` — on a static build the pins show a "dev only"
     note (documented in vendor/storybook-annotakit/README.md).
   - addons: a11y + docs. @storybook/addon-themes is deliberately NOT wired:
     the app manages its own theming via data-attributes (tokens.css keys on
     [data-theme="…"]), and the themes addon would write its own light/dark
     markers on <html> — [data-theme="light"] is a real app variant, so that
     would silently re-skin stories.
   - viewport / backgrounds toolbars are built into storybook core (the old
     essentials split), so they need no addon entries here.
   - staticDirs: public/ carries the mock media thumbnails (mockData builds
     thumbnail URLs from import.meta.env.BASE_URL, which is "/" under Storybook). */

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['storybook-annotakit', '@storybook/addon-a11y', '@storybook/addon-docs'],
  staticDirs: ['../public'],
  // The review URL is served through the platform edge + Caddy; the edge
  // rewrites the Host header (observed: not the public domain, so storybook
  // 10 core-server host validation 403s it with "Invalid host"). This dev
  // server is only reachable behind the platform edge / sandbox network, so
  // allowedHosts: true (the documented "allow all" value) is the robust
  // choice — it also survives sandbox recycles where the internal hostname
  // (c-<uuid>) changes. The builder-vite framework forwards core.allowedHosts
  // into vite's server.allowedHosts (verified: node_modules
  // @storybook/builder-vite/dist/index.js) — no viteFinal needed.
  core: {
    allowedHosts: true,
  },
};

export default config;
