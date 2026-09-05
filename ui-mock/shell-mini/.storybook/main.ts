/* Storybook 10 config (react-vite builder). R18: storybook-annotakit v0.5 is
   wired FIRST in addons — it mounts the pin-comment review surface on the dev
   server itself (manager panel + preview overlay + /annotakit/api/* REST +
   WS live sync via the experimental_devServer / experimental_serverChannel
   preset hooks, SB >= 9.1.16). Because the full dev server owns :3000 (the
   public surface), reviewer pins work directly at the public URL —
   same-origin fetches, no proxy plumbing. On a static build the pins show a
   "dev only" note (documented in vendor/storybook-annotakit/README.md).
   v0.5 store: <git-common-dir>/annotakit/threads.db (branch-switch-proof),
   durable via an orphan `annotakit` branch pushed to GitHub (token in .env —
   never committed). dist/ IS tracked in the vendor dir (kit v0.5 dogfood #6:
   file:-installs boot without building; `npm run vendor:build` to rebuild).
   Addons: a11y + docs; viewport/backgrounds are core. */

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  addons: [
    'storybook-annotakit',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  staticDirs: [],
  core: {
    allowedHosts: true, // preview edge rewrites the Host header (sibling-verified)
  },
};

export default config;
