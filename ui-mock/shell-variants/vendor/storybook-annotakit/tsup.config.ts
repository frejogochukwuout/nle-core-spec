import { defineConfig } from 'tsup';

// Storybook's manager and preview runtimes provide these modules — they must
// stay external (same lesson as greenroom: bundling them breaks the manager's
// React element symbols).
const storybookProvided = [
  'react',
  'react-dom',
  '@storybook/icons',
  'react/jsx-runtime',
  'react-dom/client',
  /^storybook\/.*/,
];

export default [
  // Browser bundles: manager panel + preview overlay.
  defineConfig({
    entry: {
      manager: 'src/manager/index.tsx',
      preview: 'src/preview/index.ts',
      // standalone export so node tests can exercise the static-mode store
      // (the manager/preview bundles embed their own copy — state is
      // per-document by design; cross-doc sync rides storage events).
      staticStore: 'src/shared/staticStore.ts',
    },
    format: ['esm'],
    platform: 'browser',
    clean: false,
    external: storybookProvided,
    noExternal: ['@medv/finder'],
    outExtension: () => ({ js: '.mjs' }),
    esbuildOptions(options) {
      // Classic JSX transform: the manager renders with Storybook's own React;
      // the automatic runtime would resolve react/jsx-runtime from OUR React
      // version → mismatched element symbols → React error #31.
      options.jsx = 'transform';
    },
  }),
  // Node bundle: dev-server middleware + sqlite store + digest + gh publisher.
  defineConfig({
    entry: { server: 'src/server/routes.ts' },
    format: ['cjs'],
    platform: 'node',
    target: 'node20',
    // Local re-apply of the CR10 fix (lost in the 0.5.0 upstream swap): both
    // configs share dist/ — a `clean: true` here can wipe the ESM bundle's
    // output depending on config execution order. The package build script
    // rm -rf's dist BEFORE tsup instead (see package.json "build").
    clean: false,
    outExtension: () => ({ js: '.cjs' }),
    dts: false,
    splitting: false,
    treeshake: true,
  }),
];
