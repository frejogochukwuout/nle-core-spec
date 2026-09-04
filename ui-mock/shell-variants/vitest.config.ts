/* Vitest 5 — separate from vite.config.ts so the Tailwind plugin and the
   `base: '/mockup/'` static-build settings never leak into tests. esbuild
   transforms .tsx with the tsconfig `jsx: react-jsx` setting; CSS imports are
   stubbed (only main.tsx imports css and no test mounts main.tsx). */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // module-level singletons (zustand store) + jsdom: keep isolation file-level
    isolate: true,
    pool: 'forks',
    // JKL tap-accel and toast timings rely on fake timers per-test, not here.
    testTimeout: 15000,
  },
});
