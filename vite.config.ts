import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync, existsSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import { getCacheName } from './src/services/buildHash';

// S-22: build a per-deploy service-worker cache name from the contents of
// index.html (the entry HTML that the SW caches). Each new deploy produces
// a different hash → new CACHE_NAME → activate handler prunes the old one
// and clients fetch the new assets on the next reload.
//
// We hash index.html (the source) rather than dist/index.html (the build
// output) because vite.config.ts runs *before* the build emits files, and
// Vite's html transform doesn't change the script tags / cache-relevant
// markup in a way that would invalidate the cache name.
function getVastuplanCacheName(): string {
  const htmlPath = path.resolve(__dirname, 'index.html');
  if (!existsSync(htmlPath)) return 'vastuplan-dev';
  return getCacheName(readFileSync(htmlPath));
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const cacheName = getVastuplanCacheName();
  return {
    // S-22: build src/services/sw.ts as a second entry → dist/sw.js. The SW
    // was previously only served by the dev server from /src/services/sw.ts
    // and silently missing in production builds. Bundling it as a separate
    // entry also lets Vite's `define` substitute __VASTUPLAN_CACHE_NAME__
    // into the SW code.
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html'),
          sw: path.resolve(__dirname, 'src/services/sw.ts'),
        },
        // Place the SW at /sw.js (top of dist) rather than /assets/sw-*.js
        // so the production registration path /sw.js resolves to it.
        output: {
          entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
        },
      },
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      __VASTUPLAN_CACHE_NAME__: JSON.stringify(cacheName),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
