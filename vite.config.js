import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// One HTML entry per page. themes.html and about.html are added in later phases.
// BASE_PATH is the folder the site is served from: "/" locally, "/thriving-streets/"
// on GitHub Pages (set by .github/workflows/deploy.yml).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
      },
    },
  },
});
