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

const server = () => require('./dist/server.cjs');

/* dogfood #11: the experimental hooks below (experimental_devServer /
 * experimental_serverChannel) do not exist before Storybook 9.1.16. On SB 8.x
 * this preset would load fine and then silently do NOTHING — no API, no panel,
 * no error. Fail loudly at config-load time instead, naming the reason. */
function sbVersion() {
  // resolve the CONSUMER's storybook (peer dep): hoisted installs resolve
  // from the addon dir; pnpm/monorepo layouts may only resolve from cwd.
  for (const base of [__dirname, process.cwd(), path.resolve(process.cwd(), '..')]) {
    try {
      return require(path.join(base, 'node_modules', 'storybook', 'package.json')).version;
    } catch {
      /* try next */
    }
  }
  return null;
}

function checkSbVersion() {
  const v = sbVersion();
  if (!v) return; // unresolvable — let the hooks decide; the manager still loads
  const parts = v.split('.').map((n) => parseInt(n, 10));
  const maj = parts[0] || 0;
  const min = parts[1] || 0;
  const patch = parts[2] || 0;
  const ok = maj > 9 || (maj === 9 && (min > 1 || (min === 1 && patch >= 16)));
  if (!ok) {
    throw new Error(
      `[storybook-annotakit] requires Storybook >= 9.1.16 (found ${v}): the experimental_devServer + experimental_serverChannel hooks it mounts on do not exist in this version, so the addon would silently do nothing (no API, no panel). Upgrade Storybook (10.x recommended), or remove "storybook-annotakit" from addons in main.ts.`,
    );
  }
}
checkSbVersion();

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
