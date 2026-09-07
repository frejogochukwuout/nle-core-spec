import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base '/mockup/' so the static build can be served from the platform
// preview app's public/ dir (and still be previewed standalone via `vite preview`)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/mockup/',
  server: { port: 5173, host: true },
  build: { target: 'es2022' },
});
