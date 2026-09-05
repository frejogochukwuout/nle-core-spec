/* Storybook 10 config (react-vite builder) — mirrors the sibling app's
   posture minus annotakit (D2 deviation: the vendored pin-comment review
   addon is shell-variants-specific; wiring it later = vendored dir + 3
   lines here). Addons: a11y + docs; viewport/backgrounds are core. */

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  staticDirs: [],
  core: {
    allowedHosts: true, // preview edge rewrites the Host header (sibling-verified)
  },
};

export default config;
