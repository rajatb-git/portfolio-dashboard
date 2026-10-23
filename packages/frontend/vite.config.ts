import react from '@vitejs/plugin-react';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const require = createRequire(import.meta.url);
const { version } = require('./package.json');
// The root CHANGELOG.md is the source. Docker builds this package with context
// ./packages/frontend (see docker-compose.yml), where the root is out of reach,
// so it falls back to the synced copy next to this file.
const rootChangelog = path.resolve(__dirname, '../../CHANGELOG.md');
const changelog = fs.readFileSync(
  fs.existsSync(rootChangelog) ? rootChangelog : path.resolve(__dirname, 'CHANGELOG.md'),
  'utf8'
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'images/logo-192.png', 'images/logo-512.png'],
      manifest: {
        name: 'Portfolio Dashboard',
        short_name: 'Portfolio',
        description: 'Track your stock portfolio, holdings, and market research',
        theme_color: '#3b82f6',
        background_color: '#060c18',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'images/logo-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'images/logo-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'images/logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/fonts\/.*\.(?:ttf|woff|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __CHANGELOG__: JSON.stringify(changelog),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
});
