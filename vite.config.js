import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// One HTML entry per page.
// BASE_PATH is the folder the site is served from: "/" locally and on its subdomain
// (set by .github/workflows/deploy.yml). Change it only if the site moves into a sub-folder.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        themes: resolve(import.meta.dirname, 'themes.html'),
        about: resolve(import.meta.dirname, 'about.html'),
      },
    },
  },
});
