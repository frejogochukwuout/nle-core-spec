/**
 * storybook-annotakit — Storybook preset entry.
 *
 * The package is listed in main.ts `addons: ['storybook-annotakit']`; Storybook's
 * preset engine loads this file (CJS, like the classic addon preset pattern) and
 * calls each exported hook. The two experimental hooks are the "surgical"
 * integration points — official extension surfaces of the Storybook dev server
 * (added in SB 9.1.16, present in 10.x):
 *
 *   experimental_devServer(app, options)    → we mount /annotakit/api/* on the
 *                                             storybook dev server (polka)
 *   experimental_serverChannel(channel)     → we broadcast thread changes over
 *                                             the server WS channel to the
 *                                             manager + every preview iframe
 */

const path = require('node:path');
const fs = require('node:fs');

// Fresh-clone guard: dist/ is gitignored (built artifact), so a clean checkout
// has none of the preset's targets. Fail FAST with ONE actionable message
// instead of a cryptic "Cannot find module './dist/server.cjs'" deep inside
// Storybook's boot. We deliberately do NOT auto-spawn a build from here —
// a surprise compiler run inside a dev-server boot is worse than a clear ask.
const DIST_ENTRIES = ['dist/server.cjs', 'dist/manager.mjs', 'dist/preview.mjs'];
const missingDist = DIST_ENTRIES.filter((rel) => !fs.existsSync(path.join(__dirname, rel)));
if (missingDist.length) {
  const message = [
    '[storybook-annotakit] vendored addon is not built yet — dist/ is missing',
    `  missing: ${missingDist.join(', ')}`,
    '  Fix (one-time per fresh clone):',
    '    cd vendor/storybook-annotakit',
    '    npm install          # if node_modules is absent',
    '    npm run build        # tsup → dist/server.cjs + manager.mjs + preview.mjs',
    '  then restart storybook dev.',
  ].join('\n');
  console.error(message);
  throw new Error(message);
}

const server = () => require('./dist/server.cjs');

module.exports = {
  managerEntries: (entries = []) => [...entries, path.join(__dirname, 'dist', 'manager.mjs')],
  previewAnnotations: (entries = []) => [...entries, path.join(__dirname, 'dist', 'preview.mjs')],

  /**
   * Guarantee a single React instance: when this addon is linked from a
   * workspace (file:/link:) its own node_modules can shadow the consumer's
   * react → "Invalid hook call / reading 'useState' of null" in the preview.
   * resolve.dedupe pins react + react-dom to the project root.
   */
  viteFinal: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.dedupe = [
      ...new Set([...(config.resolve.dedupe ?? []), 'react', 'react-dom']),
    ];
    return config;
  },

  experimental_devServer: (app, options) => {
    server().devServerHook(app, options);
  },
  experimental_serverChannel: (channel, options) => {
    server().serverChannelHook(channel, options);
  },
};
