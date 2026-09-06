/* Vitest 5 — separate from vite.config.ts so the Tailwind plugin and the
   `base: '/mini/'` static-build settings never leak into tests. Same posture
   as the sibling app. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    isolate: true,
    pool: 'forks',
    testTimeout: 15000,
  },
});
