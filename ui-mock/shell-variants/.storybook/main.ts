/* Storybook 9 config (react-vite builder) — added manually so the standalone
   Vite app stays untouched (no `storybook init` scaffolding, no App edits).

   Notes:
   - addons: a11y + docs only. @storybook/addon-themes is installed as a
     devDependency but deliberately NOT wired: the app manages its own theming
     via data-attributes (tokens.css keys on [data-theme="…"]), and the themes
     addon would write its own light/dark markers on <html> — [data-theme="light"]
     is a real app variant, so that would silently re-skin stories.
   - viewport / backgrounds toolbars are built into storybook 9 core (the old
     essentials split), so they need no addon entries here.
   - staticDirs: public/ carries the mock media thumbnails (mockData builds
     thumbnail URLs from import.meta.env.BASE_URL, which is "/" under Storybook). */

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  staticDirs: ['../public'],
};

export default config;
