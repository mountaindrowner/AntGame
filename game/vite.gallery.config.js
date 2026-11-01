import { defineConfig } from 'vite';
// The model gallery, built on its own (npm run gallery): dist-gallery/.
export default defineConfig({ base: './', build: { outDir: 'dist-gallery', target: 'es2020', chunkSizeWarningLimit: 2000, rollupOptions: { input: 'gallery.html' } } });
