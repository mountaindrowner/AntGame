import { defineConfig } from 'vite';

// Relative base so the built game runs from any sub-path (GitHub Pages, an
// artifact, a phone on the LAN).
export default defineConfig({
  base: './',
  server: { host: true },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
