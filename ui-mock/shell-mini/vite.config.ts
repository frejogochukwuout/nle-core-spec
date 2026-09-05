import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base '/mini/' — own preview namespace (sibling uses /mockup/)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/mini/',
  server: { port: 5174, host: true },
  build: { target: 'es2022' },
});
