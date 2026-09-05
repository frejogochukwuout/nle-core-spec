import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Port 3000: dedicated app port (user-facing local preview).
// base '/' — the app owns the whole origin on its own port; the '/mini/'
// namespace was only needed when sharing a proxy origin with shell-variants.
// allowedHosts — REQUIRED for public-URL reachability: the Z.ai FC edge
// rewrites the request Host to ...fcapp.run (and the public URL is
// ...space-z.ai); Caddy :81 passes Host through untouched, and Vite's
// default host check (localhost/IP only) 403s "Blocked request: This host
// is not allowed". Dot-prefixed entries match any subdomain.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: ['.space-z.ai', '.fcapp.run'],
  },
  build: { target: 'es2022' },
});
