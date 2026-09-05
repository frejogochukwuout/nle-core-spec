import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Port 3000: dedicated app port (user-facing local preview).
// base '/' — the app owns the whole origin on its own port; the '/mini/'
// namespace was only needed when sharing a proxy origin with shell-variants.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: { port: 3000, strictPort: true, host: true },
  build: { target: 'es2022' },
});
