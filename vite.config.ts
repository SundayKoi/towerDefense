import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'NETRUNNER // Intrusion Defense',
        short_name: 'NETRUNNER',
        description: 'Cyberpunk roguelike tower defense.',
        theme_color: '#00fff0',
        background_color: '#05060a',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  server: { host: true, port: 5173 },
  build: { target: 'es2022', sourcemap: true },
});
