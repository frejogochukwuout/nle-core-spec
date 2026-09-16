import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// R18 port ownership (user directive): the FULL Storybook dev server owns :3000
// (the public surface — edge → Caddy :81 → localhost:3000; scripts/sb3000.py).
// The app is the localhost dev surface on :3001 (scripts/dev3000.py); base '/'
// still means "the app owns its whole origin" — on its own port.
// allowedHosts — kept so the app is public-URL-ready if a future harness maps
// a proxy to :3001: the Z.ai FC edge rewrites the request Host to ...fcapp.run
// (public URL is ...space-z.ai); Caddy passes Host through untouched, and
// Vite's default host check (localhost/IP only) 403s "Blocked request: This
// host is not allowed". Dot-prefixed entries match any subdomain.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    port: 3001,
    strictPort: true,
    host: true,
    allowedHosts: ['.space-z.ai', '.fcapp.run'],
  },
  build: { target: 'es2022' },
});
